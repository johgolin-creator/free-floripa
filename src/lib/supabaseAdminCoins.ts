import { supabase } from "./supabase";
import type { UserRole } from "./types";

export const adminCoinsEnabled = Boolean(supabase);

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
