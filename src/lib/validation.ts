// Shared input validation for signup and profile forms. No dependencies:
// everything here is plain string/number work so it runs the same in the
// browser and in tests.

export function onlyDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

/** Rejects "aaaa", "111", keyboard mashing and other single-token garbage. */
function hasRepeatedRun(value: string, run = 3): boolean {
  const normalized = value.toLowerCase();
  let streak = 1;
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i] === normalized[i - 1] && normalized[i] !== " ") {
      streak += 1;
      if (streak >= run) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

const NAME_PART = /^[A-Za-zÀ-ÖØ-öø-ÿ]([A-Za-zÀ-ÖØ-öø-ÿ'-]*[A-Za-zÀ-ÖØ-öø-ÿ])?$/;

/**
 * A real person's name: at least two words (nome e sobrenome), each with two
 * or more letters, only letters plus internal hyphen/apostrophe, and no
 * "aaaa"-style runs.
 */
export function isPlausibleFullName(value: string): boolean {
  const trimmed = (value || "").trim().replace(/\s+/g, " ");
  if (trimmed.length < 4 || trimmed.length > 80) return false;
  if (hasRepeatedRun(trimmed)) return false;

  const parts = trimmed.split(" ");
  if (parts.length < 2) return false;
  return parts.every((part) => part.length >= 2 && NAME_PART.test(part));
}

/** Free text that must actually say something (experiência, descrição, endereço). */
export function isMeaningfulText(
  value: string,
  { minLen = 12, minWords = 3 }: { minLen?: number; minWords?: number } = {}
): boolean {
  const trimmed = (value || "").trim().replace(/\s+/g, " ");
  if (trimmed.length < minLen) return false;
  if (hasRepeatedRun(trimmed, 4)) return false;

  const words = trimmed.split(" ").filter((word) => word.length >= 2);
  if (words.length < minWords) return false;

  // Reject "abc abc abc" and a single word repeated to hit the count.
  const distinct = new Set(words.map((word) => word.toLowerCase()));
  return distinct.size >= Math.min(minWords, words.length) - 0 && distinct.size >= 2;
}

function isAllSameDigit(digits: string): boolean {
  return digits.length > 0 && /^(\d)\1+$/.test(digits);
}

export function isValidCPF(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || isAllSameDigit(digits)) return false;

  const calcCheck = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calcCheck(9) === Number(digits[9]) && calcCheck(10) === Number(digits[10]);
}

export function isValidCNPJ(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || isAllSameDigit(digits)) return false;

  const calcCheck = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calcCheck(12) === Number(digits[12]) && calcCheck(13) === Number(digits[13]);
}

// Every Brazilian area code currently in use.
const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

/** Brazilian mobile: DDD + 9 + 8 digits, valid area code, not a repeated run. */
export function isValidBrMobile(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (!VALID_DDD.has(Number(digits.slice(0, 2)))) return false;
  if (digits[2] !== "9") return false;
  if (isAllSameDigit(digits.slice(2))) return false;
  return true;
}

/** "+55DDNNNNNNNNN" for Supabase phone auth. Assumes isValidBrMobile passed. */
export function toPhoneE164(value: string): string {
  return `+55${onlyDigits(value)}`;
}

export function isAdult(birthDate: string): boolean {
  if (!birthDate) return false;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getFullYear() < 1900) return false;

  const now = new Date();
  if (date > now) return false;

  const eighteen = new Date(date.getFullYear() + 18, date.getMonth(), date.getDate());
  return eighteen <= now;
}

export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function isValidEmail(value: string): boolean {
  const trimmed = (value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 254;
}

// --- Masks (progressive: format only what has been typed so far) ---

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function formatBrPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1");
  if (d.length <= 7) return d.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}
