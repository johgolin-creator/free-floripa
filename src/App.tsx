import { Navigate, Route, Routes } from "react-router-dom";
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
import { TeamPage } from "./pages/TeamPage";
import { CompanyProfilePage } from "./pages/CompanyProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { useAppStore } from "./lib/store";
import type { UserRole } from "./lib/types";

export default function App() {
  const { state } = useAppStore();

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro-trabalhador" element={<WorkerSignupPage />} />
      <Route path="/cadastro-empresa" element={<CompanySignupPage />} />
      <Route path="/app" element={<AppLayout />}>
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
