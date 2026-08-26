import { supabase } from "./supabase";
import type { UserRole } from "./types";

export interface CoinAccount {
  balance: number;
  unlockedJobIds: string[];
  plusActiveUntil?: string;
}

export interface CoinTransaction {
  id: string;
  kind: "purchase" | "spend" | "bonus" | "refund" | "admin_adjustment";
  reason: string;
  amount: number;
  balanceAfter: number;
  jobId?: string;
  applicationId?: string;
  createdAt: string;
}

interface CoinWalletRow {
  user_id: string;
  balance: number | string | null;
  plus_active_until?: string | null;
}

interface UnlockedJobRow {
  job_id: string;
}

interface CoinTransactionRow {
  id: string;
  kind: CoinTransaction["kind"];
  reason: string;
  amount: number | string;
  balance_after: number | string;
  job_id?: string | null;
  application_id?: string | null;
  created_at: string;
}

export const supabaseCoinsEnabled = Boolean(supabase);

function mapWallet(data: unknown): CoinWalletRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  return row as CoinWalletRow;
}

function toBalance(row: CoinWalletRow | null) {
  const value = Number(row?.balance ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function toPlusActiveUntil(row: CoinWalletRow | null): string | undefined {
  if (!row?.plus_active_until) return undefined;
  return new Date(row.plus_active_until) > new Date() ? row.plus_active_until : undefined;
}

async function ensureWallet(userId: string, role: UserRole) {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("ensure_coin_wallet", { target_user_id: userId, target_role: role });
  if (error) throw new Error(error.message);

  return mapWallet(data);
}

async function loadUnlockedJobIds(userId: string) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("coin_unlocked_jobs")
    .select("job_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as UnlockedJobRow[]).map((row) => row.job_id);
}

export async function loadRemoteCoinAccount(userId: string, role: UserRole): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const [wallet, unlockedJobIds] = await Promise.all([ensureWallet(userId, role), loadUnlockedJobIds(userId)]);

  return {
    balance: toBalance(wallet),
    unlockedJobIds,
    plusActiveUntil: toPlusActiveUntil(wallet)
  };
}

export async function loadRemoteWalletBalance(userId: string, role: UserRole): Promise<number> {
  if (!supabase) return 0;

  const wallet = await ensureWallet(userId, role);
  return toBalance(wallet);
}

export async function loadRemoteCoinTransactions(userId: string, limit = 20): Promise<CoinTransaction[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("id,kind,reason,amount,balance_after,job_id,application_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as CoinTransactionRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    reason: row.reason,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    jobId: row.job_id ?? undefined,
    applicationId: row.application_id ?? undefined,
    createdAt: row.created_at
  }));
}

export async function grantRemoteCoins(
  userId: string,
  role: UserRole,
  amount: number,
  reason: string
): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("add_coin_transaction", {
    target_user_id: userId,
    coin_delta: amount,
    tx_kind: "purchase",
    tx_reason: reason,
    target_job_id: null,
    target_application_id: null,
    tx_metadata: {},
    target_role: role
  });

  if (error) throw new Error(error.message);

  const wallet = mapWallet(data);
  return {
    balance: toBalance(wallet),
    unlockedJobIds: await loadUnlockedJobIds(userId),
    plusActiveUntil: toPlusActiveUntil(wallet)
  };
}

export async function activateUnlimitedPlan(
  userId: string,
  role: UserRole,
  days = 30
): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("activate_unlimited_plan", {
    target_user_id: userId,
    target_role: role,
    days
  });

  if (error) throw new Error(error.message);

  const wallet = mapWallet(data);
  return {
    balance: toBalance(wallet),
    unlockedJobIds: await loadUnlockedJobIds(userId),
    plusActiveUntil: toPlusActiveUntil(wallet)
  };
}

