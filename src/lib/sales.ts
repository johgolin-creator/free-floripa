import { supabase } from "./supabase";

export const salesEnabled = Boolean(supabase);

export type PaymentStatus = "pago" | "pendente" | "estornado" | "cancelado";
export type SaleStatus = "confirmada" | "pendente" | "cancelada";

export interface Sale {
  id: string;
  seq: number;
  companyId: string | null;
  companyName: string;
  salesRepId: string | null;
  salesRepCode: string;
  plan: string;
  amountCents: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  source: "manual" | "payment";
  soldAt: string;
}

interface SaleRow {
  id: string;
  seq: number | string;
  company_id: string | null;
  company_name: string | null;
  sales_rep_id: string | null;
  sales_rep_code: string | null;
  plan: string;
  amount_cents: number | string;
  payment_method: string | null;
  payment_status: PaymentStatus;
  status: SaleStatus;
  source: "manual" | "payment";
  sold_at: string;
}

function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    seq: Number(row.seq),
    companyId: row.company_id,
    companyName: row.company_name ?? "",
    salesRepId: row.sales_rep_id,
    salesRepCode: row.sales_rep_code ?? "",
    plan: row.plan,
    amountCents: Number(row.amount_cents),
    paymentMethod: row.payment_method ?? "",
    paymentStatus: row.payment_status,
    status: row.status,
    source: row.source,
    soldAt: row.sold_at
  };
}

/** Admin: todas as vendas. */
export async function listSales(): Promise<Sale[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_list_sales");
  if (error) throw new Error(error.message);
  return ((data ?? []) as SaleRow[]).map(mapSale);
}

/** Vendedor: só as próprias vendas (RLS "sales self read"). */
export async function listMySales(): Promise<Sale[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id,seq,company_id,company_name,sales_rep_id,sales_rep_code,plan,amount_cents,payment_method,payment_status,status,source,sold_at"
    )
    .order("sold_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SaleRow[]).map(mapSale);
}

export async function registerSale(input: {
  companyId: string;
  plan: string;
  amountCents: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  soldAt: string;
}): Promise<Sale> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { data, error } = await supabase.rpc("admin_register_sale", {
    p_company_id: input.companyId,
    p_plan: input.plan,
    p_amount_cents: Math.max(0, Math.round(input.amountCents)),
    p_payment_method: input.paymentMethod,
    p_payment_status: input.paymentStatus,
    p_sold_at: input.soldAt
  });
  if (error) throw new Error(error.message);
  return mapSale(data as SaleRow);
}

export async function deleteSale(id: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.rpc("admin_delete_sale", { sale_id: id });
  if (error) throw new Error(error.message);
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
