import { supabase } from "./supabase";
import { onlyDigits } from "./validation";

/**
 * True when the phone number already belongs to another account (including a
 * signup that has not confirmed its e-mail yet). Backed by the
 * public.phone_in_use RPC in supabase/unique_phone.sql, which excludes the
 * caller's own account when authenticated.
 *
 * A failed check returns false on purpose: the unique index on
 * public.users is the hard backstop, so a transient RPC error should not
 * block a legitimate signup.
 */
export async function isPhoneTaken(phone: string): Promise<boolean> {
  if (!supabase) return false;
  const digits = onlyDigits(phone);
  if (digits.length < 10) return false;

  const { data, error } = await supabase.rpc("phone_in_use", { phone_digits: digits });
  if (error) return false;
  return Boolean(data);
}
