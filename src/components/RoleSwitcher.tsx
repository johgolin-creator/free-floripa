import { Building2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";

export function RoleSwitcher() {
  const { state, setRole } = useAppStore();
  const { authEnabled, email, signOut } = useAuth();
  const navigate = useNavigate();

  if (authEnabled) {
    const Icon = state.activeRole === "empresa" ? Building2 : UserRound;
    return (
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-navy-950 px-3 py-2 text-white">
          <Icon size={17} className="shrink-0" />
          <div className="min-w-0">
            <strong className="block text-sm">{state.activeRole === "empresa" ? "Empresa" : "Trabalhador"}</strong>
            {email && <span className="block truncate text-xs text-slate-300">{email}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="secondary min-h-10"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() => setRole("trabalhador")}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-bold ${
          state.activeRole === "trabalhador" ? "bg-navy-950 text-white" : "text-slate-600"
        }`}
      >
        <UserRound size={17} />
        Trabalhador
      </button>
      <button
        type="button"
        onClick={() => setRole("empresa")}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-bold ${
          state.activeRole === "empresa" ? "bg-navy-950 text-white" : "text-slate-600"
        }`}
      >
        <Building2 size={17} />
        Empresa
      </button>
    </div>
  );
}
