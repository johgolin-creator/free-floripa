import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "./components/AppLayout";
import { useAuth } from "./lib/auth";
import { useAppStore } from "./lib/store";
import type { UserRole } from "./lib/types";

const PublicHome = lazy(() => import("./pages/PublicHome").then(({ PublicHome }) => ({ default: PublicHome })));
const LoginPage = lazy(() => import("./pages/AuthPages").then(({ LoginPage }) => ({ default: LoginPage })));
const ResetPasswordPage = lazy(() => import("./pages/AuthPages").then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })));
const WorkerSignupPage = lazy(() => import("./pages/AuthPages").then(({ WorkerSignupPage }) => ({ default: WorkerSignupPage })));
const CompanySignupPage = lazy(() => import("./pages/AuthPages").then(({ CompanySignupPage }) => ({ default: CompanySignupPage })));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard").then(({ WorkerDashboard }) => ({ default: WorkerDashboard })));
const JobsPage = lazy(() => import("./pages/JobsPage").then(({ JobsPage }) => ({ default: JobsPage })));
const JobDetailsPage = lazy(() => import("./pages/JobDetailsPage").then(({ JobDetailsPage }) => ({ default: JobDetailsPage })));
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage").then(({ ApplicationsPage }) => ({ default: ApplicationsPage })));
const MyJobsPage = lazy(() => import("./pages/MyJobsPage").then(({ MyJobsPage }) => ({ default: MyJobsPage })));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfilePage").then(({ WorkerProfilePage }) => ({ default: WorkerProfilePage })));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage").then(({ SubscriptionPage }) => ({ default: SubscriptionPage })));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard").then(({ CompanyDashboard }) => ({ default: CompanyDashboard })));
const CompanyJobsPage = lazy(() => import("./pages/CompanyJobsPage").then(({ CompanyJobsPage }) => ({ default: CompanyJobsPage })));
const CandidatesPage = lazy(() => import("./pages/CandidatesPage").then(({ CandidatesPage }) => ({ default: CandidatesPage })));
const CompanySchedulePage = lazy(() => import("./pages/CompanySchedulePage").then(({ CompanySchedulePage }) => ({ default: CompanySchedulePage })));
const CompanyEventsPage = lazy(() => import("./pages/CompanyEventsPage").then(({ CompanyEventsPage }) => ({ default: CompanyEventsPage })));
const ProfessionalBankPage = lazy(() => import("./pages/ProfessionalBankPage").then(({ ProfessionalBankPage }) => ({ default: ProfessionalBankPage })));
const TeamPage = lazy(() => import("./pages/TeamPage").then(({ TeamPage }) => ({ default: TeamPage })));
const CompanyProfilePage = lazy(() => import("./pages/CompanyProfilePage").then(({ CompanyProfilePage }) => ({ default: CompanyProfilePage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(({ NotificationsPage }) => ({ default: NotificationsPage })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then(({ MessagesPage }) => ({ default: MessagesPage })));
const FinancialPage = lazy(() => import("./pages/FinancialPage").then(({ FinancialPage }) => ({ default: FinancialPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(({ AdminPage }) => ({ default: AdminPage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then(({ LegalPage }) => ({ default: LegalPage })));

export default function App() {
  const { state, setRole } = useAppStore();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role && state.activeRole !== role) {
      setRole(role);
    }
  }, [role, setRole, state.activeRole, user]);

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<ResetPasswordPage />} />
        <Route path="/cadastro-trabalhador" element={<WorkerSignupPage />} />
        <Route path="/cadastro-empresa" element={<CompanySignupPage />} />
        <Route path="/termos" element={<LegalPage kind="terms" />} />
        <Route path="/privacidade" element={<LegalPage kind="privacy" />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to={state.activeRole === "empresa" ? "/app/empresa" : "/app/trabalhador"} replace />} />
          <Route path="trabalhador" element={<RoleRoute role="trabalhador"><WorkerDashboard /></RoleRoute>} />
          <Route path="vagas" element={<RoleRoute role="trabalhador"><JobsPage /></RoleRoute>} />
          <Route path="vagas/:id" element={<RoleRoute role="trabalhador"><JobDetailsPage /></RoleRoute>} />
          <Route path="candidaturas" element={<RoleRoute role="trabalhador"><ApplicationsPage /></RoleRoute>} />
          <Route path="trabalhos" element={<RoleRoute role="trabalhador"><MyJobsPage /></RoleRoute>} />
          <Route path="planos" element={<RoleRoute role="trabalhador"><SubscriptionPage /></RoleRoute>} />
          <Route path="perfil-trabalhador" element={<RoleRoute role="trabalhador"><WorkerProfilePage /></RoleRoute>} />
          <Route path="empresa" element={<RoleRoute role="empresa"><CompanyDashboard /></RoleRoute>} />
          <Route path="minhas-vagas" element={<RoleRoute role="empresa"><CompanyJobsPage /></RoleRoute>} />
          <Route path="eventos" element={<RoleRoute role="empresa"><CompanyEventsPage /></RoleRoute>} />
          <Route path="profissionais" element={<RoleRoute role="empresa"><ProfessionalBankPage /></RoleRoute>} />
          <Route path="candidatos" element={<RoleRoute role="empresa"><CandidatesPage /></RoleRoute>} />
          <Route path="escala" element={<RoleRoute role="empresa"><CompanySchedulePage /></RoleRoute>} />
          <Route path="equipe" element={<RoleRoute role="empresa"><TeamPage /></RoleRoute>} />
          <Route path="perfil-empresa" element={<RoleRoute role="empresa"><CompanyProfilePage /></RoleRoute>} />
          <Route path="mensagens" element={<MessagesPage />} />
          <Route path="financeiro" element={<FinancialPage />} />
          <Route path="notificacoes" element={<NotificationsPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function PageLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-ice px-4 text-center">
      <div className="card max-w-sm p-5">
        <strong className="text-lg text-navy-950">Carregando</strong>
        <p className="mt-2 text-sm text-slate-600">Abrindo esta área do Free Floripa.</p>
      </div>
    </div>
  );
}

function RoleRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { state } = useAppStore();
  if (state.activeRole !== role) {
    return <Navigate to={state.activeRole === "empresa" ? "/app/empresa" : "/app/trabalhador"} replace />;
  }

  return children;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authEnabled, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center">
        <div className="card max-w-md p-5">
          <strong className="text-lg text-navy-950">Carregando sua conta</strong>
          <p className="mt-2 text-sm text-slate-600">Estamos verificando sua sessão no Free Floripa.</p>
        </div>
      </div>
    );
  }

  if (authEnabled && !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { authEnabled, isAdmin } = useAuth();

  if (authEnabled && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
