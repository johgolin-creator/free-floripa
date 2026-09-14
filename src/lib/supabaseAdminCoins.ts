import { supabase } from "./supabase";
import type { UserRole } from "./types";

export const adminCoinsEnabled = Boolean(supabase);

export interface AdminCoinOverview {
  totalBalance: number;
  workerBalance: number;
  companyBalance: number;
  walletCount: number;
  fundedWalletCount: number;
  workerPlusActiveCount: number;
  companyPlusActiveCount: number;
}

interface AdminCoinOverviewRow {
  total_balance: number | string;
  worker_balance: number | string;
  company_balance: number | string;
  wallet_count: number | string;
  funded_wallet_count: number | string;
  worker_plus_active_count: number | string;
  company_plus_active_count: number | string;
}

/** Support-only: contagem geral de moedas de todas as carteiras do app. */
export async function loadAdminCoinOverview(): Promise<AdminCoinOverview | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_coin_overview");
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as AdminCoinOverviewRow[])[0];
  if (!row) return null;
  return {
    totalBalance: Number(row.total_balance),
    workerBalance: Number(row.worker_balance),
    companyBalance: Number(row.company_balance),
    walletCount: Number(row.wallet_count),
    fundedWalletCount: Number(row.funded_wallet_count),
    workerPlusActiveCount: Number(row.worker_plus_active_count),
    companyPlusActiveCount: Number(row.company_plus_active_count)
  };
}

/** Support-only: credit (or debit) a wallet found by account e-mail. */
export async function adminAdjustCoins(email: string, role: UserRole, amount: number, reason: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.rpc("admin_adjust_coins", {
    target_email: email.trim(),
    target_role: role,
    coin_delta: Math.trunc(amount),
    tx_reason: reason.trim() || "Ajuste manual do suporte"
  });
  if (error) throw new Error(error.message);
}

/** Support-only: extend the unlimited (Plus) window for an account. */
export async function adminActivatePlus(email: string, role: UserRole, days: number): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.rpc("admin_activate_plus", {
    target_email: email.trim(),
    target_role: role,
    days: Math.trunc(days)
  });
  if (error) throw new Error(error.message);
}
