import { Navigate, Route, Routes } from "react-router-dom";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro-trabalhador" element={<WorkerSignupPage />} />
      <Route path="/cadastro-empresa" element={<CompanySignupPage />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/trabalhador" replace />} />
        <Route path="trabalhador" element={<WorkerDashboard />} />
        <Route path="vagas" element={<JobsPage />} />
        <Route path="vagas/:id" element={<JobDetailsPage />} />
        <Route path="candidaturas" element={<ApplicationsPage />} />
        <Route path="trabalhos" element={<MyJobsPage />} />
        <Route path="perfil-trabalhador" element={<WorkerProfilePage />} />
        <Route path="empresa" element={<CompanyDashboard />} />
        <Route path="minhas-vagas" element={<CompanyJobsPage />} />
        <Route path="candidatos" element={<CandidatesPage />} />
        <Route path="equipe" element={<TeamPage />} />
        <Route path="perfil-empresa" element={<CompanyProfilePage />} />
        <Route path="notificacoes" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
