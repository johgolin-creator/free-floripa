// Recebe as notificações do Mercado Pago, confirma o pagamento pela API do MP
// e credita a carteira chamando public.credit_payment com a service role.
// É idempotente: o MP reenvia a mesma notificação várias vezes.
//
// Deploy pelo Dashboard do Supabase (Edge Functions > Deploy a new function),
// nome "mercadopago-webhook", "Enforce JWT Verification" DESLIGADO (quem chama
// é o Mercado Pago, sem JWT).
//
// Secrets:
//   MERCADOPAGO_ACCESS_TOKEN   — mesmo token da função create-payment
//   MERCADOPAGO_WEBHOOK_SECRET — "Assinatura secreta" do painel de webhooks do
//                                MP. Se vazio, a checagem de assinatura é
//                                pulada (use só em teste).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY são injetados.
//
// Configure a URL no painel do Mercado Pago (Suas integrações > Webhooks):
//   https://<project-ref>.supabase.co/functions/v1/mercadopago-webhook
//   evento: "Pagamentos"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function verifySignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signature || !requestId) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok();
  // O MP aceita qualquer 2xx como "recebido". Nunca devolvemos erro por
  // problema de negócio — só logamos — senão ele fica reenviando pra sempre.
  if (req.method !== "POST" && req.method !== "GET") return ok();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET") ?? "";
  if (!supabaseUrl || !serviceRoleKey || !mpAccessToken) {
    console.error("mercadopago-webhook: secrets ausentes");
    return ok({ ok: false });
  }

  const url = new URL(req.url);
  let type = url.searchParams.get("type") || url.searchParams.get("topic") || "";
  let dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";

  if (req.method === "POST") {
    try {
      const payload = await req.json();
      type = payload?.type || payload?.topic || type;
      dataId = String(payload?.data?.id ?? payload?.resource ?? dataId);
    } catch {
      // segue com os query params
    }
  }

  // Só nos interessa notificação de pagamento.
  if (!type.includes("payment") || !dataId) return ok();

  if (webhookSecret) {
    const valid = await verifySignature(req, dataId, webhookSecret);
    if (!valid) {
      console.error("mercadopago-webhook: assinatura inválida");
      return ok({ ok: false });
    }
  }

  // Busca o pagamento real no MP (não confiamos no corpo da notificação).
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` }
  });
  if (!mpRes.ok) {
    console.error("mercadopago-webhook: falha ao buscar pagamento", dataId, mpRes.status);
    return ok({ ok: false });
  }
  const mpPayment = await mpRes.json();
  const externalReference: string | undefined = mpPayment?.external_reference;
  const status: string = mpPayment?.status ?? "pending";
  if (!externalReference) return ok();

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin.rpc("credit_payment", {
    target_payment_id: externalReference,
    mp_payment_id: String(mpPayment.id),
    mp_status: status
  });
  if (error) {
    console.error("mercadopago-webhook: credit_payment falhou", error.message);
    return ok({ ok: false });
  }

  return ok();
});
