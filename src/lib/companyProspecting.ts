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

export const DEFAULT_CITY = "Florianópolis, SC, Brasil";
const DEFAULT_BBOX: [number, number, number, number] = [-27.85, -48.62, -27.35, -48.35];

type Bbox = [south: number, west: number, north: number, east: number];

async function geocodeCity(city: string): Promise<Bbox | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const results = (await response.json()) as Array<{ boundingbox?: string[] }>;
  const boundingBox = results[0]?.boundingbox;
  if (!boundingBox || boundingBox.length < 4) return null;

  const [south, north, west, east] = boundingBox.map(Number);
  if ([south, north, west, east].some((value) => Number.isNaN(value))) return null;

  return [south, west, north, east];
}

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

  const trimmedCity = city.trim() || DEFAULT_CITY;
  const bbox = trimmedCity === DEFAULT_CITY ? DEFAULT_BBOX : (await geocodeCity(trimmedCity)) ?? DEFAULT_BBOX;
  const query = buildOverpassQuery(segmentDefinition.tags, bbox);

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
    .map((element) => toCompanyLead(element, segment, trimmedCity))
    .filter((lead): lead is CompanyLead => Boolean(lead));
}
