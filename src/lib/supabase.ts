import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Integração futura: preencha as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
// Enquanto elas não existirem, o app usa o store local simulado em localStorage.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
