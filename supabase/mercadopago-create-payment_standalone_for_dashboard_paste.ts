// Cria um pedido de compra de moedas / Plus e uma preferência de checkout no
// Mercado Pago (Pix + cartão, página hospedada pelo MP). No app nativo a URL
// retornada abre no NAVEGADOR EXTERNO — nunca dentro do WebView — para não
// esbarrar na política de pagamentos da Play Store; no site, abre na própria
// aba (ver src/lib/payments.ts openCheckout).
//
// Fluxo:
//   1. cliente autenticado chama esta função com { productId }
//   2. servidor relê o produto do catálogo (embutido abaixo) — nunca confia
//      em preço/quantidade vindos do cliente
//   3. insere uma linha em public.payments (status 'pending') com a service role
//   4. cria a preference no MP com external_reference = payments.id e
//      notification_url apontando para a função mercadopago-webhook
//   5. devolve { paymentId, initPoint }
//
// Versão autocontida (catálogo embutido) para colar direto no editor do
// Dashboard do Supabase, sem depender do arquivo separado
// supabase/functions/_shared/catalog.ts (que o editor do dashboard não
// publica junto). O arquivo "de verdade", modular, é
// supabase/functions/mercadopago-create-payment/index.ts — mantenha os dois
// em sincronia manualmente a cada mudança de catálogo.
//
// Deploy pelo Dashboard do Supabase (Edge Functions > mercadopago-create-payment),
// "Enforce JWT Verification" LIGADO.
//
// Secrets necessários (Edge Functions > Secrets):
//   MERCADOPAGO_ACCESS_TOKEN  — Access Token da aplicação (TEST-... ou APP_USR-...)
//   PUBLIC_APP_URL            — ex.: https://usepont.com.br (para as back_urls)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são injetados.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Role = "trabalhador" | "empresa";

interface CoinProduct {
  id: string;
  role: Role;
  title: string;
  priceCents: number;
  coins: number;
  plusDays: number;
  ledgerReason: string;
}

const COIN_PRODUCTS: CoinProduct[] = [
  {
    id: "worker_coin_pack_10",
    role: "trabalhador",
    title: "Pacote de moedas",
    priceCents: 495,
    coins: 10,
    plusDays: 0,
    ledgerReason: "coin_pack"
  },
  {
    id: "worker_professional_30",
    role: "trabalhador",
    title: "Pacote Profissional",
    priceCents: 1990,
    coins: 30,
    plusDays: 0,
    ledgerReason: "package_professional"
  },
  {
    id: "worker_plus_30d",
    role: "trabalhador",
    title: "Plus — 30 dias",
    priceCents: 2990,
    coins: 0,
    plusDays: 30,
    ledgerReason: "package_plus"
  },
  {
    id: "company_coin_pack_10",
    role: "empresa",
    title: "Pacote de moedas da empresa",
    priceCents: 1990,
    coins: 10,
    plusDays: 0,
    ledgerReason: "company_coin_pack"
  },
  {
    id: "company_plus_30d",
    role: "empresa",
    title: "Plus empresa — Mensal",
    priceCents: 19990,
    coins: 0,
    plusDays: 30,
    ledgerReason: "company_package_plus"
  },
  {
    id: "company_plus_90d",
    role: "empresa",
    title: "Plus empresa — Trimestral",
    priceCents: 53990,
    coins: 0,
    plusDays: 90,
    ledgerReason: "company_package_plus"
  }
];

function getCoinProduct(id: string): CoinProduct | undefined {
  return COIN_PRODUCTS.find((product) => product.id === id);
}

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
      success: `${appUrl}/app/moedas?pagamento=sucesso&payment=${payment.id}`,
      pending: `${appUrl}/app/moedas?pagamento=pendente&payment=${payment.id}`,
      failure: `${appUrl}/app/moedas?pagamento=falha&payment=${payment.id}`
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
