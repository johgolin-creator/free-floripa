import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Cloud,
  CreditCard,
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
  { to: "/app/trabalhador", label: "Início", mobileLabel: "Início", icon: Home },
  { to: "/app/vagas", label: "Vagas", mobileLabel: "Vagas", icon: Search },
  { to: "/app/candidaturas", label: "Candidaturas", mobileLabel: "Candid.", icon: ClipboardList },
  { to: "/app/trabalhos", label: "Meus trabalhos", mobileLabel: "Trabalhos", icon: CalendarCheck },
  { to: "/app/planos", label: "Planos", mobileLabel: "Planos", icon: CreditCard },
  { to: "/app/perfil-trabalhador", label: "Perfil", mobileLabel: "Perfil", icon: UserRound }
];

const companyLinks = [
  { to: "/app/empresa", label: "Painel", mobileLabel: "Painel", icon: Home },
  { to: "/app/minhas-vagas", label: "Minhas vagas", mobileLabel: "Vagas", icon: BriefcaseBusiness },
  { to: "/app/profissionais", label: "Banco", mobileLabel: "Banco", icon: Search },
  { to: "/app/candidatos", label: "Candidatos", mobileLabel: "Cand.", icon: UsersRound },
  { to: "/app/escala", label: "Escala", mobileLabel: "Escala", icon: CalendarDays },
  { to: "/app/equipe", label: "Minha equipe", mobileLabel: "Equipe", icon: Star },
  { to: "/app/perfil-empresa", label: "Perfil", mobileLabel: "Perfil", icon: Building2 }
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
  const areaLabel = state.activeRole === "trabalhador" ? "Área do trabalhador" : "Área da empresa";
  const identityName = state.activeRole === "trabalhador" ? currentWorker.name : currentCompany.establishmentName;

  if (!completion.complete && location.pathname !== profilePath) {
    return <Navigate to={profilePath} replace />;
  }

  return (
    <div className="min-h-screen bg-ice pb-20 md:grid md:grid-cols-[280px_1fr] md:pb-0">
      <aside className="app-sidebar hidden border-r border-white/10 p-5 text-white shadow-lift md:flex md:flex-col">
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
                  `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-black transition duration-200 ${
                    isActive ? "bg-white text-navy-950 shadow-glow" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <NavLink to="/app/notificacoes" className="mt-auto rounded-lg border border-white/10 bg-white/10 p-4 shadow-soft transition hover:bg-white/15">
          <div className="flex items-center gap-2 text-aqua-300">
            <Bell size={18} />
            <strong>{unread} novas</strong>
          </div>
          <p className="mt-2 text-sm text-slate-300">Central interna de notificações pronta para push no futuro.</p>
        </NavLink>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2 md:hidden">
              <BrandLogo compact />
            </NavLink>
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase text-aqua-700">A equipe que você precisa, quando você precisa.</p>
              <h1 className="text-xl font-black text-navy-950">{identityName || areaLabel}</h1>
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

        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid border-t border-white/80 bg-white/95 shadow-lift backdrop-blur-xl md:hidden"
        style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
      >
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`grid min-h-16 place-items-center gap-1 border-t-2 px-0.5 text-center text-[0.62rem] font-black leading-tight transition ${
                active ? "border-aqua-500 text-aqua-700" : "border-transparent text-slate-500"
              }`}
            >
              <span className={`mobile-nav-icon ${active ? "bg-aqua-50" : "bg-transparent"}`}>
                <Icon size={18} />
              </span>
              <span className="w-full truncate px-0.5">{link.mobileLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
