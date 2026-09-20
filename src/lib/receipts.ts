import type { PaymentMethod } from "./types";

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
