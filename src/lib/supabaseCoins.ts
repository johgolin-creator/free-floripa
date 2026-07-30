import { supabase } from "./supabase";

export interface CoinAccount {
  balance: number;
  unlockedJobIds: string[];
}

interface ApplyWithCoinRow {
  wallet_balance?: number | string | null;
}

interface CoinWalletRow {
  user_id: string;
  balance: number | string | null;
}

interface UnlockedJobRow {
  job_id: string;
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

async function ensureWallet(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("ensure_coin_wallet", { target_user_id: userId });
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

export async function loadRemoteCoinAccount(userId: string): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const [wallet, unlockedJobIds] = await Promise.all([ensureWallet(userId), loadUnlockedJobIds(userId)]);

  return {
    balance: toBalance(wallet),
    unlockedJobIds
  };
}

export async function grantRemoteCoins(userId: string, amount: number, reason: string): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("add_coin_transaction", {
    target_user_id: userId,
    coin_delta: amount,
    tx_kind: "purchase",
    tx_reason: reason,
    target_job_id: null,
    target_application_id: null,
    tx_metadata: {}
  });

  if (error) throw new Error(error.message);

  return {
    balance: toBalance(mapWallet(data)),
    unlockedJobIds: await loadUnlockedJobIds(userId)
  };
}

export async function unlockRemoteJobWithCoin(userId: string, jobId: string): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("unlock_job_with_coin", { target_job_id: jobId });
  if (error) throw new Error(error.message);

  return {
    balance: toBalance(mapWallet(data)),
    unlockedJobIds: await loadUnlockedJobIds(userId)
  };
}

export async function spendRemoteCoinForApplication(
  userId: string,
  jobId: string,
  applicationId: string
): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("add_coin_transaction", {
    target_user_id: userId,
    coin_delta: -1,
    tx_kind: "spend",
    tx_reason: "apply_job",
    target_job_id: jobId,
    target_application_id: applicationId,
    tx_metadata: {}
  });

  if (error) throw new Error(error.message);

  return {
    balance: toBalance(mapWallet(data)),
    unlockedJobIds: await loadUnlockedJobIds(userId)
  };
}

export async function applyRemoteToJobWithCoin(
  userId: string,
  workerId: string,
  jobId: string,
  applicationId: string
): Promise<CoinAccount | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("apply_to_job_with_coin", {
    target_job_id: jobId,
    target_worker_id: workerId,
    target_application_id: applicationId
  });

  if (error) throw new Error(error.message);

  const row = (Array.isArray(data) ? data[0] : data) as ApplyWithCoinRow | null;
  const balance = Number(row?.wallet_balance ?? 0);

  return {
    balance: Number.isFinite(balance) ? balance : 0,
    unlockedJobIds: await loadUnlockedJobIds(userId)
  };
}
