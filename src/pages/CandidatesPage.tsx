import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { StatTile } from "../components/StatTile";
import { StatusBadge, StatusLegend } from "../components/StatusBadge";
import { TermHint } from "../components/TermHint";
import { UrgentBadge } from "../components/UrgentBadge";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { calculateReliability, getOpenSlots } from "../lib/rules";
import { getShiftVerificationCode } from "../lib/shiftVerification";
import type { AppState, Application, Job, WorkerProfile } from "../lib/types";

const terminalStatuses = ["Recusada", "Cancelada", "Trabalho concluído", "Falta registrada", "Convite recusado"];
const candidateStatusFilters = [
  "Todos",
  "Enviada",
  "Em análise",
  "Convidada",
  "Aprovada",
  "Trabalho concluído",
  "Recusada",
  "Convite recusado",
  "Falta registrada"
] as const;
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
};

type EventCandidateOption = {
  key: string;
  name: string;
  jobs: Job[];
};

export function CandidatesPage() {
  const { state, currentCompany, toggleFavorite, updateApplicationStatus, addReview } = useAppStore();
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
  const eventOptions = useMemo(() => getEventCandidateOptions(companyJobs), [companyJobs]);
  const selectedEventKey = searchParams.get("evento") || "";
  const selectedEvent = eventOptions.find((eventOption) => eventOption.key === selectedEventKey);
  const selectedJobId = selectedEvent ? "" : searchParams.get("vaga") || companyJobs[0]?.id || "";
  const selectedJob = companyJobs.find((job) => job.id === selectedJobId) ?? companyJobs[0];
  const selectedJobs = selectedEvent ? selectedEvent.jobs : selectedJob ? [selectedJob] : [];
  const selectedJobIds = new Set(selectedJobs.map((job) => job.id));
  const selectedControlValue = selectedEvent ? `event:${selectedEvent.key}` : selectedJob?.id ?? "";
  const applications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
  const selectedApplications = selectedJobs.length > 0 ? applications.filter((application) => selectedJobIds.has(application.jobId)) : [];
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
  const stats = useMemo(() => getJobStats(selectedApplications), [selectedApplications]);
  const selectedCapacity = useMemo(() => getSelectedCapacity(selectedJobs), [selectedJobs]);
  const generalStats = useMemo(() => getCompanyCandidateStats(applications), [applications]);
  const pendingReviews = useMemo(
    () => getPendingReviews(applications, state.jobs, state.workers),
    [applications, state.jobs, state.workers]
  );

  useEffect(() => {
    if (selectedEventKey && !selectedEvent) {
      setSearchParams({ vaga: companyJobs[0]?.id ?? "" }, { replace: true });
      return;
    }
    if (!selectedEventKey && companyJobs.length > 0 && !companyJobs.some((job) => job.id === selectedJobId)) {
      setSearchParams({ vaga: companyJobs[0].id }, { replace: true });
    }
  }, [companyJobs, selectedEvent, selectedEventKey, selectedJobId, setSearchParams]);

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
      <StatusLegend type="application" />
      {message && <div className="mb-4 mt-3 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma vaga para começar a receber candidatos." />
      ) : (
        <div className="grid gap-4">
          <section className="grid gap-4 rounded-lg border border-white/10 bg-brand-charcoal p-4 shadow-soft ring-1 ring-white/5">
            <div className="candidate-hero-metrics">
              <StatTile variant="primary" icon={<UsersRound size={19} />} label="candidatos" value={generalStats.total} />
              <StatTile icon={<BriefcaseBusiness size={19} />} label="vagas" value={companyJobs.length} />
              <StatTile icon={<Clock3 size={19} />} label="em análise" value={generalStats.pending} />
              <StatTile tone="positive" icon={<CalendarCheck size={19} />} label="aprovados" value={generalStats.approved} />
            </div>
          </section>

          {pendingReviews.length > 0 && (
            <section className="candidate-selector-panel border-aqua-200 bg-aqua-50/70">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <Star size={18} /> Avaliações pendentes
                </div>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Finalize o pós-turno avaliando quem já concluiu o trabalho. Isso melhora a reputação do profissional e deixa o histórico da empresa organizado.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {pendingReviews.slice(0, 6).map(({ application, job, worker }) => (
                  <article key={application.id} className="rounded-lg border border-white/10 bg-brand-dark p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-white">{worker.name}</strong>
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
                value={selectedControlValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("event:")) {
                    setSearchParams({ evento: value.slice(6) });
                    return;
                  }
                  setSearchParams({ vaga: value });
                }}
              >
                {eventOptions.length > 0 && (
                  <optgroup label="Pacotes de evento">
                    {eventOptions.map((eventOption) => (
                      <option key={eventOption.key} value={`event:${eventOption.key}`}>
                        {eventOption.name} - {eventOption.jobs.length} vagas do pacote
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Vagas individuais">
                {companyJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {formatDate(job.date)} - {job.candidates} candidato{job.candidates === 1 ? "" : "s"}
                  </option>
                ))}
                </optgroup>
              </select>
            </label>
            {selectedJobs.length > 0 && (
              <div className="candidate-stat-grid">
                <Stat label="candidatos" value={String(stats.total)} />
                <Stat label="em análise" value={String(stats.pending)} />
                <Stat label="confirmados" value={`${selectedCapacity.filled}/${selectedCapacity.quantity}`} />
                <Stat label="vagas abertas" value={String(selectedCapacity.openSlots)} />
              </div>
            )}
            {selectedJobs.length > 0 && (
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
                <label className="flex min-h-11 items-center gap-2 self-end rounded-lg border border-slate-200 bg-brand-charcoal px-3 py-2 text-sm font-bold text-slate-600">
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

          {selectedJobs.length > 0 && (
            <section className="candidate-job-summary">
              <div className="candidate-job-main">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {!selectedEvent && selectedJob?.urgent && <UrgentBadge />}
                    <span className="badge">{selectedEvent ? "Pacote de evento" : selectedJob?.function}</span>
                    <span className="badge">
                      {selectedEvent ? `${selectedJobs.length} vagas` : formatCurrency(selectedJob?.dailyValue ?? 0)}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{selectedEvent ? selectedEvent.name : selectedJob?.title}</h3>
                  <p className="text-sm font-semibold text-slate-600">
                    {selectedEvent && selectedJobs[0]
                      ? `${selectedJobs[0].neighborhood} - ${formatDate(selectedJobs[0].date)} - ${selectedJobs[0].startsAt} até ${selectedJobs[0].endsAt}`
                      : selectedJob
                        ? `${selectedJob.neighborhood} - ${formatDate(selectedJob.date)} - ${selectedJob.startsAt} até ${selectedJob.endsAt}`
                        : ""}
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

          {selectedJobs.length === 0 || selectedApplications.length === 0 ? (
            <EmptyState
              title={selectedEvent ? "Nenhum candidato neste evento" : "Nenhum candidato nesta vaga"}
              text="Quando alguém se candidatar, os dados aparecerão aqui com ações de aprovação."
            />
          ) : visibleApplications.length === 0 ? (
            <EmptyState title="Nenhum candidato neste filtro" text="Altere o status ou desmarque somente confiáveis para ver mais candidatos." />
          ) : (
            <div className="grid gap-3">
              {visibleApplications.map((application) => {
                const worker = state.workers.find((item) => item.id === application.workerId);
                const jobForApplication = companyJobs.find((job) => job.id === application.jobId);
                if (!worker || !jobForApplication) return null;
                const favorite = state.favoriteWorkerIds.includes(worker.id);
                const approved = application.status === "Aprovada";
                const completed = application.status === "Trabalho concluído";
                const reviewed = worker.reviews.some(
                  (review) => review.jobId === jobForApplication.id && review.applicationId === application.id
                );
                const contactUnlocked = approved || completed;
                const refused = terminalStatuses.includes(application.status) && !approved;
                const noSlots = getOpenSlots(jobForApplication) === 0 && !approved && !completed;
                const isPendingInvite = application.status === "Convidada";
                const workerBlocked = state.adminModeration.blockedWorkerIds.includes(worker.id);
                const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
                const blockedAction = workerBlocked || companyBlocked;
                const verificationCode = getShiftVerificationCode(jobForApplication.id, worker.id);

                return (
                  <article key={application.id} className="candidate-card">
                    <WorkerCard worker={worker} functionFocus={jobForApplication.function} showActions={false} />
                    <div className="candidate-control-panel">
                      {selectedEvent && (
                        <div className="candidate-event-context">
                          <span>
                            <BriefcaseBusiness size={16} /> {jobForApplication.function}
                          </span>
                          <strong>{jobForApplication.title}</strong>
                          <small>
                            {jobForApplication.quantity} vaga{jobForApplication.quantity === 1 ? "" : "s"} • {formatCurrency(jobForApplication.dailyValue)} • {getOpenSlots(jobForApplication)} aberta{getOpenSlots(jobForApplication) === 1 ? "" : "s"}
                          </small>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge type="application" status={application.status} />
                          <span className="badge">Inscrito em {formatDate(application.createdAt.slice(0, 10))}</span>
                          <span className="badge bg-aqua-50 text-aqua-700"><TermHint term="codigoVerificacao">Código {verificationCode}</TermHint></span>
                        </div>
                        <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
                          <Heart size={17} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorito" : "Favoritar"}
                        </button>
                      </div>

                      <HiringFlow application={application} reviewed={reviewed} />

                      {blockedAction && (
                        <SafetyNotice title="Ações bloqueadas por segurança" tone="warning">
                          {workerBlocked
                            ? "Este profissional está em revisão pela administração. Aprovação, presença e convite ficam pausados."
                            : "Sua empresa está em revisão pela administração. As decisões de candidatos ficam pausadas."}
                        </SafetyNotice>
                      )}

                      {isPendingInvite ? (
                        <SafetyNotice title="Aguardando resposta do convite">
                          Você convidou este profissional diretamente. Ele ainda não aceitou nem recusou - as ações de aprovação ficam liberadas depois da resposta dele.
                        </SafetyNotice>
                      ) : (
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
                            onClick={() => runStatus(application.id, "Trabalho concluído")}
                            disabled={blockedAction || !approved}
                            className="primary"
                          >
                            <CheckCircle2 size={17} /> Concluir
                          </button>
                          <button
                            type="button"
                            onClick={() => runStatus(application.id, "Falta registrada")}
                            disabled={blockedAction || !approved}
                            className="danger"
                          >
                            Registrar falta
                          </button>
                        </div>
                      )}

                      {contactUnlocked ? (
                        <div className="candidate-contact-card">
                          <div>
                            <strong className="text-sm text-white">Contato liberado</strong>
                            <div className="mt-1 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                              <span className="flex items-center gap-1.5"><Phone size={15} /> {worker.phone}</span>
                              <span className="flex items-center gap-1.5"><Mail size={15} /> {worker.email}</span>
                            </div>
                          </div>
                          <a
                            className="primary"
                            href={getWhatsAppUrl(worker.phone, `Olá, ${worker.name}. Sua vaga ${jobForApplication.title} no ${currentCompany.establishmentName} foi aprovada.`)}
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
                            <strong className="text-sm text-white">
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
                            onClick={() => openReview(application, jobForApplication, worker.id, worker.name)}
                            disabled={reviewed}
                            className={reviewed ? "secondary" : "primary"}
                          >
                            <Star size={17} /> {reviewed ? "Avaliado" : "Avaliar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptTarget({ application, job: jobForApplication, worker })}
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
              <span className="text-sm font-black text-white">Nota</span>
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

function getJobStats(applications: Application[]) {
  return {
    total: applications.length,
    pending: applications.filter((item) => item.status === "Enviada" || item.status === "Em análise").length,
    completed: applications.filter((item) => item.status === "Trabalho concluído").length,
    noShow: applications.filter((item) => item.status === "Falta registrada").length
  };
}

function getSelectedCapacity(jobs: Job[]) {
  return jobs.reduce(
    (total, job) => ({
      quantity: total.quantity + job.quantity,
      filled: total.filled + job.filled,
      openSlots: total.openSlots + getOpenSlots(job)
    }),
    { quantity: 0, filled: 0, openSlots: 0 }
  );
}

function getEventCandidateOptions(jobs: Job[]): EventCandidateOption[] {
  const groups = new Map<string, EventCandidateOption>();

  jobs.forEach((job) => {
    const eventName = getEventPackageName(job);
    if (!eventName) return;

    const key = getEventPackageKey(job, eventName);
    const current = groups.get(key) ?? { key, name: eventName, jobs: [] };
    current.jobs.push(job);
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.jobs[0].date.localeCompare(a.jobs[0].date));
}

function getEventPackageName(job: Job) {
  if (!job.description.includes("Equipe criada pela aba Eventos")) return null;
  const separatorIndex = job.title.indexOf(":");
  if (separatorIndex <= 0) return null;
  return job.title.slice(0, separatorIndex).trim();
}

function getEventPackageKey(job: Job, eventName = getEventPackageName(job)) {
  return eventName ? `${eventName}|${job.date}|${job.startsAt}|${job.endsAt}` : "";
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

type StepState = "done" | "current" | "pending" | "blocked";
type HiringStep = { kicker: string; label: string; state: StepState };

function HiringFlow({
  application,
  reviewed
}: {
  application: Application;
  reviewed: boolean;
}) {
  const steps = getHiringSteps(application, reviewed);

  return (
    <div className="hiring-flow">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <strong className="text-sm text-white">Fluxo da contratação</strong>
        <span className="text-xs font-black uppercase text-slate-500">{getNextAction(application, reviewed)}</span>
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

function getHiringSteps(application: Application, reviewed: boolean): HiringStep[] {
  const approved = application.status === "Aprovada" || application.status === "Trabalho concluído";
  const completed = application.status === "Trabalho concluído";
  const rejected = application.status === "Recusada" || application.status === "Cancelada" || application.status === "Convite recusado";
  const isPendingInvite = application.status === "Convidada";

  return [
    { kicker: "1", label: isPendingInvite ? "Convite enviado" : "Candidatura", state: "done" },
    {
      kicker: "2",
      label: approved ? "Aprovado" : rejected ? "Encerrado" : isPendingInvite ? "Aguardando resposta" : "Aprovar",
      state: approved ? "done" : rejected ? "blocked" : "current"
    },
    {
      kicker: "3",
      label: completed ? "Trabalho concluído" : "Concluir turno",
      state: completed ? "done" : approved ? "current" : "pending"
    },
    {
      kicker: "4",
      label: reviewed ? "Avaliado" : "Avaliar",
      state: reviewed ? "done" : completed ? "current" : "pending"
    }
  ];
}

function getStepClass(state: StepState) {
  if (state === "done") return "border-aqua-200 bg-aqua-100 text-aqua-700";
  if (state === "current") return "border-navy-200 bg-white text-navy-950";
  if (state === "blocked") return "border-red-100 bg-red-50 text-alert";
  return "border-slate-200 bg-brand-charcoal text-slate-500";
}

function getNextAction(application: Application, reviewed: boolean) {
  if (application.status === "Recusada" || application.status === "Cancelada") return "Ciclo encerrado";
  if (application.status === "Convite recusado") return "Convite recusado pelo profissional";
  if (application.status === "Convidada") return "Aguardando resposta do profissional";
  if (application.status === "Falta registrada") return "Falta registrada";
  if (application.status === "Trabalho concluído") return reviewed ? "Contratação concluída" : "Avaliar profissional";
  if (application.status === "Aprovada") return "Concluir quando o turno terminar";
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
