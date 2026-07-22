import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar a persistência no Supabase.
// Sem essas variáveis, o app continua usando localStorage como fallback.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
