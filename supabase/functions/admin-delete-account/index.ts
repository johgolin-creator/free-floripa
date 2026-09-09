// Exclui PERMANENTEMENTE a conta de outro usuário (trabalhador ou empresa).
// Só admin/moderador pode chamar. Faz a mesma limpeza da função
// delete-account, mas para uma conta-alvo em vez da própria.
//
// Deploy pelo Dashboard do Supabase (Edge Functions > Deploy a new function),
// nome "admin-delete-account", "Enforce JWT Verification" LIGADO.
// Nenhum secret extra: SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY são injetados.
//
// Remove:
//   - o usuário em auth.users (cascateia public.users e todas as tabelas com
//     `references ... on delete cascade`: perfis, vagas, candidaturas,
//     turnos, avaliações, favoritos, assinaturas, notificações, carteira e
//     transações de moedas, pagamentos, ...);
//   - objetos em storage sob "<id do alvo>/" no bucket "avatars";
//   - linhas de public.app_state_snapshots do alvo (state_key "...:<id>").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, error: "Função não configurada." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, error: "Sessão ausente." }, 401);
  }

  let body: { targetUserId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Corpo inválido." }, 400);
  }
  const targetUserId = String(body.targetUserId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) {
    return json({ ok: false, error: "Conta-alvo inválida." }, 400);
  }

  // Identifica quem chamou pelo próprio JWT.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const caller = userData?.user;
  if (userError || !caller) return json({ ok: false, error: "Sessão inválida ou expirada." }, 401);

  if (caller.id === targetUserId) {
    return json({ ok: false, error: "Use a exclusão da própria conta para se remover." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Confere que quem chamou é admin/moderador.
  const { data: callerRow, error: callerRoleError } = await admin
    .from("users")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerRoleError || !callerRow || !["admin", "moderador"].includes(callerRow.role)) {
    return json({ ok: false, error: "Ação restrita à administração." }, 403);
  }

  // Não deixa remover outra conta com papel elevado por aqui.
  const { data: targetRow } = await admin
    .from("users")
    .select("role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetRow && ["admin", "moderador"].includes(targetRow.role)) {
    return json({ ok: false, error: "Contas de administração não podem ser excluídas por aqui." }, 403);
  }

  const warnings: string[] = [];

  // 1. Storage: tudo sob "<id do alvo>/" no bucket avatars.
  try {
    const { data: files, error: listError } = await admin.storage.from("avatars").list(targetUserId, { limit: 100 });
    if (listError) {
      warnings.push(`storage list: ${listError.message}`);
    } else if (files && files.length > 0) {
      const paths = files.map((file) => `${targetUserId}/${file.name}`);
      const { error: removeError } = await admin.storage.from("avatars").remove(paths);
      if (removeError) warnings.push(`storage remove: ${removeError.message}`);
    }
  } catch (error) {
    warnings.push(`storage: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2. Snapshot de estado por conta (sem cascade de FK).
  try {
    const { error: snapshotError } = await admin
      .from("app_state_snapshots")
      .delete()
      .like("state_key", `%:${targetUserId}`);
    if (snapshotError) warnings.push(`app_state_snapshots: ${snapshotError.message}`);
  } catch (error) {
    warnings.push(`app_state_snapshots: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 3. Vagas da empresa: apaga antes, caso o FK jobs -> company_profiles não
  //    tenha ON DELETE CASCADE no banco (senão a exclusão da conta trava).
  try {
    const { data: companyRows } = await admin
      .from("company_profiles")
      .select("id")
      .eq("user_id", targetUserId);
    const companyIds = (companyRows ?? []).map((row) => row.id as string);
    if (companyIds.length > 0) {
      const { data: jobRows } = await admin.from("jobs").select("id").in("company_id", companyIds);
      const jobIds = (jobRows ?? []).map((row) => row.id as string);
      if (jobIds.length > 0) {
        await admin.from("applications").delete().in("job_id", jobIds);
      }
      const { error: jobsError } = await admin.from("jobs").delete().in("company_id", companyIds);
      if (jobsError) warnings.push(`jobs: ${jobsError.message}`);
    }
  } catch (error) {
    warnings.push(`jobs cleanup: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 4. O usuário em si. Cascateia public.users e tudo com on delete cascade.
  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) {
    return json(
      { ok: false, error: `Não foi possível excluir a conta: ${deleteError.message}`, warnings },
      500
    );
  }

  return json({ ok: true, warnings });
});
