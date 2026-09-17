import { neighborhoods } from "../data/demoData";
import type { JobFunction, PaymentMethod } from "./types";
import { onlyDigits } from "./validation";

// Transforma o texto de um post de grupo do Facebook (colado à mão por um
// admin) numa vaga pronta pra revisar e publicar. Deliberadamente NÃO busca
// nada sozinho no Facebook — só organiza um texto que uma pessoa já leu e
// colou (mesma decisão de lib/facebookLeadParsing.ts: risco de banimento da
// conta e de LGPD numa coleta automatizada).
//
// É heurístico por natureza (regex/palavra-chave num texto de post informal),
// então todo campo parseado continua editável na tela antes de publicar.

const PHONE_PATTERN = /(?:\+?55\s?)?\(?0?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const FUNCTION_KEYWORDS: Array<[JobFunction, string[]]> = [
  ["Bartender", ["bartender", "barman", "barwoman"]],
  ["Segurança", ["seguranca", "segurancas", "vigilante"]],
  ["Auxiliar de cozinha", ["auxiliar de cozinha", "ajudante de cozinha", "cumim", "cumins"]],
  ["Copeiro", ["copeiro", "copeira"]],
  ["Recepcionista", ["recepcionista", "recepcao"]],
  ["Operador de caixa", ["operador de caixa", "operadora de caixa", "caixa"]],
  ["Limpeza", ["limpeza", "faxina", "faxineira", "diarista", "zeladora"]],
  ["Camareira", ["camareira", "arrumadeira"]],
  ["Montador de eventos", ["montador de eventos", "montador", "montagem de evento", "desmontagem"]],
  ["Promotor", ["promotor", "promotora", "divulgador", "panfletagem"]],
  ["Repositor", ["repositor", "repositora", "reposicao"]],
  // Garçom por último: "garçonete"/"garçom" costuma aparecer dentro de
  // frases que também citam outras funções acima com mais especificidade.
  ["Garçom", ["garcom", "garcons", "garconete", "garconetes"]]
];

const WEEKDAYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export interface ParsedFacebookJob {
  title: string;
  function: JobFunction | null;
  quantity: number;
  date: string;
  startsAt: string;
  endsAt: string;
  dailyValue: number | null;
  paymentMethod: PaymentMethod;
  neighborhood: string;
  approximateAddress: string;
  description: string;
  urgent: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function extractFunction(normalizedText: string): JobFunction | null {
  for (const [jobFunction, keywords] of FUNCTION_KEYWORDS) {
    if (keywords.some((keyword) => normalizedText.includes(keyword))) {
      return jobFunction;
    }
  }
  return null;
}

const FUNCTION_PLURAL_KEYWORDS = FUNCTION_KEYWORDS.flatMap(([, keywords]) => keywords).join("|");

function extractQuantity(normalizedText: string): number {
  const genericMatch = normalizedText.match(/(?:precis\w*\s+de\s+|contrat\w*\s*)?(\d{1,2})\s*(?:vagas?|pessoas?|profissionais?)/);
  if (genericMatch) {
    const value = Number(genericMatch[1]);
    if (value > 0 && value <= 50) return value;
  }
  const functionMatch = normalizedText.match(new RegExp(`(\\d{1,2})\\s*(?:${FUNCTION_PLURAL_KEYWORDS})`));
  if (functionMatch) {
    const value = Number(functionMatch[1]);
    if (value > 0 && value <= 50) return value;
  }
  return 1;
}

function extractDailyValue(text: string): number | null {
  const match = text.match(/r\$\s*([\d.,]+)|([\d.,]+)\s*(?:reais|de\s*di[aá]ria)/i);
  if (!match) return null;
  const raw = (match[1] ?? match[2] ?? "").trim();
  if (!raw) return null;
  const normalizedNumber = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalizedNumber);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function nextDateForWeekday(weekdayIndex: number): string {
  const now = new Date();
  const diff = (weekdayIndex - now.getDay() + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + diff);
  return toISODate(target);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowISODate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toISODate(date);
}

function extractDate(normalizedText: string): string {
  const explicit = normalizedText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]);
    const now = new Date();
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const candidate = new Date(year, month - 1, day);
    if (!Number.isNaN(candidate.getTime())) {
      if (!explicit[3] && candidate < now) candidate.setFullYear(year + 1);
      return toISODate(candidate);
    }
  }
  if (normalizedText.includes("hoje")) return toISODate(new Date());
  if (normalizedText.includes("amanha")) return tomorrowISODate();
  const weekdayIndex = WEEKDAYS.findIndex((day) => normalizedText.includes(day));
  if (weekdayIndex >= 0) return nextDateForWeekday(weekdayIndex);
  return tomorrowISODate();
}

// Exige o "h" literal (19h, 19h30) em vez de só dígitos soltos - senão casa
// com pedaços de telefone/endereço no meio do texto (ex.: "3234-5678").
function extractTimes(normalizedText: string): { startsAt: string; endsAt: string } {
  const range = normalizedText.match(/(\d{1,2})h(\d{2})?\s*(?:as|-|ate)\s*(\d{1,2})h(\d{2})?/);
  if (range) {
    const startsAt = `${range[1].padStart(2, "0")}:${range[2] ?? "00"}`;
    const endsAt = `${range[3].padStart(2, "0")}:${range[4] ?? "00"}`;
    return { startsAt, endsAt };
  }
  const single = normalizedText.match(/(?:a partir d?as?|das)\s*(\d{1,2})h(\d{2})?/);
  if (single) {
    return { startsAt: `${single[1].padStart(2, "0")}:${single[2] ?? "00"}`, endsAt: "23:59" };
  }
  return { startsAt: "18:00", endsAt: "23:59" };
}

function extractNeighborhood(normalizedText: string): string {
  return neighborhoods.find((neighborhood) => normalizedText.includes(normalize(neighborhood))) ?? "";
}

function extractAddress(rawText: string, neighborhood: string): string {
  const line = rawText
    .split("\n")
    .map((item) => item.trim())
    .find((item) => /^(rua|av\.?|avenida|travessa|rodovia)\s/i.test(item));
  if (line) return line.length > 120 ? `${line.slice(0, 120)}…` : line;
  return neighborhood || "Endereço a combinar com quem publicou o anúncio";
}

function extractPhone(text: string): string | undefined {
  const matches = text.match(PHONE_PATTERN);
  if (!matches) return undefined;
  const digits = matches.map(onlyDigits).find((value) => value.length >= 10 && value.length <= 13);
  return digits;
}

function extractContactName(text: string): string | undefined {
  const match = text.match(/(?:falar com|contato:?|chamar)\s+([A-ZÀ-Ý][\wà-ÿ]+(?:\s+[A-ZÀ-Ý][\wà-ÿ]+)?)/i);
  return match?.[1];
}

function buildTitle(rawText: string, jobFunction: JobFunction | null, neighborhood: string): string {
  if (jobFunction) return neighborhood ? `${jobFunction} em ${neighborhood}` : jobFunction;
  const firstLine = rawText
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Vaga do Facebook";
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
}

function cleanDescription(rawText: string, phone?: string, email?: string): string {
  let cleaned = rawText;
  if (phone) cleaned = cleaned.replace(PHONE_PATTERN, "");
  if (email) cleaned = cleaned.replace(EMAIL_PATTERN, "");
  return cleaned
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function parseFacebookJobPost(rawText: string): ParsedFacebookJob {
  const phone = extractPhone(rawText);
  const email = rawText.match(EMAIL_PATTERN)?.[0];
  // Tira telefone/e-mail antes de qualquer outra extração: dígitos de
  // telefone podem, por coincidência, casar com os regex de horário/data/
  // quantidade (ex.: um DDD+número parecendo "19h30").
  const withoutContact = rawText.replace(PHONE_PATTERN, " ").replace(EMAIL_PATTERN, " ");
  const normalized = normalize(withoutContact);
  const jobFunction = extractFunction(normalized);
  const neighborhood = extractNeighborhood(normalized);
  const { startsAt, endsAt } = extractTimes(normalized);

  return {
    title: buildTitle(rawText, jobFunction, neighborhood),
    function: jobFunction,
    quantity: extractQuantity(normalized),
    date: extractDate(normalized),
    startsAt,
    endsAt,
    dailyValue: extractDailyValue(withoutContact),
    paymentMethod: "A combinar",
    neighborhood,
    approximateAddress: extractAddress(rawText, neighborhood),
    description: cleanDescription(rawText, phone, email),
    urgent: normalized.includes("urgente"),
    contactName: extractContactName(rawText),
    contactPhone: phone,
    contactEmail: email
  };
}
