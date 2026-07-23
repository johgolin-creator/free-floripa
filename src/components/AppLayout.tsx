import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Cloud,
  Home,
  Search,
  Star,
  UserRound,
  UsersRound
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { RoleSwitcher } from "./RoleSwitcher";
import { useAppStore } from "../lib/store";
import { getCompanyProfileCompletion, getWorkerProfileCompletion } from "../lib/profileCompletion";

const workerLinks = [
  { to: "/app/trabalhador", label: "Início", icon: Home },
  { to: "/app/vagas", label: "Vagas", icon: Search },
  { to: "/app/candidaturas", label: "Candidaturas", icon: ClipboardList },
  { to: "/app/trabalhos", label: "Meus trabalhos", icon: CalendarCheck },
  { to: "/app/perfil-trabalhador", label: "Perfil", icon: UserRound }
];

const companyLinks = [
  { to: "/app/empresa", label: "Painel", icon: Home },
  { to: "/app/minhas-vagas", label: "Minhas vagas", icon: BriefcaseBusiness },
  { to: "/app/candidatos", label: "Candidatos", icon: UsersRound },
  { to: "/app/escala", label: "Escala", icon: CalendarDays },
  { to: "/app/equipe", label: "Minha equipe", icon: Star },
  { to: "/app/perfil-empresa", label: "Perfil", icon: Building2 }
];

export function AppLayout() {
  const { state, storageMode, syncStatus, syncError, currentWorker, currentCompany } = useAppStore();
  const location = useLocation();
  const links = state.activeRole === "trabalhador" ? workerLinks : companyLinks;
  const profilePath = state.activeRole === "trabalhador" ? "/app/perfil-trabalhador" : "/app/perfil-empresa";
  const completion =
    state.activeRole === "trabalhador"
      ? getWorkerProfileCompletion(currentWorker)
      : getCompanyProfileCompletion(currentCompany);
  const unread = state.notifications.filter((notification) => notification.role === state.activeRole && !notification.read).length;
  const syncLabel =
    storageMode === "local"
      ? "Local"
      : syncStatus === "erro"
        ? "Erro Supabase"
        : syncStatus === "carregando"
          ? "Carregando"
          : syncStatus === "salvando"
            ? "Salvando"
            : "Supabase";

  if (!completion.complete && location.pathname !== profilePath) {
    return <Navigate to={profilePath} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20 md:grid md:grid-cols-[260px_1fr] md:pb-0">
      <aside className="hidden border-r border-slate-200 bg-navy-950 p-5 text-white md:flex md:flex-col">
        <NavLink to="/" className="mb-7 flex items-center gap-3">
          <BrandLogo inverted />
        </NavLink>

        <RoleSwitcher />

        <nav className="mt-6 grid gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                    isActive ? "bg-white text-navy-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <NavLink to="/app/notificacoes" className="mt-auto rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
          <div className="flex items-center gap-2 text-aqua-300">
            <Bell size={18} />
            <strong>{unread} novas</strong>
          </div>
          <p className="mt-2 text-sm text-slate-300">Central interna de notificações pronta para push no futuro.</p>
        </NavLink>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2 md:hidden">
              <BrandLogo compact />
            </NavLink>
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase text-aqua-700">A equipe que você precisa, quando você precisa.</p>
              <h1 className="text-xl font-black text-navy-950">
                {state.activeRole === "trabalhador" ? "Área do trabalhador" : "Área da empresa"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`hidden min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-black md:inline-flex ${
                  syncStatus === "erro" ? "bg-red-50 text-alert" : storageMode === "supabase" ? "bg-aqua-100 text-aqua-700" : "bg-slate-100 text-slate-500"
                }`}
                title={syncError || (storageMode === "supabase" ? "Dados sincronizados no Supabase" : "Dados salvos apenas neste navegador")}
              >
                <Cloud size={16} /> {syncLabel}
              </span>
              <div className="w-52 max-w-full">
                <RoleSwitcher />
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-5 md:px-8">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid border-t border-slate-200 bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`grid min-h-16 place-items-center gap-1 px-0.5 text-center text-[0.62rem] font-bold ${
                active ? "text-aqua-700" : "text-slate-500"
              }`}
            >
              <Icon size={19} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
