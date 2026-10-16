import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  Edit3,
  MoreHorizontal,
  PartyPopper,
  Plus,
  RotateCcw,
  Square,
  UsersRound,
  XCircle,
  Zap
} from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { StatusBadge } from "../components/StatusBadge";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Application, Job, JobStatus } from "../lib/types";

type JobFilter = "Ativas" | "Urgentes" | "Rascunhos" | "Histórico";

const allFilters: JobFilter[] = ["Ativas", "Urgentes", "Rascunhos", "Histórico"];
const pendingStatuses: Application["status"][] = ["Enviada", "Em análise", "Convidada"];
type EventPackage = {
  key: string;
  name: string;
  date: string;
  startsAt: string;
  endsAt: string;
  neighborhood: string;
  jobs: Job[];
  totalNeeded: number;
  totalConfirmed: number;
  totalCandidates: number;
  expectedValue: number;
};

export function CompanyJobsPage() {
  const { state, currentCompany, updateJobStatus, duplicateJob } = useAppStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<JobFilter>("Ativas");
  const [message, setMessage] = useState("");
  const [confirmCancelJobId, setConfirmCancelJobId] = useState<string | null>(null);
  const jobListRef = useRef<HTMLDivElement | null>(null);
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const jobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const companyApplications = state.applications.filter((application) => jobs.some((job) => job.id === application.jobId));
  const filteredJobs = useMemo(() => jobs.filter((job) => matchesFilter(job, filter)), [jobs, filter]);
  const eventPackages = useMemo(() => groupEventPackages(jobs, state.applications), [jobs, state.applications]);
  const dashboard = {
    active: jobs.filter((job) => isActiveStatus(getJobStatus(job))).length,
    urgent: jobs.filter((job) => job.urgent && isActiveStatus(getJobStatus(job))).length,
    pending: companyApplications.filter((application) => pendingStatuses.includes(application.status)).length,
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
      setConfirmCancelJobId(jobId);
      return;
    }
    const result = updateJobStatus(jobId, status);
    setMessage(result.message);
  }

  function confirmCancelJob() {
    if (!confirmCancelJobId) return;
    const result = updateJobStatus(confirmCancelJobId, "Cancelada");
    setMessage(result.message);
    setConfirmCancelJobId(null);
  }

  const confirmCancelJobTarget = confirmCancelJobId ? jobs.find((item) => item.id === confirmCancelJobId) : null;
  const confirmCancelConfirmedCount = confirmCancelJobTarget
    ? state.applications.filter(
        (application) =>
          application.jobId === confirmCancelJobTarget.id &&
          (application.status === "Aprovada" || application.status === "Trabalho concluído")
      ).length
    : 0;

  function runDuplicate(jobId: string) {
    const result = duplicateJob(jobId);
    setMessage(result.message);
  }

  function goToFilter(nextFilter: JobFilter) {
    setFilter(nextFilter);
    jobListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filterCounts: Record<JobFilter, number> = {
    Ativas: jobs.filter((job) => matchesFilter(job, "Ativas")).length,
    Urgentes: jobs.filter((job) => matchesFilter(job, "Urgentes")).length,
    Rascunhos: jobs.filter((job) => matchesFilter(job, "Rascunhos")).length,
    Histórico: jobs.filter((job) => matchesFilter(job, "Histórico")).length
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Minhas vagas"
        title="Minhas vagas"
        description="Acompanhe cada vaga, veja quem está aguardando decisão e feche a equipe."
      />
      {companyBlocked && (
        <div className="mb-4">
          <SafetyNotice title="Vagas em revisão" tone="warning">
            Sua empresa está em revisão pela administração. Alterações, cancelamentos, reabertura e duplicação ficam pausados até a liberação.
          </SafetyNotice>
        </div>
      )}
      {jobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma vaga comum, uma reposição urgente ou monte um evento para começar a receber candidatos.">
          <Link to="/app/empresa?acao=criar-vaga" className="primary">
            <Plus size={17} /> Criar vaga
          </Link>
          <Link to="/app/empresa?acao=urgente" className="danger">
            <Zap size={17} /> Vaga urgente
          </Link>
          <Link to="/app/eventos" className="secondary">
            <PartyPopper size={17} /> Montar evento
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          <section className="jobs-overview">
            <div className="jobs-overview-stats">
              <button type="button" onClick={() => goToFilter("Ativas")}>
                <strong>{dashboard.active}</strong>
                <span>ativas</span>
              </button>
              <button type="button" onClick={() => navigate("/app/candidatos")} className={dashboard.pending > 0 ? "is-highlight" : ""}>
                <strong>{dashboard.pending}</strong>
                <span>aguardando decisão</span>
              </button>
              <button type="button" onClick={() => goToFilter("Urgentes")} className={dashboard.urgent > 0 ? "is-alert" : ""}>
                <strong>{dashboard.urgent}</strong>
                <span>urgentes</span>
              </button>
              <div>
                <strong>{formatCurrency(dashboard.expected)}</strong>
                <span>previsto em diárias</span>
              </div>
            </div>
            <div className="jobs-overview-actions">
              <Link to="/app/empresa?acao=criar-vaga" className="cand-btn is-primary">
                <Plus size={16} /> Criar vaga
              </Link>
              <Link to="/app/eventos" className="cand-btn">
                <PartyPopper size={16} /> Montar evento
              </Link>
            </div>
          </section>

          {message && (
            <div className="cand-toast" role="status">
              <CheckCircle2 size={17} /> {message}
            </div>
          )}

          <div className="cand-tabs is-grid" role="tablist" aria-label="Filtrar vagas" ref={jobListRef}>
            {allFilters.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
                className={`cand-tab ${filter === item ? "is-active" : ""}`}
              >
                {item}
                <span className="cand-tab-count">{filterCounts[item]}</span>
              </button>
            ))}
          </div>

          {filter === "Ativas" && eventPackages.length > 0 && (
            <section className="event-package-panel">
              <div className="event-package-heading">
                <div>
                  <span className="section-eyebrow">Eventos montados</span>
                  <h3>Pacotes de evento</h3>
                  <p>O evento inteiro em uma visão só, mesmo com vagas separadas por função.</p>
                </div>
              </div>
              <div className="event-package-grid">
                {eventPackages.map((eventPackage) => (
                  <article key={eventPackage.key} className="event-package-card">
                    <div className="event-package-title">
                      <div>
                        <strong>{eventPackage.name}</strong>
                        <span>
                          {formatDate(eventPackage.date)} · {eventPackage.startsAt} às {eventPackage.endsAt} · {eventPackage.neighborhood}
                        </span>
                      </div>
                      <span className="cand-chip">
                        Equipe {eventPackage.totalConfirmed}/{eventPackage.totalNeeded}
                      </span>
                    </div>
                    <div className="event-package-functions">
                      {eventPackage.jobs.map((job) => (
                        <span key={job.id}>
                          {job.quantity} {job.function}
                        </span>
                      ))}
                    </div>
                    <Link to={`/app/candidatos?evento=${encodeURIComponent(eventPackage.key)}`} className="cand-btn is-primary">
                      <ClipboardList size={16} /> Ver candidatos do pacote ({eventPackage.totalCandidates})
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {filteredJobs.length === 0 ? (
            <EmptyState title="Nada neste filtro" text="Troque o filtro para visualizar outras vagas." />
          ) : (
            <div className="stagger-list grid gap-3">
              {filteredJobs.map((job) => {
                const status = getJobStatus(job);
                const applications = state.applications.filter((application) => application.jobId === job.id);
                const confirmed = applications.filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído").length;
                const pending = applications.filter((application) => pendingStatuses.includes(application.status)).length;
                const terminal = status === "Concluída" || status === "Cancelada";
                const progress = Math.min(100, Math.round((confirmed / job.quantity) * 100));
                const openSlots = getOpenSlots(job);

                return (
                  <article key={job.id} className="jobs-card">
                    <div className="jobs-card-main">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {status === "Urgente" ? <UrgentBadge /> : <StatusBadge type="job" status={status} />}
                          {job.urgent && status !== "Urgente" && !terminal && <UrgentBadge />}
                          <span className="cand-chip">{job.function}</span>
                          <span className="cand-chip">{formatCurrency(job.dailyValue)} / diária</span>
                        </div>
                        <h3 className="cand-job-title">{job.title}</h3>
                        <p className="cand-job-meta">
                          {formatDate(job.date)} · {job.startsAt} às {job.endsAt} · {job.neighborhood}
                        </p>
                      </div>
                      <div className="cand-team-meter">
                        <div className="flex items-baseline justify-between gap-3">
                          <span>Equipe</span>
                          <strong>
                            {confirmed} de {job.quantity}
                          </strong>
                        </div>
                        <div className="company-progress-track">
                          <span style={{ width: `${progress}%` }} />
                        </div>
                        <small>{openSlots === 0 ? "Equipe completa" : `${openSlots} vaga${openSlots === 1 ? "" : "s"} em aberto`}</small>
                      </div>
                    </div>

                    <div className="jobs-card-actions">
                      <Link to={`/app/candidatos?vaga=${job.id}`} className="cand-btn is-primary">
                        <UsersRound size={16} /> Candidatos
                        {pending > 0 && <span className="jobs-pending-pill">{pending} aguardando</span>}
                      </Link>
                      <Link
                        to={`/app/empresa?acao=editar-vaga&vaga=${job.id}`}
                        className="cand-btn"
                        aria-disabled={terminal || companyBlocked}
                        onClick={(event) => {
                          if (terminal || companyBlocked) event.preventDefault();
                        }}
                      >
                        <Edit3 size={16} /> Editar
                      </Link>
                      <details className="jobs-more">
                        <summary className="cand-btn">
                          <MoreHorizontal size={16} /> Mais
                        </summary>
                        <div
                          className="jobs-more-menu"
                          onClick={(event) => {
                            // Fecha o menu depois de escolher uma ação.
                            if ((event.target as HTMLElement).closest("button")) {
                              event.currentTarget.parentElement?.removeAttribute("open");
                            }
                          }}
                        >
                          <button type="button" onClick={() => runStatus(job.id, "Concluída")} disabled={terminal || companyBlocked}>
                            <CheckCircle2 size={16} /> Encerrar vaga
                          </button>
                          <button
                            type="button"
                            onClick={() => runStatus(job.id, "Publicada")}
                            disabled={status === "Publicada" || status === "Urgente" || status === "Em andamento" || companyBlocked}
                          >
                            <RotateCcw size={16} /> Reabrir
                          </button>
                          <button type="button" onClick={() => runDuplicate(job.id)} disabled={companyBlocked}>
                            <Copy size={16} /> Duplicar
                          </button>
                          <button type="button" onClick={() => runStatus(job.id, "Rascunho")} disabled={status === "Rascunho" || terminal || companyBlocked}>
                            <Square size={16} /> Mover para rascunho
                          </button>
                          <button type="button" onClick={() => runStatus(job.id, "Cancelada")} disabled={terminal || companyBlocked} className="is-danger">
                            <XCircle size={16} /> Cancelar vaga
                          </button>
                        </div>
                      </details>
                    </div>

                    {applications.length > 0 && (
                      <details className="company-history">
                        <summary>
                          <CalendarCheck size={16} /> Histórico de candidaturas ({applications.length})
                        </summary>
                        <JobHistory applications={applications} />
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmCancelJobTarget && (
        <Modal title="Cancelar vaga preenchida?" onClose={() => setConfirmCancelJobId(null)}>
          <p className="text-sm leading-6 text-slate-600">
            Esta vaga já está preenchida ({confirmCancelConfirmedCount}/{confirmCancelJobTarget.quantity}). Ao cancelar, os
            profissionais confirmados são avisados e perdem o turno.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" className="secondary" onClick={() => setConfirmCancelJobId(null)}>
              Voltar
            </button>
            <button type="button" className="danger" onClick={confirmCancelJob}>
              Cancelar vaga
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function groupEventPackages(jobs: Job[], applications: Application[]): EventPackage[] {
  const groups = new Map<string, EventPackage>();

  jobs.forEach((job) => {
    const eventName = getEventPackageName(job);
    if (!eventName) return;

    const key = `${eventName}|${job.date}|${job.startsAt}|${job.endsAt}`;
    const jobApplications = applications.filter((application) => application.jobId === job.id);
    const confirmed = jobApplications.filter(
      (application) => application.status === "Aprovada" || application.status === "Trabalho concluído"
    ).length;
    const current = groups.get(key) ?? {
      key,
      name: eventName,
      date: job.date,
      startsAt: job.startsAt,
      endsAt: job.endsAt,
      neighborhood: job.neighborhood,
      jobs: [],
      totalNeeded: 0,
      totalConfirmed: 0,
      totalCandidates: 0,
      expectedValue: 0
    };

    current.jobs.push(job);
    current.totalNeeded += job.quantity;
    current.totalConfirmed += confirmed;
    current.totalCandidates += jobApplications.length;
    current.expectedValue += confirmed * job.dailyValue;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function getEventPackageName(job: Job) {
  if (!job.description.includes("Equipe criada pela aba Eventos")) return null;
  const separatorIndex = job.title.indexOf(":");
  if (separatorIndex <= 0) return null;
  return job.title.slice(0, separatorIndex).trim();
}

function matchesFilter(job: Job, filter: JobFilter) {
  const status = getJobStatus(job);
  if (filter === "Ativas") return isActiveStatus(status);
  if (filter === "Urgentes") return job.urgent && isActiveStatus(status);
  if (filter === "Rascunhos") return status === "Rascunho";
  if (filter === "Histórico") return status === "Concluída" || status === "Cancelada";
  return status !== "Concluída" && status !== "Cancelada";
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

function JobHistory({ applications }: { applications: Application[] }) {
  const { state } = useAppStore();

  if (applications.length === 0) {
    return <p className="mt-3 text-sm font-semibold text-slate-500">Nenhuma candidatura registrada nesta vaga.</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {applications.map((application) => {
        const worker = state.workers.find((item) => item.id === application.workerId);
        return (
          <div key={application.id} className="grid gap-2 rounded-lg bg-brand-dark p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <strong className="text-sm text-white">{worker?.name ?? "Profissional"}</strong>
              <p className="text-xs font-semibold text-slate-500">
                {application.status} - inscrição em {formatDate(application.createdAt.slice(0, 10))}
              </p>
            </div>
            <StatusBadge type="application" status={application.status} />
          </div>
        );
      })}
    </div>
  );
}
