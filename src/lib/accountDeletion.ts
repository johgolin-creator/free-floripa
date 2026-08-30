import { supabase } from "./supabase";

// Deletion runs server-side in the "delete-account" Edge Function, which
// needs the service role key. Without Supabase configured (local/demo
// mode) there is no account to delete.
export const accountDeletionEnabled = Boolean(supabase);

const GENERIC_ERROR = "Não foi possível excluir a conta agora. Tente novamente em instantes.";

async function readErrorDetail(error: unknown): Promise<string> {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // fall through to the generic message
    }
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : GENERIC_ERROR;
}

/**
 * Permanently deletes the logged-in user's account and associated data,
 * then clears the local session. Throws with a user-facing message on
 * failure; on success the caller should navigate away from any
 * authenticated screen.
 */
export async function deleteOwnAccount(): Promise<void> {
  if (!supabase) {
    throw new Error("A exclusão de conta pelo app está disponível apenas no ambiente online.");
  }

  const { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (error) {
    throw new Error(await readErrorDetail(error));
  }
  if (data && (data as { ok?: boolean }).ok === false) {
    const detail = (data as { error?: string }).error;
    throw new Error(detail || GENERIC_ERROR);
  }

  // The auth user no longer exists; drop the local/native session without
  // a network round-trip (a global sign-out would fail against the now
  // deleted account).
  await supabase.auth.signOut({ scope: "local" }).catch(() => {
    // Session is gone either way.
  });
}
