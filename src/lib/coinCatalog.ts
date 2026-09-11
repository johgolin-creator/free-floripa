import type { UserRole } from "./types";

// Catálogo de produtos pagos (moedas e Plus). É a fonte única de verdade e é
// espelhado no servidor pela Edge Function mercadopago-create-payment
// (supabase/functions/mercadopago-create-payment/index.ts) — se mudar preço,
// quantidade de moedas ou dias de Plus aqui, atualize lá também.
//
// TODO(pricing): confirmar com o time os valores finais antes de ligar a loja.
// Os números abaixo espelham o que já aparecia no app (coin_pack R$4,95 /
// package_professional R$19,90 / package_plus R$29,90).

export interface CoinProduct {
  /** Identificador estável usado no client, no servidor e na tabela payments. */
  id: string;
  /** Carteira que recebe o crédito. */
  role: UserRole;
  title: string;
  description: string;
  /** Preço em centavos de BRL (ex.: 495 = R$ 4,95). */
  priceCents: number;
  /** Moedas creditadas ao confirmar o pagamento (0 para produtos só de Plus). */
  coins: number;
  /** Dias de Plus (candidaturas/ações ilimitadas) adicionados. 0 = não é Plus. */
  plusDays: number;
  /** Valor gravado em coin_transactions.reason, para o extrato reconhecer. */
  ledgerReason: "coin_pack" | "package_professional" | "package_plus" | "company_coin_pack";
}

export const COIN_PRODUCTS: CoinProduct[] = [
  {
    id: "worker_coin_pack_10",
    role: "trabalhador",
    title: "Pacote de moedas",
    description: "10 moedas para enviar candidaturas.",
    priceCents: 495,
    coins: 10,
    plusDays: 0,
    ledgerReason: "coin_pack"
  },
  {
    id: "worker_professional_30",
    role: "trabalhador",
    title: "Pacote Profissional",
    description: "30 moedas com melhor custo por candidatura.",
    priceCents: 1990,
    coins: 30,
    plusDays: 0,
    ledgerReason: "package_professional"
  },
  {
    id: "worker_plus_30d",
    role: "trabalhador",
    title: "Plus — 30 dias",
    description: "Candidaturas ilimitadas por 30 dias, sem gastar moedas.",
    priceCents: 2990,
    coins: 0,
    plusDays: 30,
    ledgerReason: "package_plus"
  },
  {
    id: "company_coin_pack_10",
    role: "empresa",
    title: "Pacote de moedas da empresa",
    description: "10 moedas para ações da empresa, como cancelar vagas já preenchidas.",
    priceCents: 1990,
    coins: 10,
    plusDays: 0,
    ledgerReason: "company_coin_pack"
  }
];

export function getCoinProduct(id: string): CoinProduct | undefined {
  return COIN_PRODUCTS.find((product) => product.id === id);
}

export function getCoinProductsForRole(role: UserRole): CoinProduct[] {
  return COIN_PRODUCTS.filter((product) => product.role === role);
}

export function formatProductPrice(priceCents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceCents / 100);
}
