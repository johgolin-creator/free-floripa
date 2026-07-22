import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { UserRole } from "./types";

interface SignInInput {
  email: string;
  password: string;
  fallbackRole: UserRole;
}

interface SignUpInput extends SignInInput {
  metadata: Record<string, unknown>;
}

interface AuthContextValue {
  authEnabled: boolean;
  loading: boolean;
  user: User | null;
  role: UserRole | null;
  email: string;
  signIn: (input: SignInInput) => Promise<{ role: UserRole }>;
  signUp: (input: SignUpInput) => Promise<{ role: UserRole; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEFAULT_PUBLIC_APP_URL = "https://free-floripa.onrender.com";

function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  const browserOrigin = window.location.origin;
  const isLocalOrigin = browserOrigin.includes("localhost") || browserOrigin.includes("127.0.0.1");
  const baseUrl = configuredUrl || (isLocalOrigin ? DEFAULT_PUBLIC_APP_URL : browserOrigin);

  return `${baseUrl.replace(/\/$/, "")}/login`;
}

function getUserRole(user: User | null): UserRole | null {
  const role = user?.user_metadata?.role;
  return role === "empresa" ? "empresa" : role === "trabalhador" ? "trabalhador" : null;
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Este e-mail já está cadastrado. Use o login.";
  }
  if (normalized.includes("password")) {
    return "A senha precisa atender aos requisitos de segurança do Supabase.";
  }
  return message || "Não foi possível concluir a autenticação.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error) setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const role = getUserRole(user);

    return {
      authEnabled: Boolean(supabase),
      loading,
      user,
      role,
      email: user?.email ?? "",
      async signIn({ email, password, fallbackRole }) {
        if (!supabase) return { role: fallbackRole };

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(getAuthErrorMessage(error.message));

        const userRole = getUserRole(data.user) ?? fallbackRole;
        if (!getUserRole(data.user)) {
          await supabase.auth.updateUser({ data: { role: userRole } });
        }

        return { role: userRole };
      },
      async signUp({ email, password, fallbackRole, metadata }) {
        if (!supabase) return { role: fallbackRole, needsEmailConfirmation: false };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              ...metadata,
              role: fallbackRole
            },
            emailRedirectTo: getAuthRedirectUrl()
          }
        });
        if (error) throw new Error(getAuthErrorMessage(error.message));

        return { role: getUserRole(data.user) ?? fallbackRole, needsEmailConfirmation: !data.session };
      },
      async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(getAuthErrorMessage(error.message));
      }
    };
  }, [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
