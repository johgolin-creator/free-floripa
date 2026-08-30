// Deletes the calling user's own PONT account and associated data.
//
// The client (src/lib/accountDeletion.ts) calls this with the logged-in
// user's session, so a user can only ever delete themselves. Keep
// "Enforce JWT Verification" ON for this function.
//
// Deployed from the Supabase Dashboard:
//   1. Edge Functions > Deploy a new function, name it "delete-account",
//      and paste this file. Leave "Enforce JWT Verification" ON.
//   2. No extra secrets are needed: SUPABASE_URL, SUPABASE_ANON_KEY and
//      SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// What it removes:
//   - the auth user (auth.users), which cascades through public.users and
//     every table with `references ... on delete cascade` (worker/company
//     profiles, jobs, applications, shifts, reviews, favorites,
//     subscriptions, notifications, coin wallet/transactions, ...);
//   - storage objects under `<user id>/` in the "avatars" bucket, which
//     are not covered by a database cascade;
//   - public.app_state_snapshots rows for this user, whose state_key is
//     "<VITE_SUPABASE_STATE_KEY>:<user id>" and has no foreign key.
//
// bug_reports.reporter_id and email_notifications.recipient_user_id are
// defined as `on delete set null`, so those rows survive without pointing
// back to the deleted account (kept on purpose for moderation/audit).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Função não configurada." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonResponse({ ok: false, error: "Sessão ausente." }, 401);
  }

  // Identify the caller from their own JWT.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return jsonResponse({ ok: false, error: "Sessão inválida ou expirada." }, 401);
  }

  const userId = user.id;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const warnings: string[] = [];

  // 1. Storage: everything under "<user id>/" in the avatars bucket.
  try {
    const { data: files, error: listError } = await admin.storage.from("avatars").list(userId, { limit: 100 });
    if (listError) {
      warnings.push(`storage list: ${listError.message}`);
    } else if (files && files.length > 0) {
      const paths = files.map((file) => `${userId}/${file.name}`);
      const { error: removeError } = await admin.storage.from("avatars").remove(paths);
      if (removeError) warnings.push(`storage remove: ${removeError.message}`);
    }
  } catch (error) {
    warnings.push(`storage: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Account-scoped state snapshot (no FK cascade).
  try {
    const { error: snapshotError } = await admin
      .from("app_state_snapshots")
      .delete()
      .like("state_key", `%:${userId}`);
    if (snapshotError) warnings.push(`app_state_snapshots: ${snapshotError.message}`);
  } catch (error) {
    warnings.push(`app_state_snapshots: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 3. The auth user itself. This cascades through public.users and all
  //    tables that reference it with `on delete cascade`.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse(
      { ok: false, error: "Não foi possível excluir a conta agora. Tente novamente em instantes." },
      500
    );
  }

  return jsonResponse({ ok: true, warnings });
});
