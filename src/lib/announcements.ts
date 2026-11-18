import { supabase } from "./supabase";
import { uploadProfileImage } from "./supabaseStorage";

// Avisos gerais do admin com imagem (flyer) e confirmação "Comparecerei".
// Tabelas: public.announcements, public.announcement_responses (Issue #25).

export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  rsvpEnabled: boolean;
  createdAt: string;
  responseCount: number;
}

export interface AnnouncementResponder {
  userId: string;
  displayName: string;
  phone: string;
  email: string;
  respondedAt: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  rsvp_enabled: boolean;
  created_at: string;
  announcement_responses?: { count: number }[];
}

interface ResponderRow {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  responded_at: string;
}

function requireSupabase() {
  if (!supabase) throw new Error("Avisos estão disponíveis apenas no ambiente online.");
  return supabase;
}

/** Envia o flyer para o storage público (pasta do próprio admin). */
export function uploadAnnouncementImage(file: File) {
  return uploadProfileImage(file, "avisos");
}

/**
 * Cria o aviso e manda uma notificação para cada freelancer cadastrado.
 * Cada notificação dispara também o Web Push (gatilho em public.notifications).
 */
export async function sendAnnouncementToWorkers(input: {
  title: string;
  body: string;
  imageUrl?: string;
  rsvpEnabled: boolean;
}): Promise<{ count: number; announcementId: string }> {
  const client = requireSupabase();
  const { data: userData } = await client.auth.getUser();

  const announcementId = crypto.randomUUID();
  const { error: announcementError } = await client.from("announcements").insert({
    id: announcementId,
    title: input.title,
    body: input.body,
    image_url: input.imageUrl ?? null,
    rsvp_enabled: input.rsvpEnabled,
    created_by: userData.user?.id ?? null
  });
  if (announcementError) throw new Error(announcementError.message);

  const { data, error } = await client.rpc("admin_list_worker_contacts");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { user_id: string | null }[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  if (userIds.length === 0) return { count: 0, announcementId };

  const createdAt = new Date().toISOString();
  const notifications = userIds.map((userId) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    role: "trabalhador",
    title: input.title,
    body: input.body,
    image_url: input.imageUrl ?? null,
    announcement_id: announcementId,
    read: false,
    created_at: createdAt
  }));

  // Em lotes, para não estourar o tamanho da requisição com muitos cadastros.
  for (let index = 0; index < notifications.length; index += 500) {
    const { error: insertError } = await client.from("notifications").insert(notifications.slice(index, index + 500));
    if (insertError) throw new Error(insertError.message);
  }

  return { count: userIds.length, announcementId };
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("announcements")
    .select("id,title,body,image_url,rsvp_enabled,created_at,announcement_responses(count)")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);

  return ((data ?? []) as AnnouncementRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url ?? undefined,
    rsvpEnabled: row.rsvp_enabled,
    createdAt: row.created_at,
    responseCount: row.announcement_responses?.[0]?.count ?? 0
  }));
}

export async function listAnnouncementResponders(announcementId: string): Promise<AnnouncementResponder[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_list_announcement_responses", {
    target_announcement_id: announcementId
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as ResponderRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name || "Sem nome",
    phone: row.phone || "",
    email: row.email || "",
    respondedAt: row.responded_at
  }));
}

/** Ids dos avisos em que o usuário já marcou "Comparecerei". */
export async function loadMyAnnouncementResponses(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("announcement_responses")
    .select("announcement_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { announcement_id: string }[]).map((row) => row.announcement_id));
}

export async function setAnnouncementAttendance(announcementId: string, userId: string, attending: boolean) {
  const client = requireSupabase();
  if (attending) {
    const { error } = await client
      .from("announcement_responses")
      .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: "announcement_id,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from("announcement_responses")
      .delete()
      .eq("announcement_id", announcementId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
}
