import { Building2, UserRound } from "lucide-react";
import { useAppStore } from "../lib/store";

export function RoleSwitcher() {
  const { state, setRole } = useAppStore();

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
