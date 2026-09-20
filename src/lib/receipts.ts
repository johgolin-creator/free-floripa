import { formatCurrency, formatDate } from "./format";
import type { PaymentMethod } from "./types";
import { formatCPF } from "./validation";
import { valorPorExtenso } from "./valorPorExtenso";

export type ReceiptKind = "recibo" | "comprovante";

/** Quem vai receber o recibo e os dados do turno (vêm da vaga ou da escala). */
export interface ReceiptPerson {
  key: string;
  name: string;
  functionName: string;
  eventTitle: string;
  date: string;
  startsAt: string;
  endsAt: string;
  place: string;
  /** Valor da diária em reais. 0 = a empresa preenche. */
  value: number;
  method: PaymentMethod;
  cpf: string;
}

/** O que a empresa preenche por profissional antes de imprimir. */
export interface ReceiptFields {
  cpf: string;
  /** Texto digitado ("180", "180,50"). */
  value: string;
  method: PaymentMethod;
  /** AAAA-MM-DD */
  payDate: string;
}

export interface ReceiptDoc {
  kind: ReceiptKind;
  person: ReceiptPerson;
  cpf: string;
  value: number;
  method: PaymentMethod;
  payDate: string;
}

export interface ReceiptCompany {
  name: string;
  documentLabel: "CNPJ" | "CPF" | "";
  document: string;
  responsible: string;
}

/** "180", "180,50", "1.250,00", "R$ 1.250,5", "180.5" -> número. Inválido = 0. */
export function parseMoney(text: string): number {
  const cleaned = (text || "").replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

// --- Rascunho no navegador ---------------------------------------------------
// O CPF que a empresa digita fica só neste navegador (não vai para o servidor),
// para não precisar digitar de novo na próxima impressão.

const DRAFTS_KEY = "pont:receipt-drafts:v1";

type DraftMap = Record<string, Partial<ReceiptFields>>;

export function loadReceiptDrafts(): DraftMap {
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

export function saveReceiptDraft(key: string, fields: ReceiptFields) {
  try {
    const drafts = loadReceiptDrafts();
    drafts[key] = fields;
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Sem armazenamento local (aba anônima): só não lembra dos dados na próxima vez.
  }
}

// --- Texto livre da empresa ----------------------------------------------------

/** "append": entra depois do texto padrão. "replace": no lugar do texto padrão. */
export type ReceiptTextMode = "append" | "replace";

export interface ReceiptCustomText {
  text: string;
  mode: ReceiptTextMode;
}

export const MAX_CUSTOM_TEXT = 1500;

/** Marcadores que a empresa pode usar no texto; cada recibo preenche os seus. */
export const TEMPLATE_TOKENS: Array<{ token: string; label: string }> = [
  { token: "{nome}", label: "nome do profissional" },
  { token: "{cpf}", label: "CPF" },
  { token: "{valor}", label: "valor (R$)" },
  { token: "{extenso}", label: "valor por extenso" },
  { token: "{funcao}", label: "função" },
  { token: "{data}", label: "data do turno" },
  { token: "{horario}", label: "horário" },
  { token: "{evento}", label: "evento" },
  { token: "{local}", label: "local" },
  { token: "{forma}", label: "forma de pagamento" },
  { token: "{pagamento}", label: "data do pagamento" },
  { token: "{empresa}", label: "empresa" },
  { token: "{documento}", label: "CNPJ/CPF da empresa" }
];

const BLANK = "________________";

/** Troca os marcadores ({nome}, {valor}...) pelos dados do recibo. Marcador
 *  desconhecido fica como foi digitado; dado que falta vira uma linha em branco. */
export function fillTemplate(text: string, doc: ReceiptDoc, company: ReceiptCompany): string {
  const { person } = doc;
  const cpf = formatCPF(doc.cpf);
  const values: Record<string, string> = {
    nome: person.name,
    cpf: cpf || BLANK,
    valor: doc.value > 0 ? formatCurrency(doc.value) : "R$ ______________",
    extenso: doc.value > 0 ? valorPorExtenso(doc.value) : BLANK,
    funcao: person.functionName,
    data: person.date ? formatDate(person.date) : BLANK,
    horario: `${person.startsAt} às ${person.endsAt}`,
    evento: person.eventTitle,
    local: person.place || BLANK,
    forma: doc.method === "A combinar" ? BLANK : doc.method,
    pagamento: doc.payDate ? formatDate(doc.payDate) : BLANK,
    empresa: company.name,
    documento: company.document ? `${company.documentLabel} ${company.document}` : BLANK
  };
  return text.replace(/\{([a-zA-Zçã]+)\}/g, (whole, key: string) => {
    const normalized = key.toLowerCase().replace("ç", "c").replace("ã", "a");
    return normalized in values ? values[normalized] : whole;
  });
}

const TEXT_KEY = "pont:receipt-text:v1";

export function loadReceiptCustomText(): ReceiptCustomText {
  try {
    const raw = window.localStorage.getItem(TEXT_KEY);
    if (!raw) return { text: "", mode: "append" };
    const parsed = JSON.parse(raw) as Partial<ReceiptCustomText>;
    return {
      text: typeof parsed.text === "string" ? parsed.text.slice(0, MAX_CUSTOM_TEXT) : "",
      mode: parsed.mode === "replace" ? "replace" : "append"
    };
  } catch {
    return { text: "", mode: "append" };
  }
}

export function saveReceiptCustomText(value: ReceiptCustomText) {
  try {
    window.localStorage.setItem(TEXT_KEY, JSON.stringify(value));
  } catch {
    // Sem armazenamento local (aba anônima): só não lembra do texto na próxima vez.
  }
}
