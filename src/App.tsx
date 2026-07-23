import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppLayout } from "./components/AppLayout";
import { PublicHome } from "./pages/PublicHome";
import { LoginPage, WorkerSignupPage, CompanySignupPage } from "./pages/AuthPages";
import { WorkerDashboard } from "./pages/WorkerDashboard";
import { JobsPage } from "./pages/JobsPage";
import { JobDetailsPage } from "./pages/JobDetailsPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { MyJobsPage } from "./pages/MyJobsPage";
import { WorkerProfilePage } from "./pages/WorkerProfilePage";
import { CompanyDashboard } from "./pages/CompanyDashboard";
import { CompanyJobsPage } from "./pages/CompanyJobsPage";
import { CandidatesPage } from "./pages/CandidatesPage";
import { CompanySchedulePage } from "./pages/CompanySchedulePage";
import { TeamPage } from "./pages/TeamPage";
import { CompanyProfilePage } from "./pages/CompanyProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { useAuth } from "./lib/auth";
import { useAppStore } from "./lib/store";
import type { UserRole } from "./lib/types";

export default function App() {
  const { state, setRole } = useAppStore();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role && state.activeRole !== role) {
      setRole(role);
    }
  }, [role, setRole, state.activeRole, user]);

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro-trabalhador" element={<WorkerSignupPage />} />
      <Route path="/cadastro-empresa" element={<CompanySignupPage />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to={state.activeRole === "empresa" ? "/app/empresa" : "/app/trabalhador"} replace />} />
        <Route path="trabalhador" element={<RoleRoute role="trabalhador"><WorkerDashboard /></RoleRoute>} />
        <Route path="vagas" element={<RoleRoute role="trabalhador"><JobsPage /></RoleRoute>} />
        <Route path="vagas/:id" element={<RoleRoute role="trabalhador"><JobDetailsPage /></RoleRoute>} />
        <Route path="candidaturas" element={<RoleRoute role="trabalhador"><ApplicationsPage /></RoleRoute>} />
        <Route path="trabalhos" element={<RoleRoute role="trabalhador"><MyJobsPage /></RoleRoute>} />
        <Route path="perfil-trabalhador" element={<RoleRoute role="trabalhador"><WorkerProfilePage /></RoleRoute>} />
        <Route path="empresa" element={<RoleRoute role="empresa"><CompanyDashboard /></RoleRoute>} />
        <Route path="minhas-vagas" element={<RoleRoute role="empresa"><CompanyJobsPage /></RoleRoute>} />
        <Route path="candidatos" element={<RoleRoute role="empresa"><CandidatesPage /></RoleRoute>} />
        <Route path="escala" element={<RoleRoute role="empresa"><CompanySchedulePage /></RoleRoute>} />
        <Route path="equipe" element={<RoleRoute role="empresa"><TeamPage /></RoleRoute>} />
        <Route path="perfil-empresa" element={<RoleRoute role="empresa"><CompanyProfilePage /></RoleRoute>} />
        <Route path="notificacoes" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
