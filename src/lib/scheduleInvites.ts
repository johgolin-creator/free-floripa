import { supabase } from "./supabase";
import type { CompanySchedule } from "./types";

// Link de convite de escala: ver supabase/schedule_invites.sql.

export type InviteStatus = "confirmado" | "recusado" | "lista_espera";

export interface ScheduleInvite {
  id: string;
  code: string;
  scheduleId: string;
  active: boolean;
}

export interface InviteResponse {
  id: string;
  name: string;
  phoneDigits: string;
  /** Só dígitos; "" para quem respondeu antes de o CPF ser pedido. */
  cpf: string;
  status: InviteStatus;
  inPont: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicInvite {
  title: string;
  functionName: string;
  quantity: number;
  date: string;
  startsAt: string;
  endsAt: string;
  place: string;
  neighborhood: string;
  notes: string;
  companyName: string;
  active: boolean;
  confirmed: number;
}

export type RespondError = "invite_not_found" | "closed" | "name" | "phone" | "cpf" | "cpf_in_use" | "answer" | "full" | "unavailable";

// Sem 0/O, 1/I/L: o código pode ser lido em voz alta ou digitado.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function scheduleInviteUrl(code: string): string {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "https://usepont.com.br");
  return `${String(base).replace(/\/$/, "")}/convite/${code}`;
}

function formatDateBr(date: string) {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

/** Mensagem pronta para colar no WhatsApp junto com o link. */
export function scheduleInviteMessage(schedule: Pick<CompanySchedule, "title" | "date" | "startsAt" | "endsAt" | "location" | "neighborhood">, companyName: string, url: string) {
  const place = [schedule.location, schedule.neighborhood].filter(Boolean).join(" - ");
  const lines = [
    `Escala ${schedule.title}${companyName ? ` - ${companyName}` : ""}`,
    `Data: ${formatDateBr(schedule.date)}, das ${schedule.startsAt} às ${schedule.endsAt}`
  ];
  if (place) lines.push(`Local: ${place}`);
  lines.push("", "Confirme sua presença por aqui (leva 10 segundos):", url);
  return lines.join("\n");
}

export function inviteWhatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function friendlyError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("does not exist") ||
    normalized.includes("could not find") ||
    normalized.includes("schema cache") ||
    normalized.includes("relation")
  ) {
    return "O link de convite ainda não foi ativado no banco de dados.";
  }
  if (normalized.includes("row-level security") || normalized.includes("permission")) {
    return "Sem permissão para criar o link de convite. Entre na sua conta e tente de novo.";
  }
  return message || "Não foi possível concluir a operação.";
}

interface InviteRow {
  id: string;
  code: string;
  schedule_id: string;
  active: boolean;
}

function toInvite(row: InviteRow): ScheduleInvite {
  return { id: row.id, code: row.code, scheduleId: row.schedule_id, active: row.active };
}

function scheduleFields(schedule: CompanySchedule, companyName: string) {
  return {
    company_name: companyName,
    title: schedule.title,
    function_name: schedule.function,
    quantity: Math.max(1, schedule.quantity),
    shift_date: schedule.date,
    starts_at: schedule.startsAt,
    ends_at: schedule.endsAt,
    place: schedule.location,
    neighborhood: schedule.neighborhood,
    notes: schedule.notes,
    active: schedule.status !== "Cancelada",
    updated_at: new Date().toISOString()
  };
}

/** Link já existente da escala, se houver. */
export async function findScheduleInvite(scheduleId: string): Promise<ScheduleInvite | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("schedule_invites")
    .select("id,code,schedule_id,active")
    .eq("schedule_id", scheduleId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error.message));
  return data ? toInvite(data as InviteRow) : null;
}

/** Devolve o link da escala, criando se ainda não existir. */
export async function getOrCreateScheduleInvite(schedule: CompanySchedule, companyName: string): Promise<ScheduleInvite> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");

  const existing = await findScheduleInvite(schedule.id);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("schedule_invites")
      .insert({ code: generateInviteCode(), schedule_id: schedule.id, ...scheduleFields(schedule, companyName) })
      .select("id,code,schedule_id,active")
      .single();

    if (!error && data) return toInvite(data as InviteRow);
    // 23505 = código repetido (raríssimo): sorteia outro. Escala repetida: já existe.
    if (error?.code === "23505") {
      const again = await findScheduleInvite(schedule.id);
      if (again) return again;
      continue;
    }
    throw new Error(friendlyError(error?.message ?? ""));
  }
  throw new Error("Não foi possível gerar um código de convite. Tente de novo.");
}

/** Mantém o convite igual à escala depois de editar (título, data, vagas...). Melhor esforço. */
export async function syncScheduleInvite(schedule: CompanySchedule, companyName: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("schedule_invites").update(scheduleFields(schedule, companyName)).eq("schedule_id", schedule.id);
  if (error) console.warn("[convite] não sincronizou:", error.message);
}

/** Escala excluída: o link deixa de aceitar respostas (as já dadas ficam guardadas). */
export async function deactivateScheduleInvite(scheduleId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("schedule_invites").update({ active: false, updated_at: new Date().toISOString() }).eq("schedule_id", scheduleId);
  if (error) console.warn("[convite] não desativou:", error.message);
}

interface ResponseRow {
  id: string;
  name: string;
  phone_digits: string;
  cpf: string | null;
  status: InviteStatus;
  worker_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listInviteResponses(inviteId: string): Promise<InviteResponse[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("schedule_invite_responses")
    .select("id,name,phone_digits,cpf,status,worker_user_id,created_at,updated_at")
    .eq("invite_id", inviteId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(friendlyError(error.message));
  return ((data ?? []) as ResponseRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    phoneDigits: row.phone_digits,
    cpf: row.cpf ?? "",
    status: row.status,
    inPont: Boolean(row.worker_user_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function setInviteResponseStatus(responseId: string, status: InviteStatus): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("schedule_invite_responses")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", responseId);
  if (error) throw new Error(friendlyError(error.message));
}

export async function removeInviteResponse(responseId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("schedule_invite_responses").delete().eq("id", responseId);
  if (error) throw new Error(friendlyError(error.message));
}

interface PublicInviteRow {
  title: string;
  function_name: string;
  quantity: number;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  place: string;
  neighborhood: string;
  notes: string;
  company_name: string;
  active: boolean;
  confirmed: number;
}

/** Página pública: dados do evento pelo código. null = código inexistente. */
export async function fetchPublicInvite(code: string): Promise<PublicInvite | null> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { data, error } = await supabase.rpc("schedule_invite_public", { p_code: code });
  if (error) throw new Error(friendlyError(error.message));
  const row = ((data ?? []) as PublicInviteRow[])[0];
  if (!row) return null;
  return {
    title: row.title,
    functionName: row.function_name,
    quantity: row.quantity,
    date: row.shift_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    place: row.place,
    neighborhood: row.neighborhood,
    notes: row.notes,
    companyName: row.company_name,
    active: row.active,
    confirmed: row.confirmed
  };
}

export async function respondToInvite(
  code: string,
  name: string,
  phone: string,
  cpf: string,
  answer: "confirmo" | "recuso"
): Promise<{ ok: true; status: InviteStatus } | { ok: false; error: RespondError }> {
  if (!supabase) return { ok: false, error: "unavailable" };
  const { data, error } = await supabase.rpc("schedule_invite_respond", {
    p_code: code,
    p_name: name,
    p_phone: phone,
    p_cpf: cpf,
    p_answer: answer
  });
  if (error) return { ok: false, error: "unavailable" };
  const result = data as { ok?: boolean; status?: InviteStatus; error?: RespondError } | null;
  if (result?.ok && result.status) return { ok: true, status: result.status };
  return { ok: false, error: result?.error ?? "unavailable" };
}
