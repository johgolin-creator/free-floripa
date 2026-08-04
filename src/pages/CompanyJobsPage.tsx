import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  RotateCcw,
  Square,
  UsersRound,
  WalletCards,
  XCircle
} from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState } from "../components/EmptyState";
import { SafetyNotice } from "../components/SafetyNotice";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Application, Job, JobStatus } from "../lib/types";

type JobFilter = "Todas" | "Ativas" | "Rascunhos" | "Histórico";

const filters: JobFilter[] = ["Todas", "Ativas", "Rascunhos", "Histórico"];

export function CompanyJobsPage() {
  const { state, currentCompany, updateJobStatus, duplicateJob } = useAppStore();
  const [filter, setFilter] = useState<JobFilter>("Todas");
  const [message, setMessage] = useState("");
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const jobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const companyApplications = state.applications.filter((application) => jobs.some((job) => job.id === application.jobId));
  const filteredJobs = useMemo(() => jobs.filter((job) => matchesFilter(job, filter)), [jobs, filter]);
  const dashboard = {
    active: jobs.filter((job) => isActiveStatus(getJobStatus(job))).length,
    urgent: jobs.filter((job) => job.urgent && isActiveStatus(getJobStatus(job))).length,
    candidates: companyApplications.length,
    openSlots: jobs.reduce((total, job) => total + getOpenSlots(job), 0),
    expected: companyApplications
      .filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído")
      .reduce((total, application) => {
        const job = jobs.find((item) => item.id === application.jobId);
        return total + (job?.dailyValue ?? 0);
      }, 0)
  };

  function runStatus(jobId: string, status: JobStatus) {
    const job = jobs.find((item) => item.id === jobId);
    if (job && status === "Cancelada" && isFilledJob(job, state.applications)) {
      const confirmed = state.applications.filter(
        (application) =>
          application.jobId === job.id &&
          (application.status === "Aprovada" || application.status === "Trabalho concluído")
      ).length;
      const confirmedText = `${confirmed}/${job.quantity}`;
      if (
        !window.confirm(
          `Esta vaga já está preenchida (${confirmedText}). Para cancelar agora, serão cobradas 10 moedas da empresa. Deseja continuar?`
        )
      ) {
        return;
      }
    }
    const result = updateJobStatus(jobId, status);
    setMessage(result.message);
  }

  function runDuplicate(jobId: string) {
    const result = duplicateJob(jobId);
    setMessage(result.message);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Minhas vagas"
        title="Operação das vagas"
        description="Controle status, candidatos, encerramento, cancelamento, duplicação e histórico."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyBlocked && (
        <div className="mb-4">
          <SafetyNotice title="Vagas em revisão" tone="warning">
            Sua empresa está em revisão pela administração. Alterações, cancelamentos, reabertura e duplicação ficam pausados até a liberação.
          </SafetyNotice>
        </div>
      )}
      {jobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma nova vaga no painel da empresa." />
      ) : (
        <div className="grid gap-4">
          <section className="company-jobs-hero">
            <div>
              <span className="section-eyebrow">Painel de controle</span>
              <h2>Suas vagas organizadas por decisão</h2>
              <p>
                Acompanhe equipe confirmada, candidatos em aberto e ações importantes sem precisar entrar vaga por vaga.
              </p>
            </div>
            <div className="company-hero-metrics">
              <HeroMetric icon={<BriefcaseBusiness size={19} />} label="ativas" value={String(dashboard.active)} />
              <HeroMetric icon={<AlertTriangle size={19} />} label="urgentes" value={String(dashboard.urgent)} />
              <HeroMetric icon={<UsersRound size={19} />} label="candidatos" value={String(dashboard.candidates)} />
              <HeroMetric icon={<WalletCards size={19} />} label="previsto" value={formatCurrency(dashboard.expected)} />
            </div>
          </section>

          <section className="company-filter-bar">
            <div className="company-filter-stats">
              <Stat label="vagas abertas" value={String(dashboard.openSlots)} />
              <Stat label="rascunhos" value={String(jobs.filter((job) => getJobStatus(job) === "Rascunho").length)} />
              <Stat label="concluídas" value={String(jobs.filter((job) => getJobStatus(job) === "Concluída").length)} />
              <Stat label="canceladas" value={String(jobs.filter((job) => getJobStatus(job) === "Cancelada").length)} />
              <Stat label="moedas empresa" value={String(state.subscription.companyCreditsRemaining)} />
            </div>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 lg:col-span-2">
              Cancelar uma vaga já preenchida custa 10 moedas da empresa. Vagas sem equipe completa podem ser canceladas sem taxa.
            </p>
            <div className="company-filter-buttons">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`company-filter-button ${filter === item ? "is-active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {filteredJobs.length === 0 ? (
            <EmptyState title="Nada neste filtro" text="Troque o filtro para visualizar outras vagas." />
          ) : (
            <div className="grid gap-3">
              {filteredJobs.map((job) => {
                const status = getJobStatus(job);
                const applications = state.applications.filter((application) => application.jobId === job.id);
                const confirmed = applications.filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído").length;
                const completed = applications.filter((application) => application.status === "Trabalho concluído").length;
                const absences = applications.filter((application) => application.status === "Falta registrada").length;
                const expectedValue = confirmed * job.dailyValue;
                const terminal = status === "Concluída" || status === "Cancelada";
                const progress = Math.min(100, Math.round((confirmed / job.quantity) * 100));
                const filledCancellationFee = confirmed >= job.quantity ? 10 : 0;

                return (
                  <article key={job.id} className="company-job-card">
                    <div className="company-job-head">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {status === "Urgente" ? <UrgentBadge /> : <span className={getStatusClass(status)}>{status}</span>}
                          {job.urgent && status !== "Urgente" && status !== "Cancelada" && status !== "Concluída" && <UrgentBadge />}
                          <span className="badge">{job.function}</span>
                        </div>
                        <h3>{job.title}</h3>
                        <p>
                          {job.neighborhood} - {formatDate(job.date)} - {job.startsAt} às {job.endsAt}
                        </p>
                      </div>

                      <div className="company-mini-grid">
                        <Mini label="candidatos" value={String(job.candidates)} />
                        <Mini label="confirmados" value={`${confirmed}/${job.quantity}`} />
                        <Mini label="previsto" value={formatCurrency(expectedValue)} />
                        <Mini label="diária" value={formatCurrency(job.dailyValue)} />
                      </div>
                    </div>

                    <div className="company-job-progress">
                      <div>
                        <span>Equipe confirmada</span>
                        <strong>{confirmed}/{job.quantity}</strong>
                      </div>
                      <div className="company-progress-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <small>
                        {getOpenSlots(job)} vaga{getOpenSlots(job) === 1 ? "" : "s"} restante{getOpenSlots(job) === 1 ? "" : "s"} - {completed} concluído{completed === 1 ? "" : "s"} - {absences} falta{absences === 1 ? "" : "s"}
                      </small>
                    </div>

                    <div className="company-action-grid">
                      <Link to={`/app/candidatos?vaga=${job.id}`} className="company-action company-action-primary">
                        <ClipboardList size={17} /> Candidatos
                      </Link>
                      <button type="button" onClick={() => runStatus(job.id, "Concluída")} disabled={terminal || companyBlocked} className="company-action company-action-primary">
                        <CheckCircle2 size={17} /> Encerrar
                      </button>
                      <button type="button" onClick={() => runStatus(job.id, "Cancelada")} disabled={terminal || companyBlocked} className="company-action company-action-danger">
                        <XCircle size={17} /> Cancelar{filledCancellationFee > 0 ? " (-10 moedas)" : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => runStatus(job.id, "Publicada")}
                        disabled={status === "Publicada" || status === "Urgente" || status === "Em andamento" || companyBlocked}
                        className="company-action"
                      >
                        <RotateCcw size={17} /> Reabrir
                      </button>
                      <button type="button" onClick={() => runDuplicate(job.id)} disabled={companyBlocked} className="company-action">
                        <Copy size={17} /> Duplicar
                      </button>
                      <button type="button" onClick={() => runStatus(job.id, "Rascunho")} disabled={status === "Rascunho" || terminal || companyBlocked} className="company-action">
                        <Square size={17} /> Rascunho
                      </button>
                    </div>

                    <details className="company-history">
                      <summary><CalendarCheck size={16} /> Histórico da vaga</summary>
                      <JobHistory job={job} applications={applications} />
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="company-hero-metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function matchesFilter(job: Job, filter: JobFilter) {
  const status = getJobStatus(job);
  if (filter === "Ativas") return isActiveStatus(status);
  if (filter === "Rascunhos") return status === "Rascunho";
  if (filter === "Histórico") return status === "Concluída" || status === "Cancelada";
  return true;
}

function isActiveStatus(status: ReturnType<typeof getJobStatus>) {
  return status === "Publicada" || status === "Urgente" || status === "Em andamento";
}

function isFilledJob(job: Job, applications: Application[]) {
  const confirmed = applications.filter(
    (application) =>
      application.jobId === job.id &&
      (application.status === "Aprovada" || application.status === "Trabalho concluído")
  ).length;
  return confirmed >= job.quantity;
}

function getStatusClass(status: ReturnType<typeof getJobStatus>) {
  if (status === "Cancelada") return "badge bg-red-50 text-alert";
  if (status === "Concluída") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Rascunho") return "badge bg-slate-200 text-slate-700";
  return "badge";
}

function JobHistory({ job, applications }: { job: Job; applications: Application[] }) {
  const { state } = useAppStore();

  if (applications.length === 0) {
    return <p className="mt-3 text-sm font-semibold text-slate-500">Nenhuma candidatura registrada nesta vaga.</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {applications.map((application) => {
        const worker = state.workers.find((item) => item.id === application.workerId);
        const shift = state.shifts.find((item) => item.jobId === job.id && item.workerId === application.workerId);
        return (
          <div key={application.id} className="grid gap-2 rounded-lg bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <strong className="text-sm text-navy-950">{worker?.name ?? "Profissional"}</strong>
              <p className="text-xs font-semibold text-slate-500">
                {application.status} - inscrição em {formatDate(application.createdAt.slice(0, 10))}
                {shift?.checkinAt ? ` - check-in ${new Date(shift.checkinAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                {shift?.checkoutAt ? ` - saída ${new Date(shift.checkoutAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
            <span className="badge justify-center">{shift?.status ?? "Sem turno"}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="company-stat-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <span className="company-mini-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}
