import { createClient } from "@supabase/supabase-js";
import { capacitorAuthStorage } from "./authStorage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar a persistência no Supabase.
// Sem essas variáveis, o app continua usando localStorage como fallback.
// A sessão é salva via @capacitor/preferences (SharedPreferences nativo no Android) em vez do
// localStorage do WebView, que pode ser limpo pelo sistema operacional em segundo plano e
// deslogava o usuário sempre que o app era fechado.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: capacitorAuthStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;
