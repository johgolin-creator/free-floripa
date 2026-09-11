import { supabase } from "./supabase";
import type { UserRole } from "./types";

// Liga a loja de moedas só quando VITE_PAYMENTS_ENABLED === "on". Enquanto
// estiver desligado, a tela de Moedas segue mostrando "compra em breve" e as
// Edge Functions / secrets do Mercado Pago não precisam existir.
export const paymentsEnabled = Boolean(supabase) && import.meta.env.VITE_PAYMENTS_ENABLED === "on";

// Modo demonstração: o "checkout" é simulado dentro do próprio app — nenhuma
// chamada ao Mercado Pago e nenhuma cobrança. Serve para mostrar o trâmite de
// compra ponta a ponta (ver produto → comprar → confirmar → plano/saldo ativo).
// Liga sozinho quando não há Supabase (build demo) ou quando
// VITE_PAYMENTS_ENABLED === "demo". Nunca liga junto com paymentsEnabled.
export const paymentsDemo =
  !paymentsEnabled && (!supabase || import.meta.env.VITE_PAYMENTS_ENABLED === "demo");

export type PaymentStatus =
  | "pending"
  | "in_process"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded";

export interface PaymentRow {
  id: string;
  role: UserRole;
  product_id: string;
  amount_cents: number;
  coins: number;
  plus_days: number;
  status: PaymentStatus;
  credited: boolean;
  created_at: string;
  paid_at: string | null;
}

export interface CreatePaymentResult {
  paymentId: string;
  initPoint: string;
}

/** Cria o pedido no servidor e devolve a URL de checkout do Mercado Pago. */
export async function createCoinPayment(productId: string): Promise<CreatePaymentResult> {
  if (!supabase) throw new Error("Pagamentos disponíveis apenas no ambiente online.");

  const { data, error } = await supabase.functions.invoke("mercadopago-create-payment", {
    body: { productId }
  });

  if (error) {
    throw new Error(await readFunctionError(error));
  }
  if (!data?.ok || !data.initPoint) {
    throw new Error(data?.error || "Não foi possível iniciar o pagamento.");
  }

  return { paymentId: data.paymentId as string, initPoint: data.initPoint as string };
}

/** Lê um pedido (RLS deixa o usuário ver só os próprios) para conferir o
 *  status depois que ele volta do checkout. */
export async function getPaymentStatus(paymentId: string): Promise<PaymentRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("payments")
    .select("id,role,product_id,amount_cents,coins,plus_days,status,credited,created_at,paid_at")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PaymentRow | null) ?? null;
}

/** Abre o checkout no navegador EXTERNO (nunca no WebView) para respeitar a
 *  política de pagamentos da Play Store. */
export function openCheckout(initPoint: string) {
  window.open(initPoint, "_blank", "noopener,noreferrer");
}

async function readFunctionError(error: unknown): Promise<string> {
  const withContext = error as { context?: Response };
  if (withContext?.context && typeof withContext.context.json === "function") {
    try {
      const payload = await withContext.context.json();
      if (payload?.error) return String(payload.error);
    } catch {
      // ignora
    }
  }
  return error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
}
