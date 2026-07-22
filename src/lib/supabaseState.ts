import { supabase } from "./supabase";
import type { AppState } from "./types";

const STATE_KEY = import.meta.env.VITE_SUPABASE_STATE_KEY || "free-floripa-demo";

export const supabaseStateEnabled = Boolean(supabase);

export async function loadSupabaseState() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_state_snapshots")
    .select("payload")
    .eq("state_key", STATE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.payload ? (data.payload as AppState) : null;
}

export async function saveSupabaseState(state: AppState) {
  if (!supabase) return;

  const { error } = await supabase.from("app_state_snapshots").upsert(
    {
      state_key: STATE_KEY,
      payload: state,
      updated_at: new Date().toISOString()
    },
    { onConflict: "state_key" }
  );

  if (error) {
    throw new Error(error.message);
  }
}
