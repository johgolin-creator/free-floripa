// Support contact used for coin top-ups. Coins are no longer bought inside
// the app: the user talks to support on WhatsApp, pays, and the support
// team credits the wallet from the admin console.

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
