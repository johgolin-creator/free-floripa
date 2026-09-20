// Valor em reais por extenso, para o recibo de pagamento:
// 180 -> "cento e oitenta reais"; 1250.5 -> "mil duzentos e cinquenta reais e cinquenta centavos".
// Vale de R$ 0,01 até R$ 999.999.999,99.

const UNITS = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove"
];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 1..999 */
function underThousand(n: number): string {
  if (n === 100) return "cem";
  if (n < 20) return UNITS[n];
  if (n < 100) {
    const unit = n % 10;
    return TENS[Math.floor(n / 10)] + (unit ? ` e ${UNITS[unit]}` : "");
  }
  const rest = n % 100;
  return HUNDREDS[Math.floor(n / 100)] + (rest ? ` e ${underThousand(rest)}` : "");
}

/** Junta as partes de um número: "e" só quando o resto é menor que 100 ou centena redonda. */
function joinRest(rest: number): string {
  return rest < 100 || rest % 100 === 0 ? " e " : " ";
}

/** 1..999.999 */
function underMillion(n: number): string {
  if (n < 1000) return underThousand(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands === 1 ? "mil" : `${underThousand(thousands)} mil`;
  return rest ? head + joinRest(rest) + underThousand(rest) : head;
}

/** 1..999.999.999 */
function words(n: number): string {
  if (n < 1_000_000) return underMillion(n);
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  const head = millions === 1 ? "um milhão" : `${underThousand(millions)} milhões`;
  if (!rest) return head;
  // "um milhão e duzentos mil", "um milhão e cem", "um milhão trezentos e vinte mil"
  const roundRest = rest < 100 || (rest < 1000 && rest % 100 === 0) || (rest >= 1000 && rest % 1000 === 0 && (rest / 1000 < 100 || (rest / 1000) % 100 === 0));
  return head + (roundRest ? " e " : " ") + underMillion(rest);
}

export function valorPorExtenso(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "zero reais";
  // Em centavos inteiros: evita 0.1 + 0.2 = 0.30000000000000004.
  const totalCents = Math.min(99_999_999_999, Math.round(value * 100));
  if (totalCents === 0) return "zero reais";

  const reais = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  const parts: string[] = [];
  if (reais > 0) {
    if (reais === 1) parts.push("um real");
    else parts.push(`${words(reais)}${reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de" : ""} reais`);
  }
  if (cents > 0) parts.push(cents === 1 ? "um centavo" : `${underThousand(cents)} centavos`);
  return parts.join(" e ");
}
