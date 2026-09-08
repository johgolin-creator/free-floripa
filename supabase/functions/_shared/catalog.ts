// Catálogo de produtos pagos — espelho de src/lib/coinCatalog.ts.
// As duas listas PRECISAM ficar iguais (id, priceCents, coins, plusDays,
// ledgerReason). O servidor nunca confia no preço vindo do cliente: ele
// relê tudo daqui a partir do productId.

export type Role = "trabalhador" | "empresa";

export interface CoinProduct {
  id: string;
  role: Role;
  title: string;
  priceCents: number;
  coins: number;
  plusDays: number;
  ledgerReason: string;
}

export const COIN_PRODUCTS: CoinProduct[] = [
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
  }
];

export function getCoinProduct(id: string): CoinProduct | undefined {
  return COIN_PRODUCTS.find((product) => product.id === id);
}
