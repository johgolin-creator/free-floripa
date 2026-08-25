import type { CompanyLead, CompanyLeadSegment } from "./types";

interface SegmentTag {
  key: string;
  value: string;
}

interface SegmentDefinition {
  value: CompanyLeadSegment;
  label: string;
  tags: SegmentTag[];
}

export const COMPANY_LEAD_SEGMENTS: SegmentDefinition[] = [
  { value: "Restaurantes", label: "Restaurantes", tags: [{ key: "amenity", value: "restaurant" }] },
  { value: "Baladas", label: "Baladas e casas noturnas", tags: [{ key: "amenity", value: "nightclub" }] },
  {
    value: "Hotéis",
    label: "Hotéis e pousadas",
    tags: [
      { key: "tourism", value: "hotel" },
      { key: "tourism", value: "guest_house" }
    ]
  },
  { value: "Mercados", label: "Mercados e supermercados", tags: [{ key: "shop", value: "supermarket" }] },
  { value: "Atacados", label: "Atacados", tags: [{ key: "shop", value: "wholesale" }] }
];

type Bbox = [south: number, west: number, north: number, east: number];

// Nominatim (the free geocoding service that would turn an arbitrary city
// name into coordinates) doesn't allow direct calls from a browser - it has
// no CORS headers, so it only works from a server. Rather than depending on
// a server we don't have for this, cities are a fixed list with bounding
// boxes looked up once, covering the Grande Florianópolis area this app
// actually serves.
export const CITY_OPTIONS: { label: string; bbox: Bbox }[] = [
  { label: "Florianópolis, SC", bbox: [-27.85, -48.62, -27.35, -48.35] },
  { label: "Palhoça, SC", bbox: [-27.917059, -48.7485245, -27.6066727, -48.5731101] },
  { label: "São José, SC", bbox: [-27.661, -48.746, -27.517, -48.568] },
  { label: "Santo Amaro da Imperatriz, SC", bbox: [-27.875, -48.913, -27.6136156, -48.6749356] },
  { label: "Biguaçu, SC", bbox: [-27.544, -48.8351739, -27.32, -48.574] }
];

export const DEFAULT_CITY = CITY_OPTIONS[0].label;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
}

function buildOverpassQuery(tags: SegmentTag[], bbox: Bbox) {
  const bboxStr = bbox.join(",");
  const filters = tags
    .map(({ key, value }) => `node["${key}"="${value}"](${bboxStr});\nway["${key}"="${value}"](${bboxStr});`)
    .join("\n");

  return `[out:json][timeout:25];\n(\n${filters}\n);\nout center tags;`;
}

function toCompanyLead(element: OverpassElement, segment: CompanyLeadSegment, city: string): CompanyLead | null {
  const tags = element.tags ?? {};
  const name = tags.name;
  if (!name) return null;

  const phone = tags.phone || tags["contact:phone"] || undefined;
  const email = tags.email || tags["contact:email"] || undefined;
  const website = tags.website || tags["contact:website"] || undefined;
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
    address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
    city,
    contacted: false,
    foundAt: new Date().toISOString()
  };
}

export async function searchCompanyLeads({
  segment,
  city
}: {
  segment: CompanyLeadSegment;
  city: string;
}): Promise<CompanyLead[]> {
  const segmentDefinition = COMPANY_LEAD_SEGMENTS.find((item) => item.value === segment);
  if (!segmentDefinition) return [];

  const cityOption = CITY_OPTIONS.find((item) => item.label === city) ?? CITY_OPTIONS[0];
  const query = buildOverpassQuery(segmentDefinition.tags, cityOption.bbox);

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  });

  if (!response.ok) {
    throw new Error("Não foi possível buscar empresas agora. Tente novamente em alguns minutos.");
  }

  const data = (await response.json()) as { elements?: OverpassElement[] };
  const elements = Array.isArray(data.elements) ? data.elements : [];

  return elements
    .map((element) => toCompanyLead(element, segment, cityOption.label))
    .filter((lead): lead is CompanyLead => Boolean(lead));
}
