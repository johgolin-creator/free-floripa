import { neighborhoods } from "../data/demoData";
import { onlyDigits } from "./validation";

// Extrai o que dá de um post de grupo colado à mão (telefone, e-mail, bairro
// e um título sugerido) para poupar o admin de digitar tudo nos campos.
// Deliberadamente NÃO busca nada sozinho: o texto sempre chega colado por uma
// pessoa que já estava lendo o Facebook normalmente - ver a conversa que
// decidiu isso (risco de banimento da conta e de LGPD numa coleta
// automatizada).

const PHONE_PATTERN = /(?:\+?55\s?)?\(?0?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export interface ParsedFacebookPost {
  title: string;
  phone?: string;
  email?: string;
  city?: string;
}

function extractPhone(text: string): string | undefined {
  const matches = text.match(PHONE_PATTERN);
  if (!matches) return undefined;
  const digits = matches.map(onlyDigits).find((value) => value.length >= 10 && value.length <= 13);
  return digits;
}

function extractCity(text: string): string | undefined {
  const normalized = text.toLowerCase();
  return neighborhoods.find((neighborhood) => normalized.includes(neighborhood.toLowerCase()));
}

function extractTitle(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Vaga do Facebook";
  return firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
}

export function parseFacebookPost(rawText: string): ParsedFacebookPost {
  const email = rawText.match(EMAIL_PATTERN)?.[0];
  return {
    title: extractTitle(rawText),
    phone: extractPhone(rawText),
    email,
    city: extractCity(rawText)
  };
}
