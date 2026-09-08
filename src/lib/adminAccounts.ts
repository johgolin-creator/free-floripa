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
