import { supabase } from "./supabase";

// Vendedores com código próprio. Cadastro/edição só pela administração
// (funções security-definer gated por is_support_user). A atribuição da
// empresa continua em company_profiles.sold_by, guardando o CÓDIGO.
export const salesRepsEnabled = Boolean(supabase);

export interface SalesRep {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
}

interface SalesRepRow {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
}

function mapRep(row: SalesRepRow): SalesRep {
  return { id: row.id, name: row.name, code: row.code, active: row.active, created_at: row.created_at };
}

export async function listSalesReps(): Promise<SalesRep[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_list_sales_reps");
  if (error) throw new Error(error.message);
  return ((data ?? []) as SalesRepRow[]).map(mapRep);
}

export async function upsertSalesRep(input: {
  id?: string;
  name: string;
  code: string;
  active: boolean;
}): Promise<SalesRep> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { data, error } = await supabase.rpc("admin_upsert_sales_rep", {
    rep_id: input.id ?? null,
    rep_name: input.name,
    rep_code: input.code,
    rep_active: input.active
  });
  if (error) throw new Error(error.message);
  return mapRep(data as SalesRepRow);
}

export async function deleteSalesRep(id: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.rpc("admin_delete_sales_rep", { rep_id: id });
  if (error) throw new Error(error.message);
}

/** Admin: define (ou limpa, com "") o vendedor da empresa pelo código. */
export async function adminSetCompanySalesRep(companyId: string, code: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.rpc("admin_set_company_sales_rep", {
    target_company_id: companyId,
    rep_code: code
  });
  if (error) throw new Error(error.message);
}

/** Empresa (self-service, write-once): amarra a própria empresa ao vendedor
 *  do código. `applied` = gravou agora; `ok` = o código existe e está ativo. */
export async function claimCompanySalesRep(code: string): Promise<{ ok: boolean; applied: boolean }> {
  if (!supabase) return { ok: false, applied: false };
  const { data, error } = await supabase.rpc("claim_company_sales_rep", { rep_code: code });
  if (error) return { ok: false, applied: false };
  const result = (data ?? {}) as { ok?: boolean; applied?: boolean };
  return { ok: Boolean(result.ok), applied: Boolean(result.applied) };
}

const CODE_PARAM = "vendedor";
const STASH_KEY = "pont:vendedor";

/** Lê ?vendedor=CODE da URL e guarda no localStorage para usar no cadastro. */
export function stashSalesRepCodeFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get(CODE_PARAM);
    const code = (raw ?? "").trim().toUpperCase();
    if (code) window.localStorage.setItem(STASH_KEY, code);
  } catch {
    // sem localStorage / SSR: ignora
  }
}

export function getStashedSalesRepCode(): string {
  try {
    return window.localStorage.getItem(STASH_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearStashedSalesRepCode() {
  try {
    window.localStorage.removeItem(STASH_KEY);
  } catch {
    // ignora
  }
}

/** Link de indicação do vendedor. */
export function salesRepSignupLink(code: string): string {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || "https://usepont.com.br";
  return `${String(base).replace(/\/$/, "")}/cadastro-empresa?${CODE_PARAM}=${encodeURIComponent(code)}`;
}
