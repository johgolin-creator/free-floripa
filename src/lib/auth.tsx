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

interface ResetPasswordInput {
  email: string;
}

interface UpdatePasswordInput {
  password: string;
}

interface AuthContextValue {
  authEnabled: boolean;
  loading: boolean;
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  dbRoleLoading: boolean;
  email: string;
  sessionError: string | null;
  signIn: (input: SignInInput) => Promise<{ role: UserRole }>;
  signUp: (input: SignUpInput) => Promise<{ role: UserRole; needsEmailConfirmation: boolean }>;
  resetPassword: (input: ResetPasswordInput) => Promise<void>;
  updatePassword: (input: UpdatePasswordInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEFAULT_PUBLIC_APP_URL = "https://usepont.com.br";
const DEFAULT_ADMIN_EMAILS = ["jonathan.f@gmail.com"];

function getAuthRedirectUrl(pathname = "/login") {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  const browserOrigin = window.location.origin;
  const isLocalOrigin = browserOrigin.includes("localhost") || browserOrigin.includes("127.0.0.1");
  const baseUrl = configuredUrl || (isLocalOrigin ? DEFAULT_PUBLIC_APP_URL : browserOrigin);

  return `${baseUrl.replace(/\/$/, "")}${pathname}`;
}

function getUserRole(user: User | null): UserRole | null {
  const role = user?.user_metadata?.role;
  return role === "empresa" ? "empresa" : role === "trabalhador" ? "trabalhador" : null;
}

function getAdminEmails() {
  const configured = String(import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ADMIN_EMAILS;
}

function getIsAdmin(user: User | null) {
  if (!supabase) return true;
  if (!user) return false;
  const email = user.email?.toLowerCase();
  return Boolean(user.user_metadata?.admin) || Boolean(email && getAdminEmails().includes(email));
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
    return "A senha precisa atender aos requisitos de segurança.";
  }
  return message || "Não foi possível concluir a autenticação.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [dbRoleLoading, setDbRoleLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the session itself to resolve first. Otherwise, on the very
    // first render (session still null while it loads), userId is
    // undefined, this effect saw "no user" and flipped dbRoleLoading to
    // false immediately - before the real session (and its real userId)
    // ever had a chance to load. AdminRoute would then read that false
    // dbRoleLoading on the exact render where `loading` just turned false,
    // see isAdmin/isModerator still false (dbRole hadn't been fetched yet),
    // and bounce an admin whose access comes from dbRole away from any
    // /app/admin/* deep link before this effect got to re-run for real.
    if (loading) return;

    const userId = session?.user?.id;
    if (!supabase || !userId) {
      setDbRole(null);
      setDbRoleLoading(false);
      return;
    }

    let active = true;
    setDbRoleLoading(true);
    const authClient = supabase;
    authClient
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setDbRole((data as { role?: string } | null)?.role ?? null);
        setDbRoleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loading, session?.user?.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const authClient = supabase;

    async function loadSession() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await authClient.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
        return data.session;
      }

      const { data, error } = await authClient.auth.getSession();
      if (error) throw error;
      return data.session;
    }

    setSessionError(null);
    loadSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Falha ao validar sessão/link de acesso:", error);
        setSessionError("O link é inválido ou expirou. Solicite um novo.");
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
      isAdmin: getIsAdmin(user) || dbRole === "admin",
      isModerator: !supabase || dbRole === "moderador",
      dbRoleLoading,
      email: user?.email ?? "",
      sessionError,
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
      async resetPassword({ email }) {
        if (!supabase) {
          throw new Error("Recuperação por e-mail disponível apenas no ambiente online.");
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl("/recuperar-senha")
        });
        if (error) throw new Error(getAuthErrorMessage(error.message));
      },
      async updatePassword({ password }) {
        if (!supabase) {
          throw new Error("Alteração de senha disponível apenas no ambiente online.");
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(getAuthErrorMessage(error.message));
      },
      async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(getAuthErrorMessage(error.message));
      }
    };
  }, [loading, session, dbRole, dbRoleLoading, sessionError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
