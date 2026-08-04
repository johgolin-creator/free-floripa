import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UserCheck,
  UserX,
  UsersRound
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { ShiftReceipt } from "../components/ShiftReceipt";
import { UrgentBadge } from "../components/UrgentBadge";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { calculateReliability, getOpenSlots } from "../lib/rules";
import type { AppState, Application, Job, WorkShift, WorkerProfile } from "../lib/types";

const terminalStatuses = ["Recusada", "Cancelada", "Trabalho concluído", "Falta registrada"];
const candidateStatusFilters = ["Todos", "Enviada", "Em análise", "Aprovada", "Trabalho concluído", "Recusada", "Falta registrada"] as const;
type CandidateStatusFilter = (typeof candidateStatusFilters)[number];

type ReviewTarget = {
  application: Application;
  job: Job;
  workerId: string;
  workerName: string;
};

type PendingReview = {
  application: Application;
  job: Job;
  worker: WorkerProfile;
};

type ReceiptTarget = {
  application: Application;
  job: Job;
  worker: WorkerProfile;
  shift?: WorkShift;
};

export function CandidatesPage() {
  const { state, currentCompany, toggleFavorite, updateApplicationStatus, checkIn, checkOut, addReview } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(null);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<CandidateStatusFilter>("Todos");
  const [trustedCandidatesOnly, setTrustedCandidatesOnly] = useState(false);
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const selectedJobId = searchParams.get("vaga") || companyJobs[0]?.id || "";
  const selectedJob = companyJobs.find((job) => job.id === selectedJobId) ?? companyJobs[0];
  const applications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
  const selectedApplications = selectedJob ? applications.filter((application) => application.jobId === selectedJob.id) : [];
  const visibleApplications = useMemo(
    () =>
      selectedApplications
        .filter((application) => candidateStatusFilter === "Todos" || application.status === candidateStatusFilter)
        .filter((application) => {
          if (!trustedCandidatesOnly) return true;
          const worker = state.workers.find((item) => item.id === application.workerId);
          return worker ? isTrustedCandidate(worker, state) : false;
        })
        .sort((a, b) => {
          const workerA = state.workers.find((item) => item.id === a.workerId);
          const workerB = state.workers.find((item) => item.id === b.workerId);
          const scoreA = workerA ? calculateReliability(workerA) : 0;
          const scoreB = workerB ? calculateReliability(workerB) : 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [candidateStatusFilter, selectedApplications, state, trustedCandidatesOnly]
  );
  const stats = useMemo(() => getJobStats(selectedJob, selectedApplications), [selectedApplications, selectedJob]);
  const generalStats = useMemo(() => getCompanyCandidateStats(applications), [applications]);
  const pendingReviews = useMemo(
    () => getPendingReviews(applications, state.jobs, state.workers),
    [applications, state.jobs, state.workers]
  );

  useEffect(() => {
    if (companyJobs.length > 0 && !companyJobs.some((job) => job.id === selectedJobId)) {
      setSearchParams({ vaga: companyJobs[0].id }, { replace: true });
    }
  }, [companyJobs, selectedJobId, setSearchParams]);

  function runStatus(applicationId: string, status: Application["status"]) {
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  function openReview(application: Application, job: Job, workerId: string, workerName: string) {
    setReviewTarget({ application, job, workerId, workerName });
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewTarget) return;

    const comment = reviewComment.trim();
    if (comment.length < 10) {
      setReviewError("Escreva uma avaliação com pelo menos 10 caracteres.");
      return;
    }

    addReview(reviewTarget.workerId, {
      authorName: currentCompany.establishmentName,
      rating: reviewRating,
      comment: `${reviewTarget.job.title}: ${comment}`,
      jobId: reviewTarget.job.id,
      applicationId: reviewTarget.application.id,
      createdAt: new Date().toISOString()
    });
    setMessage(`Avaliação registrada para ${reviewTarget.workerName}.`);
    setReviewTarget(null);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Candidatos"
        title="Gerenciar candidatos"
        description="Aprove profissionais, acompanhe presença, finalize turnos e registre a avaliação do serviço."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma vaga para começar a receber candidatos." />
      ) : (
        <div className="grid gap-4">
          <section className="candidate-board-hero">
            <div>
              <span className="section-eyebrow">Central de candidatos</span>
              <h2>Decida rápido e mantenha o turno sob controle</h2>
              <p>
                Acompanhe quem está aguardando resposta, quem já foi aprovado, quem compareceu e quem precisa de avaliação.
              </p>
            </div>
            <div className="candidate-hero-metrics">
              <HeroMetric icon={<BriefcaseBusiness size={19} />} label="vagas" value={String(companyJobs.length)} />
              <HeroMetric icon={<UsersRound size={19} />} label="candidatos" value={String(generalStats.total)} />
              <HeroMetric icon={<Clock3 size={19} />} label="em análise" value={String(generalStats.pending)} />
              <HeroMetric icon={<CalendarCheck size={19} />} label="aprovados" value={String(generalStats.approved)} />
            </div>
          </section>

          {pendingReviews.length > 0 && (
            <section className="candidate-selector-panel border-aqua-200 bg-aqua-50/70">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-navy-950">
                  <Star size={18} /> Avaliações pendentes
                </div>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Finalize o pós-turno avaliando quem já concluiu o trabalho. Isso melhora a reputação do profissional e deixa o histórico da empresa organizado.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {pendingReviews.slice(0, 6).map(({ application, job, worker }) => (
                  <article key={application.id} className="rounded-lg border border-white bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-navy-950">{worker.name}</strong>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">{job.title}</p>
                        <span className="mt-2 inline-flex rounded-full bg-aqua-50 px-2 py-1 text-[0.7rem] font-black uppercase text-aqua-700">
                          Trabalho concluído
                        </span>
                      </div>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-950 text-aqua-300">
                        <ClipboardCheck size={17} />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchParams({ vaga: job.id });
                        openReview(application, job, worker.id, worker.name);
                      }}
                      className="primary mt-3 w-full"
                    >
                      <Star size={16} /> Avaliar agora
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="candidate-selector-panel">
            <label className="label">
              Vaga
              <select
                className="input"
                value={selectedJob?.id ?? ""}
                onChange={(event) => setSearchParams({ vaga: event.target.value })}
              >
                {companyJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {formatDate(job.date)} - {job.candidates} candidato{job.candidates === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            {selectedJob && (
              <div className="candidate-stat-grid">
                <Stat label="candidatos" value={String(stats.total)} />
                <Stat label="em análise" value={String(stats.pending)} />
                <Stat label="confirmados" value={`${selectedJob.filled}/${selectedJob.quantity}`} />
                <Stat label="vagas abertas" value={String(getOpenSlots(selectedJob))} />
              </div>
            )}
            {selectedJob && (
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="label">
                  Filtrar candidatos
                  <select
                    className="input"
                    value={candidateStatusFilter}
                    onChange={(event) => setCandidateStatusFilter(event.target.value as CandidateStatusFilter)}
                  >
                    {candidateStatusFilters.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={trustedCandidatesOnly}
                    onChange={(event) => setTrustedCandidatesOnly(event.target.checked)}
                    className="h-5 w-5 accent-aqua-500"
                  />
                  <ShieldCheck size={17} /> Somente confiáveis
                </label>
              </div>
            )}
          </section>

          {selectedJob && (
            <section className="candidate-job-summary">
              <div className="candidate-job-main">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedJob.urgent && <UrgentBadge />}
                    <span className="badge">{selectedJob.function}</span>
                    <span className="badge">{formatCurrency(selectedJob.dailyValue)}</span>
                  </div>
                  <h3 className="text-lg font-black text-navy-950">{selectedJob.title}</h3>
                  <p className="text-sm font-semibold text-slate-600">
                    {selectedJob.neighborhood} - {formatDate(selectedJob.date)} - {selectedJob.startsAt} até {selectedJob.endsAt}
                  </p>
                </div>
                <div className="candidate-job-result">
                  <strong>{stats.completed}</strong>
                  <span>concluído{stats.completed === 1 ? "" : "s"}</span>
                  <strong>{stats.noShow}</strong>
                  <span>falta{stats.noShow === 1 ? "" : "s"}</span>
                </div>
              </div>
            </section>
          )}

          <SafetyNotice title="Decisão segura">
            Antes de aprovar, confira experiência, comparecimento, cancelamentos e avaliações. O contato do profissional só é liberado depois da confirmação.
          </SafetyNotice>

          {!selectedJob || selectedApplications.length === 0 ? (
            <EmptyState title="Nenhum candidato nesta vaga" text="Quando alguém se candidatar, os dados aparecerão aqui com ações de aprovação." />
          ) : visibleApplications.length === 0 ? (
            <EmptyState title="Nenhum candidato neste filtro" text="Altere o status ou desmarque somente confiáveis para ver mais candidatos desta vaga." />
          ) : (
            <div className="grid gap-3">
              {visibleApplications.map((application) => {
                const worker = state.workers.find((item) => item.id === application.workerId);
                if (!worker || !selectedJob) return null;
                const shift = state.shifts.find((item) => item.jobId === selectedJob.id && item.workerId === worker.id);
                const favorite = state.favoriteWorkerIds.includes(worker.id);
                const approved = application.status === "Aprovada";
                const completed = application.status === "Trabalho concluído";
                const reviewed = worker.reviews.some(
                  (review) => review.jobId === selectedJob.id && review.applicationId === application.id
                );
                const contactUnlocked = approved || completed;
                const refused = terminalStatuses.includes(application.status) && !approved;
                const noSlots = getOpenSlots(selectedJob) === 0 && !approved && !completed;
                const workerBlocked = state.adminModeration.blockedWorkerIds.includes(worker.id);
                const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
                const blockedAction = workerBlocked || companyBlocked;

                return (
                  <article key={application.id} className="candidate-card">
                    <WorkerCard worker={worker} functionFocus={selectedJob.function} showActions={false} />
                    <div className="candidate-control-panel">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="badge bg-aqua-100 text-aqua-700">{application.status}</span>
                          <span className="badge">{getShiftLabel(application, shift)}</span>
                          <span className="badge">Inscrito em {formatDate(application.createdAt.slice(0, 10))}</span>
                        </div>
                        <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
                          <Heart size={17} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorito" : "Favoritar"}
                        </button>
                      </div>

                      <HiringFlow application={application} shift={shift} reviewed={reviewed} />

                      {blockedAction && (
                        <SafetyNotice title="Ações bloqueadas por segurança" tone="warning">
                          {workerBlocked
                            ? "Este profissional está em revisão pela administração. Aprovação, presença e convite ficam pausados."
                            : "Sua empresa está em revisão pela administração. As decisões de candidatos ficam pausadas."}
                        </SafetyNotice>
                      )}

                      <div className="candidate-action-grid">
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Em análise")}
                          disabled={blockedAction || application.status !== "Enviada"}
                          className="secondary"
                        >
                          <Clock3 size={17} /> Analisar
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Aprovada")}
                          disabled={blockedAction || approved || completed || noSlots}
                          className="primary"
                        >
                          <UserCheck size={17} /> {approved || completed ? "Confirmado" : noSlots ? "Sem vaga" : "Aprovar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Recusada")}
                          disabled={blockedAction || refused || approved || completed}
                          className="secondary"
                        >
                          <UserX size={17} /> Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            checkIn(selectedJob.id, worker.id);
                            setMessage(`Check-in registrado para ${worker.name}.`);
                          }}
                          disabled={blockedAction || !approved || shift?.status !== "Ainda não chegou"}
                          className="secondary"
                        >
                          Check-in
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            checkOut(selectedJob.id, worker.id);
                            runStatus(application.id, "Trabalho concluído");
                          }}
                          disabled={blockedAction || !approved || shift?.status !== "Fez check-in"}
                          className="primary"
                        >
                          <CheckCircle2 size={17} /> Concluir
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Falta registrada")}
                          disabled={blockedAction || !approved || shift?.status !== "Ainda não chegou"}
                          className="danger"
                        >
                          Registrar falta
                        </button>
                      </div>

                      {contactUnlocked ? (
                        <div className="candidate-contact-card">
                          <div>
                            <strong className="text-sm text-navy-950">Contato liberado</strong>
                            <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                              <span className="flex items-center gap-1.5"><Phone size={15} /> {worker.phone}</span>
                              <span className="flex items-center gap-1.5"><Mail size={15} /> {worker.email}</span>
                            </div>
                          </div>
                          <a
                            className="primary"
                            href={getWhatsAppUrl(worker.phone, `Olá, ${worker.name}. Sua vaga ${selectedJob.title} no ${currentCompany.establishmentName} foi aprovada.`)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle size={17} /> WhatsApp
                          </a>
                        </div>
                      ) : (
                        <div className="candidate-locked-note">
                          <Lock size={17} /> Contato protegido até a aprovação.
                        </div>
                      )}

                      {completed && (
                        <div className="candidate-review-panel">
                          <div>
                            <strong className="text-sm text-navy-950">
                              {reviewed ? "Avaliação registrada" : "Avaliação pendente"}
                            </strong>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {reviewed
                                ? "Esse trabalho já entrou no histórico do profissional."
                                : "Avalie presença, postura e qualidade antes de encerrar o ciclo."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openReview(application, selectedJob, worker.id, worker.name)}
                            disabled={reviewed}
                            className={reviewed ? "secondary" : "primary"}
                          >
                            <Star size={17} /> {reviewed ? "Avaliado" : "Avaliar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptTarget({ application, job: selectedJob, worker, shift })}
                            className="secondary"
                          >
                            <ClipboardCheck size={17} /> Comprovante
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {reviewTarget && (
        <Modal title={`Avaliar ${reviewTarget.workerName}`} onClose={() => setReviewTarget(null)}>
          <form className="grid gap-3" onSubmit={submitReview}>
            {reviewError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{reviewError}</div>}
            <div className="grid gap-2">
              <span className="text-sm font-black text-navy-950">Nota</span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewRating(rating)}
                    className={reviewRating === rating ? "primary" : "secondary"}
                  >
                    <Star size={16} fill={reviewRating >= rating ? "currentColor" : "none"} /> {rating}
                  </button>
                ))}
              </div>
            </div>
            <label className="label">
              Comentário
              <textarea
                className="input min-h-28 py-3"
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Ex.: chegou no horário, atendeu bem e trabalhou com postura profissional."
              />
            </label>
            <button type="submit" className="primary">
              <ClipboardCheck size={17} /> Salvar avaliação
            </button>
          </form>
        </Modal>
      )}

      {receiptTarget && (
        <Modal title="Comprovante do turno" onClose={() => setReceiptTarget(null)}>
          <ShiftReceipt
            application={receiptTarget.application}
            job={receiptTarget.job}
            worker={receiptTarget.worker}
            company={currentCompany}
            shift={receiptTarget.shift}
            review={receiptTarget.worker.reviews.find(
              (review) =>
                review.jobId === receiptTarget.job.id &&
                review.applicationId === receiptTarget.application.id
            )}
          />
        </Modal>
      )}
    </div>
  );
}

function getJobStats(job: Job | undefined, applications: Application[]) {
  if (!job) return { total: 0, pending: 0, completed: 0, noShow: 0 };
  return {
    total: applications.length,
    pending: applications.filter((item) => item.status === "Enviada" || item.status === "Em análise").length,
    completed: applications.filter((item) => item.status === "Trabalho concluído").length,
    noShow: applications.filter((item) => item.status === "Falta registrada").length
  };
}

function getCompanyCandidateStats(applications: Application[]) {
  return {
    total: applications.length,
    pending: applications.filter((item) => item.status === "Enviada" || item.status === "Em análise").length,
    approved: applications.filter((item) => item.status === "Aprovada").length,
    completed: applications.filter((item) => item.status === "Trabalho concluído").length
  };
}

function getPendingReviews(applications: Application[], jobs: Job[], workers: WorkerProfile[]): PendingReview[] {
  return applications
    .filter((application) => application.status === "Trabalho concluído")
    .map((application) => {
      const job = jobs.find((item) => item.id === application.jobId);
      const worker = workers.find((item) => item.id === application.workerId);
      if (!job || !worker) return null;

      const reviewed = worker.reviews.some(
        (review) => review.jobId === job.id && review.applicationId === application.id
      );

      return reviewed ? null : { application, job, worker };
    })
    .filter((item): item is PendingReview => Boolean(item))
    .sort((a, b) => b.application.createdAt.localeCompare(a.application.createdAt));
}

function isTrustedCandidate(worker: WorkerProfile, state: AppState) {
  const hasOpenReport = state.trustReports.some(
    (report) => report.status === "Aberto" && report.targetType === "worker" && report.targetId === worker.id
  );
  const blocked = state.adminModeration.blockedWorkerIds.includes(worker.id);

  return calculateReliability(worker) >= 85 && worker.attendanceRate >= 90 && worker.cancellations <= 2 && !blocked && !hasOpenReport;
}

function getShiftLabel(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Trabalho concluído") return "Turno finalizado";
  if (application.status === "Falta registrada") return "Falta registrada";
  if (application.status === "Aprovada") return shift?.status ?? "Aguardando presença";
  if (application.status === "Em análise") return "Em análise";
  if (application.status === "Recusada") return "Recusado";
  if (application.status === "Cancelada") return "Cancelado";
  return "Novo candidato";
}

type StepState = "done" | "current" | "pending" | "blocked";
type HiringStep = { kicker: string; label: string; state: StepState };

function HiringFlow({
  application,
  shift,
  reviewed
}: {
  application: Application;
  shift?: WorkShift;
  reviewed: boolean;
}) {
  const steps = getHiringSteps(application, shift, reviewed);

  return (
    <div className="hiring-flow">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <strong className="text-sm text-navy-950">Fluxo da contratação</strong>
        <span className="text-xs font-black uppercase text-slate-500">{getNextAction(application, shift, reviewed)}</span>
      </div>
      <div className="hiring-step-grid">
        {steps.map((step) => (
          <span key={step.label} className={`hiring-step ${getStepClass(step.state)}`}>
            <span className="block text-[0.65rem] uppercase text-slate-500">{step.kicker}</span>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function getHiringSteps(application: Application, shift: WorkShift | undefined, reviewed: boolean): HiringStep[] {
  const approved = application.status === "Aprovada" || application.status === "Trabalho concluído";
  const completed = application.status === "Trabalho concluído";
  const absence = application.status === "Falta registrada";
  const rejected = application.status === "Recusada" || application.status === "Cancelada";
  const checkedIn = shift?.status === "Fez check-in" || shift?.status === "Finalizou o turno" || completed;

  return [
    { kicker: "1", label: "Candidatura", state: "done" },
    {
      kicker: "2",
      label: approved ? "Aprovado" : rejected ? "Encerrado" : "Aprovar",
      state: approved ? "done" : rejected ? "blocked" : "current"
    },
    {
      kicker: "3",
      label: checkedIn ? "Presença registrada" : absence ? "Falta" : "Check-in",
      state: checkedIn ? "done" : absence ? "blocked" : approved ? "current" : "pending"
    },
    {
      kicker: "4",
      label: completed ? "Trabalho concluído" : "Concluir turno",
      state: completed ? "done" : checkedIn ? "current" : "pending"
    },
    {
      kicker: "5",
      label: reviewed ? "Avaliado" : "Avaliar",
      state: reviewed ? "done" : completed ? "current" : "pending"
    }
  ];
}

function getStepClass(state: StepState) {
  if (state === "done") return "border-aqua-200 bg-aqua-100 text-aqua-700";
  if (state === "current") return "border-navy-200 bg-white text-navy-950";
  if (state === "blocked") return "border-red-100 bg-red-50 text-alert";
  return "border-slate-200 bg-white text-slate-500";
}

function getNextAction(application: Application, shift: WorkShift | undefined, reviewed: boolean) {
  if (application.status === "Recusada" || application.status === "Cancelada") return "Ciclo encerrado";
  if (application.status === "Falta registrada") return "Falta registrada";
  if (application.status === "Trabalho concluído") return reviewed ? "Contratação concluída" : "Avaliar profissional";
  if (application.status === "Aprovada") {
    if (shift?.status === "Fez check-in") return "Concluir turno";
    return "Aguardar presença";
  }
  if (application.status === "Em análise") return "Decidir aprovação";
  return "Novo candidato";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="candidate-stat-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="candidate-hero-metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}
