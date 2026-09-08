// Cria um pedido de compra de moedas / Plus e uma preferência de checkout no
// Mercado Pago (Pix + cartão, página hospedada pelo MP). O app abre a URL
// retornada no NAVEGADOR EXTERNO — nunca dentro do WebView — para não
// esbarrar na política de pagamentos da Play Store.
//
// Fluxo:
//   1. cliente autenticado chama esta função com { productId }
//   2. servidor relê o produto do catálogo (_shared/catalog.ts) — nunca
//      confia em preço/quantidade vindos do cliente
//   3. insere uma linha em public.payments (status 'pending') com a service role
//   4. cria a preference no MP com external_reference = payments.id e
//      notification_url apontando para a função mercadopago-webhook
//   5. devolve { paymentId, initPoint }
//
// Deploy pelo Dashboard do Supabase (Edge Functions > Deploy a new function),
// nome "mercadopago-create-payment", "Enforce JWT Verification" LIGADO.
//
// Secrets necessários (Edge Functions > Secrets):
//   MERCADOPAGO_ACCESS_TOKEN  — Access Token da aplicação (TEST-... ou APP_USR-...)
//   PUBLIC_APP_URL            — ex.: https://usepont.com.br (para as back_urls)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são injetados.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCoinProduct } from "../_shared/catalog.ts";

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
  const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const appUrl = (Deno.env.get("PUBLIC_APP_URL") || "https://usepont.com.br").replace(/\/$/, "");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !mpAccessToken) {
    return json({ ok: false, error: "Função de pagamento não configurada." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ ok: false, error: "Sessão ausente." }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ ok: false, error: "Sessão inválida ou expirada." }, 401);

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Corpo inválido." }, 400);
  }

  const product = body.productId ? getCoinProduct(body.productId) : undefined;
  if (!product) return json({ ok: false, error: "Produto não encontrado." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. cria o pedido pendente
  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      role: product.role,
      product_id: product.id,
      provider: "mercadopago",
      amount_cents: product.priceCents,
      coins: product.coins,
      plus_days: product.plusDays,
      ledger_reason: product.ledgerReason,
      status: "pending"
    })
    .select()
    .single();

  if (insertError || !payment) {
    return json({ ok: false, error: "Não foi possível iniciar o pagamento." }, 500);
  }

  // 2. cria a preference no Mercado Pago
  const preferenceBody = {
    items: [
      {
        id: product.id,
        title: `PONT — ${product.title}`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: product.priceCents / 100
      }
    ],
    payer: { email: user.email ?? undefined },
    external_reference: payment.id,
    notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    statement_descriptor: "PONT",
    back_urls: {
      success: `${appUrl}/app/moedas?pagamento=sucesso`,
      pending: `${appUrl}/app/moedas?pagamento=pendente`,
      failure: `${appUrl}/app/moedas?pagamento=falha`
    },
    auto_return: "approved"
  };

  const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(preferenceBody)
  });

  const mpData = await mpResponse.json().catch(() => ({}));
  if (!mpResponse.ok) {
    await admin.from("payments").update({ status: "rejected" }).eq("id", payment.id);
    return json({ ok: false, error: "O provedor de pagamento recusou a solicitação." }, 502);
  }

  const initPoint: string | undefined = mpData.init_point || mpData.sandbox_init_point;
  await admin
    .from("payments")
    .update({ provider_payment_id: null, init_point: initPoint ?? null })
    .eq("id", payment.id);

  return json({ ok: true, paymentId: payment.id, initPoint });
});
