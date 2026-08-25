// Scheduled bot that searches OpenStreetMap for potential PONT clients
// (restaurants, nightclubs, hotels, supermarkets, wholesalers) around
// Florianópolis and saves them into public.company_leads.
//
// Deployed and scheduled entirely from the Supabase Dashboard:
//   1. Paste this file into Edge Functions > Deploy a new function
//      (name it "company-prospecting-bot") and turn OFF "Enforce JWT
//      Verification" for it, since pg_cron calls it with a shared secret
//      header instead of a Supabase session.
//   2. Add a secret named CRON_SECRET (Edge Functions > Secrets) with any
//      random value, matching the one used in the cron schedule below.
//   3. Enable the pg_cron and pg_net extensions (Database > Extensions).
//   4. Run the cron.schedule(...) snippet from supabase/README.md in the
//      SQL Editor, using this function's URL and the same CRON_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SegmentTag {
  key: string;
  value: string;
}

const SEGMENTS: { segment: string; tags: SegmentTag[] }[] = [
  { segment: "Restaurantes", tags: [{ key: "amenity", value: "restaurant" }] },
  { segment: "Baladas", tags: [{ key: "amenity", value: "nightclub" }] },
  {
    segment: "Hotéis",
    tags: [
      { key: "tourism", value: "hotel" },
      { key: "tourism", value: "guest_house" }
    ]
  },
  { segment: "Mercados", tags: [{ key: "shop", value: "supermarket" }] },
  { segment: "Atacados", tags: [{ key: "shop", value: "wholesale" }] }
];

const CITY = "Florianópolis, SC, Brasil";
// south, west, north, east
const BBOX = [-27.85, -48.62, -27.35, -48.35];

function buildOverpassQuery(tags: SegmentTag[]) {
  const bboxStr = BBOX.join(",");
  const filters = tags
    .map(({ key, value }) => `node["${key}"="${value}"](${bboxStr});\nway["${key}"="${value}"](${bboxStr});`)
    .join("\n");

  return `[out:json][timeout:25];\n(\n${filters}\n);\nout center tags;`;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
}

function toLeadRow(element: OverpassElement, segment: string) {
  const tags = element.tags ?? {};
  const name = tags.name;
  if (!name) return null;

  const phone = tags.phone || tags["contact:phone"] || null;
  const email = tags.email || tags["contact:email"] || null;
  const website = tags.website || tags["contact:website"] || null;
  const addressParts = [tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"] || tags["addr:city"]].filter(
    Boolean
  );

  return {
    id: `${element.type}/${element.id}`,
    name,
    segment,
    phone,
    email,
    website,
    address: addressParts.length > 0 ? addressParts.join(", ") : null,
    city: CITY,
    found_at: new Date().toISOString()
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret && req.headers.get("x-cron-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let totalFound = 0;
  let totalErrors = 0;

  for (const { segment, tags } of SEGMENTS) {
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: buildOverpassQuery(tags)
      });

      if (!response.ok) {
        totalErrors += 1;
        continue;
      }

      const data = (await response.json()) as { elements?: OverpassElement[] };
      const elements = Array.isArray(data.elements) ? data.elements : [];
      const rows = elements.map((element) => toLeadRow(element, segment)).filter((row) => row !== null);

      if (rows.length > 0) {
        // contacted is intentionally left out of the payload, so upsert
        // never overwrites an admin's existing "contacted" mark.
        const { error } = await supabase.from("company_leads").upsert(rows, { onConflict: "id" });
        if (error) {
          totalErrors += 1;
        } else {
          totalFound += rows.length;
        }
      }
    } catch {
      totalErrors += 1;
    }

    await sleep(2000);
  }

  return new Response(JSON.stringify({ ok: true, totalFound, totalErrors }), {
    headers: { "Content-Type": "application/json" }
  });
});
