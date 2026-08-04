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
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { RoleSwitcher } from "./RoleSwitcher";
import { useAppStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { getCompanyProfileCompletion, getWorkerProfileCompletion } from "../lib/profileCompletion";

const workerLinks = [
  { to: "/app/trabalhador", label: "Início", mobileLabel: "Início", icon: Home },
  { to: "/app/vagas", label: "Vagas", mobileLabel: "Vagas", icon: Search },
  { to: "/app/candidaturas", label: "Candidaturas", mobileLabel: "Candid.", icon: ClipboardList },
  { to: "/app/trabalhos", label: "Meus trabalhos", mobileLabel: "Trabalhos", icon: CalendarCheck },
  { to: "/app/mensagens", label: "Mensagens", mobileLabel: "Chat", icon: MessageCircle },
  { to: "/app/financeiro", label: "Financeiro", mobileLabel: "R$", icon: WalletCards },
  { to: "/app/planos", label: "Planos", mobileLabel: "Planos", icon: CreditCard },
  { to: "/app/perfil-trabalhador", label: "Perfil", mobileLabel: "Perfil", icon: UserRound }
];

const companyLinks = [
  { to: "/app/empresa", label: "Painel", mobileLabel: "Painel", icon: Home },
  { to: "/app/eventos", label: "Eventos", mobileLabel: "Eventos", icon: CalendarDays },
  { to: "/app/minhas-vagas", label: "Minhas vagas", mobileLabel: "Vagas", icon: BriefcaseBusiness },
  { to: "/app/profissionais", label: "Banco", mobileLabel: "Banco", icon: Search },
  { to: "/app/candidatos", label: "Candidatos", mobileLabel: "Cand.", icon: UsersRound },
  { to: "/app/escala", label: "Escala", mobileLabel: "Escala", icon: CalendarDays },
  { to: "/app/mensagens", label: "Mensagens", mobileLabel: "Chat", icon: MessageCircle },
  { to: "/app/financeiro", label: "Financeiro", mobileLabel: "R$", icon: WalletCards },
  { to: "/app/planos", label: "Moedas", mobileLabel: "Moedas", icon: CreditCard },
  { to: "/app/equipe", label: "Minha equipe", mobileLabel: "Equipe", icon: Star },
  { to: "/app/perfil-empresa", label: "Perfil", mobileLabel: "Perfil", icon: Building2 }
];

export function AppLayout() {
  const { state, storageMode, syncStatus, syncError, currentWorker, currentCompany } = useAppStore();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const links = [
    ...(state.activeRole === "trabalhador" ? workerLinks : companyLinks),
    ...(isAdmin ? [{ to: "/app/admin", label: "Admin", mobileLabel: "Admin", icon: ShieldCheck }] : [])
  ];
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
        ? "Falha ao salvar"
        : syncStatus === "carregando"
          ? "Carregando"
          : syncStatus === "salvando"
            ? "Salvando"
            : "Sincronizado";
  const areaLabel = state.activeRole === "trabalhador" ? "Área do trabalhador" : "Área da empresa";
  const identityName = state.activeRole === "trabalhador" ? currentWorker.name : currentCompany.establishmentName;
  const coinBalance =
    state.activeRole === "trabalhador"
      ? state.subscription.creditsRemaining
      : state.subscription.companyCreditsRemaining;
  const coinLabel = state.activeRole === "trabalhador" ? "Moedas" : "Moedas da empresa";
  const coinHelp =
    state.activeRole === "trabalhador"
      ? "Use moedas para liberar vagas completas e enviar candidaturas."
      : "Use moedas para ações empresariais, como cancelar vagas já preenchidas.";

  if (!completion.complete && location.pathname !== profilePath && !(isAdmin && location.pathname.startsWith("/app/admin"))) {
    return <Navigate to={profilePath} replace />;
  }

  return (
    <div className="min-h-screen bg-ice pb-16 md:grid md:grid-cols-[264px_1fr] md:pb-0">
      <aside className="app-sidebar hidden border-r border-white/10 p-4 text-white shadow-lift md:flex md:flex-col">
        <NavLink to="/" className="mb-5 flex items-center gap-3">
          <BrandLogo inverted />
        </NavLink>

        <RoleSwitcher />

        <Link
          to="/app/planos"
          className="mt-3 rounded-lg border border-aqua-300/25 bg-aqua-300/10 p-3 text-white shadow-soft transition hover:bg-aqua-300/15"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-black text-aqua-200">
              <WalletCards size={16} /> {coinLabel}
            </span>
            <strong className="rounded-md bg-aqua-300 px-2.5 py-1 text-base font-black text-navy-950">{coinBalance}</strong>
          </div>
          <p className="mt-1.5 text-[0.7rem] font-semibold leading-4 text-slate-300">
            {coinHelp}
          </p>
        </Link>

        <nav className="mt-4 grid gap-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-xs font-black transition duration-200 ${
                    isActive ? "bg-white text-navy-950 shadow-glow" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={16} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <NavLink to="/app/notificacoes" className="mt-auto rounded-lg border border-white/10 bg-white/10 p-3 shadow-soft transition hover:bg-white/15">
          <div className="flex items-center gap-2 text-sm text-aqua-300">
            <Bell size={16} />
            <strong>{unread} novas</strong>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-300">Central de avisos para convites, vagas e avaliações.</p>
        </NavLink>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-black text-slate-400">
          <Link to="/termos" className="hover:text-aqua-200">Termos</Link>
          <Link to="/privacidade" className="hover:text-aqua-200">Privacidade</Link>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="border-b border-white/80 bg-white/85 px-4 py-2 shadow-sm backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2 md:hidden">
              <BrandLogo compact />
            </NavLink>
            <div className="hidden md:block">
              <p className="text-xs font-bold uppercase text-aqua-700">A equipe que você precisa, quando você precisa.</p>
              <h1 className="text-xl font-black text-navy-950">{identityName || areaLabel}</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Link
                to="/app/planos"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-aqua-200 bg-aqua-50 px-3 text-xs font-black text-aqua-800 shadow-soft transition hover:border-aqua-300 hover:bg-aqua-100"
                title={coinLabel}
              >
                <WalletCards size={16} />
                <span className="hidden sm:inline">{state.activeRole === "trabalhador" ? "Moedas:" : "Empresa:"}</span>
                <strong className="text-sm">{coinBalance}</strong>
              </Link>
              <span
                className={`hidden min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-black md:inline-flex ${
                  syncStatus === "erro" ? "bg-red-50 text-alert" : storageMode === "supabase" ? "bg-aqua-100 text-aqua-700" : "bg-slate-100 text-slate-500"
                }`}
                title={syncError || (storageMode === "supabase" ? "Dados sincronizados com segurança" : "Dados salvos apenas neste aparelho")}
              >
                <Cloud size={16} /> {syncLabel}
              </span>
              <div className="max-w-full">
                <RoleSwitcher compact />
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex gap-1 overflow-x-auto border-t border-white/80 bg-white/95 px-2 py-1 shadow-lift backdrop-blur-xl md:hidden">
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`grid min-h-14 min-w-[4.15rem] flex-1 place-items-center gap-0.5 rounded-lg border-t-2 px-1 text-center text-[0.58rem] font-black leading-tight transition ${
                active ? "border-aqua-500 text-aqua-700" : "border-transparent text-slate-500"
              }`}
            >
              <span className={`mobile-nav-icon ${active ? "bg-aqua-50" : "bg-transparent"}`}>
                <Icon size={16} />
              </span>
              <span className="w-full truncate px-0.5">{link.mobileLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
