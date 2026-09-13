import { supabase } from "./supabase";

// Exclusão de contas de terceiros pela administração. Roda na Edge Function
// "admin-delete-account", que exige papel admin/moderador e usa a service
// role. Sem Supabase (modo local/demo) não há conta real para excluir.
export const adminAccountsEnabled = Boolean(supabase);

const GENERIC_ERROR = "Não foi possível excluir a conta agora. Tente novamente em instantes.";

async function readErrorDetail(error: unknown): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // usa a mensagem genérica
    }
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : GENERIC_ERROR;
}

/**
 * Exclui permanentemente a conta indicada (trabalhador ou empresa) e todos os
 * dados associados. Lança com mensagem exibível em caso de falha; devolve os
 * avisos não fatais do servidor em caso de sucesso.
 */
export async function adminDeleteAccount(targetUserId: string): Promise<{ warnings: string[] }> {
  if (!supabase) {
    throw new Error("A exclusão de contas está disponível apenas no ambiente online.");
  }

  const { data, error } = await supabase.functions.invoke("admin-delete-account", {
    body: { targetUserId }
  });
  if (error) {
    throw new Error(await readErrorDetail(error));
  }
  if (!data || (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string })?.error || GENERIC_ERROR);
  }

  return { warnings: ((data as { warnings?: string[] }).warnings ?? []) };
}

/**
 * Exclui uma vaga (e suas candidaturas). Roda na função security-definer
 * admin_delete_job, restrita a admin/moderador.
 */
export async function adminDeleteJob(jobId: string): Promise<void> {
  if (!supabase) {
    throw new Error("A exclusão de vagas está disponível apenas no ambiente online.");
  }
  const { error } = await supabase.rpc("admin_delete_job", { target_job_id: jobId });
  if (error) throw new Error(error.message);
}

interface WorkerContactRow {
  id: string;
  user_id: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * Notifica todos os freelancers cadastrados sobre uma vaga. Usa a mesma
 * função security-definer admin_list_worker_contacts (restrita a
 * admin/moderador) para achar o user_id de cada trabalhador, depois insere
 * uma linha em public.notifications por pessoa (a policy de insert dessa
 * tabela aceita qualquer usuário autenticado gravando para qualquer user_id).
 */
export async function adminNotifyAllWorkers(title: string, body: string): Promise<{ count: number }> {
  if (!supabase) {
    throw new Error("O envio de notificações está disponível apenas no ambiente online.");
  }

  const { data, error } = await supabase.rpc("admin_list_worker_contacts");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as WorkerContactRow[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  if (userIds.length === 0) return { count: 0 };

  const createdAt = new Date().toISOString();
  const notifications = userIds.map((userId) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    role: "trabalhador",
    title,
    body,
    read: false,
    created_at: createdAt
  }));

  const { error: insertError } = await supabase.from("notifications").insert(notifications);
  if (insertError) throw new Error(insertError.message);

  return { count: userIds.length };
}
