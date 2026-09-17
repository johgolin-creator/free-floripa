export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

/**
 * "YYYY-MM-DD" de hoje no fuso do dispositivo. new Date().toISOString()
 * sempre devolve UTC — à noite no Brasil (fuso atrás de UTC) isso já aponta
 * pro dia seguinte, fazendo vagas e turnos "de hoje" sumirem dos filtros de
 * "hoje" horas antes da meia-noite local.
 */
export function todayLocalISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function getWhatsAppUrl(phone: string, message = "") {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${text}`;
}

export function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Contato a mostrar pro trabalhador quando o contato é liberado (após
 *  aprovação). Vaga captada do Facebook (job.source === "facebook") usa o
 *  contato de quem publicou o post original, guardado na própria vaga - não
 *  o perfil da empresa-vitrine que só existe pra satisfazer o modelo de
 *  dados (lib/facebookJobs.ts). */
export function getJobContact(
  job: { source?: "facebook"; externalContactName?: string; externalContactPhone?: string; externalContactEmail?: string },
  company?: { establishmentName: string; phone: string; email: string }
) {
  if (job.source === "facebook") {
    return {
      name: job.externalContactName || "Quem publicou o anúncio",
      phone: job.externalContactPhone || "",
      email: job.externalContactEmail || ""
    };
  }
  return {
    name: company?.establishmentName || "Empresa",
    phone: company?.phone || "",
    email: company?.email || ""
  };
}
