import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Home,
  MessageCircle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { Modal } from "./Modal";
import { NotificationToast } from "./NotificationToast";
import { RoleSwitcher } from "./RoleSwitcher";
import { ReportBugButton } from "./ReportBugButton";
import { useAppStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { getCompanyProfileCompletion, getWorkerProfileCompletion } from "../lib/profileCompletion";
import { uploadProfileImage } from "../lib/supabaseStorage";

const MENSAGENS_LINK = { to: "/app/mensagens", label: "Mensagens", mobileLabel: "Chat", icon: MessageCircle };

const workerPrimaryLinks = [
  { to: "/app/trabalhador", label: "Início", mobileLabel: "Início", icon: Home },
  { to: "/app/vagas", label: "Vagas", mobileLabel: "Vagas", icon: Search },
  { to: "/app/candidaturas", label: "Candidaturas", mobileLabel: "Candid.", icon: ClipboardList },
  { to: "/app/trabalhos", label: "Meus trabalhos", mobileLabel: "Trabalhos", icon: CalendarCheck }
];

const workerSecondaryLinks = [
  MENSAGENS_LINK,
  { to: "/app/planos", label: "Planos", mobileLabel: "Planos", icon: CreditCard },
  { to: "/app/perfil-trabalhador", label: "Perfil", mobileLabel: "Perfil", icon: UserRound }
];

const companyPrimaryLinks = [
  { to: "/app/empresa", label: "Painel", mobileLabel: "Painel", icon: Home },
  { to: "/app/eventos", label: "Eventos", mobileLabel: "Eventos", icon: CalendarDays },
  { to: "/app/minhas-vagas", label: "Minhas vagas", mobileLabel: "Vagas", icon: BriefcaseBusiness },
  { to: "/app/candidatos", label: "Candidatos", mobileLabel: "Cand.", icon: UsersRound }
];

const companySecondaryLinks = [
  { to: "/app/profissionais", label: "Banco", mobileLabel: "Banco", icon: Search },
  { to: "/app/escala", label: "Escala", mobileLabel: "Escala", icon: CalendarDays },
  MENSAGENS_LINK,
  { to: "/app/planos", label: "Moedas", mobileLabel: "Moedas", icon: CreditCard },
  { to: "/app/equipe", label: "Minha equipe", mobileLabel: "Equipe", icon: Star },
  { to: "/app/perfil-empresa", label: "Perfil", mobileLabel: "Perfil", icon: Building2 }
];

export function AppLayout() {
  const { state, syncStatus, currentWorker, currentCompany, updateWorkerProfile, updateCompanyProfile } = useAppStore();
  const { isAdmin, isModerator } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreNav, setShowMoreNav] = useState(false);
  const syncStatusRef = useRef(syncStatus);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    const pendingAvatarFile = (location.state as { pendingAvatarFile?: File } | null)?.pendingAvatarFile;
    if (!pendingAvatarFile) return;

    let cancelled = false;
    const role = state.activeRole;

    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    (async () => {
      // Signing up just changed the logged-in user, which makes the store
      // reload its remote state. If that reload finishes after this upload,
      // it overwrites the new photo. Wait for that reload to start and then
      // finish before saving it, so this write is the last one in.
      const startWaitUntil = Date.now() + 800;
      while (syncStatusRef.current !== "carregando" && Date.now() < startWaitUntil) {
        await sleep(50);
      }
      const clearWaitUntil = Date.now() + 8000;
      while (syncStatusRef.current === "carregando" && Date.now() < clearWaitUntil) {
        await sleep(150);
      }
      if (cancelled) return;

      try {
        const uploadedUrl = await uploadProfileImage(pendingAvatarFile, role === "trabalhador" ? "trabalhadores" : "empresas");
        if (cancelled) return;
        if (role === "trabalhador") updateWorkerProfile({ avatarUrl: uploadedUrl });
        else updateCompanyProfile({ logoUrl: uploadedUrl });
      } catch {
        // Non-critical: the account already exists either way, and a photo
        // can be added later from the profile page.
      } finally {
        if (!cancelled) navigate(location.pathname, { replace: true, state: null });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const primaryLinks = state.activeRole === "trabalhador" ? workerPrimaryLinks : companyPrimaryLinks;
  const secondaryLinks = [
    ...(state.activeRole === "trabalhador" ? workerSecondaryLinks : companySecondaryLinks),
    ...(isAdmin || isModerator ? [{ to: "/app/admin", label: "Admin", mobileLabel: "Admin", icon: ShieldCheck }] : [])
  ];
  const mobilePrimaryLinks = [...primaryLinks, MENSAGENS_LINK];
  const mobileMoreLinks = secondaryLinks.filter((link) => link.to !== MENSAGENS_LINK.to);
  const profilePath = state.activeRole === "trabalhador" ? "/app/perfil-trabalhador" : "/app/perfil-empresa";
  const dashboardPath = state.activeRole === "trabalhador" ? "/app/trabalhador" : "/app/empresa";
  const completion =
    state.activeRole === "trabalhador"
      ? getWorkerProfileCompletion(currentWorker)
      : getCompanyProfileCompletion(currentCompany);
  const unread = state.notifications.filter((notification) => notification.role === state.activeRole && !notification.read).length;
  const areaLabel = state.activeRole === "trabalhador" ? "Área do trabalhador" : "Área da empresa";
  const identityName = state.activeRole === "trabalhador" ? currentWorker.name : currentCompany.establishmentName;
  const coinBalance =
    state.activeRole === "trabalhador"
      ? state.subscription.creditsRemaining
      : state.subscription.companyCreditsRemaining;
  const coinLabel = state.activeRole === "trabalhador" ? "Moedas" : "Moedas da empresa";
  const coinHelp =
    state.activeRole === "trabalhador"
      ? "Cada candidatura enviada usa 1 moeda."
      : "Use moedas para ações empresariais, como cancelar vagas já preenchidas.";

  if (isModerator && (location.pathname === "/app/trabalhador" || location.pathname === "/app/empresa")) {
    return <Navigate to="/app/admin" replace />;
  }

  if (!isAdmin && !isModerator && !completion.complete && location.pathname !== profilePath) {
    return <Navigate to={profilePath} replace />;
  }

  return (
    <div className="app-shell min-h-screen bg-ice pb-20 md:grid md:grid-cols-[264px_1fr] md:pb-0">
      <NotificationToast />
      <aside className="app-sidebar hidden border-r border-white/10 p-4 text-white shadow-lift md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-y-auto">
        <NavLink to={dashboardPath} className="mb-5 flex items-center gap-3">
          <BrandLogo inverted />
        </NavLink>

        <nav className="grid gap-1.5">
          {primaryLinks.map((link) => {
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

          <p className="mb-0.5 mt-3 px-2.5 text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Mais</p>
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-xs font-bold transition duration-200 ${
                    isActive ? "bg-white text-navy-950 shadow-glow" : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={14} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <Link
          to="/app/planos"
          className="mt-4 rounded-lg border border-white/10 bg-white/10 p-3 text-white shadow-soft transition hover:bg-white/15"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-black text-aqua-300">
              <WalletCards size={16} /> {coinLabel}
            </span>
            <strong className="rounded-md bg-aqua-300 px-2.5 py-1 text-base font-black text-navy-950">{coinBalance}</strong>
          </div>
          <p className="mt-1.5 text-[0.7rem] font-semibold leading-4 text-slate-300">
            {coinHelp}
          </p>
        </Link>

        <NavLink
          to="/app/notificacoes"
          className={`mt-auto rounded-lg border p-3 shadow-soft transition ${
            unread > 0
              ? "border-alert/50 bg-alert/15 hover:bg-alert/20"
              : "border-white/10 bg-white/10 hover:bg-white/15"
          }`}
        >
          <div className={`flex items-center gap-2 text-sm ${unread > 0 ? "text-alert" : "text-aqua-300"}`}>
            <Bell size={16} />
            <strong>{unread} novas</strong>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-300">Central de avisos para convites, vagas e avaliações.</p>
        </NavLink>
        {isModerator && (
          <div className="mt-4">
            <ReportBugButton />
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-black text-slate-400">
          <Link to="/termos" className="hover:text-aqua-300">Termos</Link>
          <Link to="/privacidade" className="hover:text-aqua-300">Privacidade</Link>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="app-mobile-header sticky top-0 z-20 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <NavLink to={dashboardPath} className="min-w-0">
              <BrandLogo compact inverted />
            </NavLink>
            <div className="hidden">
              <p className="text-xs font-bold uppercase text-aqua-700">Conecta. Oportunidades. Talentos.</p>
              <h1 className="text-xl font-black text-white">{identityName || areaLabel}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/app/planos"
                className="app-mobile-coin"
                title={coinLabel}
              >
                <WalletCards size={15} />
                <strong>{coinBalance}</strong>
              </Link>
              <NavLink
                to="/app/notificacoes"
                className={`app-mobile-bell ${unread > 0 ? "has-unread" : ""}`}
                aria-label="Notificações"
              >
                <Bell size={20} />
                {unread > 0 && <span>{unread}</span>}
              </NavLink>
              {isModerator && <ReportBugButton compact />}
              <div className="hidden">
                <RoleSwitcher compact />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold text-aqua-300">
              Olá, {identityName?.split(" ")[0] || (state.activeRole === "trabalhador" ? "profissional" : "empresa")}!
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-white">{areaLabel}</h1>
          </div>
          <Link to={state.activeRole === "trabalhador" ? "/app/vagas" : "/app/candidatos"} className="app-mobile-search">
            <span>{state.activeRole === "trabalhador" ? "Buscar vagas, locais ou empresas" : "Buscar profissionais e candidatos"}</span>
            <Search size={18} />
          </Link>
        </header>

        <header className="hidden border-b border-white/10 bg-brand-charcoal/90 px-4 py-2 shadow-sm backdrop-blur-xl md:sticky md:top-0 md:z-20 md:block md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-aqua-700">Conecta. Oportunidades. Talentos.</p>
              <h1 className="text-xl font-black text-white">{identityName || areaLabel}</h1>
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
              <NavLink
                to="/app/notificacoes"
                className={`app-header-bell ${unread > 0 ? "has-unread" : ""}`}
                aria-label="Notificações"
              >
                <Bell size={18} />
                {unread > 0 && <span className="app-header-bell-badge">{unread}</span>}
              </NavLink>
              <div className="max-w-full">
                <RoleSwitcher compact />
              </div>
            </div>
          </div>
        </header>

        <div className="app-content mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>

      <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-30 grid grid-cols-6 gap-1 border-t border-white/10 bg-brand-charcoal/95 px-2 py-1 shadow-lift backdrop-blur-xl md:hidden">
        {mobilePrimaryLinks.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`grid min-h-14 place-items-center gap-0.5 rounded-lg px-1 text-center text-[0.65rem] font-black leading-tight transition ${
                active ? "text-white" : "text-slate-500"
              }`}
            >
              <span className={`mobile-nav-icon ${active ? "is-active" : ""}`}>
                <Icon size={16} />
              </span>
              <span className="w-full truncate px-0.5">{link.mobileLabel}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setShowMoreNav(true)}
          className="grid min-h-14 place-items-center gap-0.5 rounded-lg px-1 text-center text-[0.65rem] font-black leading-tight text-slate-500 transition"
        >
          <span className="mobile-nav-icon">
            <MoreHorizontal size={16} />
          </span>
          <span className="w-full truncate px-0.5">Mais</span>
        </button>
      </nav>

      {showMoreNav && (
        <Modal title="Mais opções" onClose={() => setShowMoreNav(false)}>
          <div className="grid gap-1.5">
            {mobileMoreLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setShowMoreNav(false)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  <Icon size={18} /> {link.label}
                </NavLink>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
