// Contato do suporte (botão de ajuda): WhatsApp quando configurado, senão e-mail.

const rawWhatsapp = String(import.meta.env.VITE_SUPPORT_WHATSAPP || "");

/** Digits only, in international format (e.g. "5548999998888"). Empty if unset. */
export const SUPPORT_WHATSAPP = rawWhatsapp.replace(/\D+/g, "");

export const SUPPORT_EMAIL = "contato@usepont.com.br";

export function supportWhatsappUrl(message: string): string {
  if (!SUPPORT_WHATSAPP) return "";
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export function supportEmailUrl(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
