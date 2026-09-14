import { getCoinProduct } from "./coinCatalog";

// Comissão do vendedor por plano vendido: 40% no Plus mensal (mais barato),
// 30% no Plus trimestral (mais caro). O preço de cada faixa vem do catálogo
// (coinCatalog.ts) para não desalinhar se o preço mudar lá; só cai no valor
// fixo abaixo se o produto sumir do catálogo.
const MONTHLY_PRODUCT_ID = "company_plus_30d";
const QUARTERLY_PRODUCT_ID = "company_plus_90d";

interface CommissionTier {
  productId: string;
  priceCents: number;
  rate: number;
}

const SALES_COMMISSION_TIERS: CommissionTier[] = [
  { productId: MONTHLY_PRODUCT_ID, priceCents: getCoinProduct(MONTHLY_PRODUCT_ID)?.priceCents ?? 19990, rate: 0.4 },
  { productId: QUARTERLY_PRODUCT_ID, priceCents: getCoinProduct(QUARTERLY_PRODUCT_ID)?.priceCents ?? 53990, rate: 0.3 }
].sort((a, b) => a.priceCents - b.priceCents);

/** Taxa de comissão (0-1) para uma venda: casa pelo id do plano (vendas
 *  automáticas via Mercado Pago gravam o id do produto em `plan`), senão pelo
 *  valor exato, senão interpola pela posição do valor entre o plano mais
 *  barato e o mais caro conhecidos — cobre vendas manuais com texto livre. */
export function commissionRateForSale(sale: { plan: string; amountCents: number }): number {
  const byId = SALES_COMMISSION_TIERS.find((tier) => tier.productId === sale.plan);
  if (byId) return byId.rate;

  const byPrice = SALES_COMMISSION_TIERS.find((tier) => tier.priceCents === sale.amountCents);
  if (byPrice) return byPrice.rate;

  const cheapest = SALES_COMMISSION_TIERS[0];
  const priciest = SALES_COMMISSION_TIERS[SALES_COMMISSION_TIERS.length - 1];
  if (sale.amountCents <= cheapest.priceCents) return cheapest.rate;
  if (sale.amountCents >= priciest.priceCents) return priciest.rate;

  const span = priciest.priceCents - cheapest.priceCents;
  const t = (sale.amountCents - cheapest.priceCents) / span;
  return cheapest.rate + (priciest.rate - cheapest.rate) * t;
}

export function commissionCentsForSale(sale: { plan: string; amountCents: number }): number {
  return Math.round(sale.amountCents * commissionRateForSale(sale));
}

/** Valor que sobra para o PONT depois de descontar a comissão do vendedor. */
export function netCentsForSale(sale: { plan: string; amountCents: number }): number {
  return sale.amountCents - commissionCentsForSale(sale);
}
