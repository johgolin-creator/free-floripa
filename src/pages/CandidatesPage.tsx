import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Heart,
  Lock,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
  Star,
  UserCheck,
  UserRound,
  UserX
} from "lucide-react";
import { AvatarButton } from "../components/AvatarButton";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { ShiftReceipt } from "../components/ShiftReceipt";
import { StatusBadge } from "../components/StatusBadge";
import { TermHint } from "../components/TermHint";
import { UrgentBadge } from "../components/UrgentBadge";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { functionLabel } from "../lib/functionInfo";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { calculateReliability, getCompatibilityLabel, getOpenSlots, isWorkerVerified } from "../lib/rules";
import { getShiftVerificationCode } from "../lib/shiftVerification";
import type { AppState, Application, ApplicationStatus, Job, WorkerProfile } from "../lib/types";

// Cada candidatura cai em uma aba. Quem é aprovado ou recusado sai de
// "Aguardando" na hora e passa para a aba correspondente.
type CandidateTab = "aguardando" | "equipe" | "recusados";

const tabStatuses: Record<CandidateTab, ApplicationStatus[]> = {
  aguardando: ["Enviada", "Em análise", "Convidada"],
  equipe: ["Aprovada", "Trabalho concluído", "Falta registrada"],
  recusados: ["Recusada", "Convite recusado", "Cancelada"]
};

const tabLabels: Record<CandidateTab, { full: string; short: string }> = {
  aguardando: { full: "Aguardando decisão", short: "Aguardando" },
  equipe: { full: "Equipe confirmada", short: "Equipe" },
  recusados: { full: "Recusados", short: "Recusados" }
};

// Tempo da animação de saída do cartão antes de mudar o status.
const LEAVE_ANIMATION_MS = 220;

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
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [tab, setTab] = useState<CandidateTab>("aguardando");
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [profileWorker, setProfileWorker] = useState<{ worker: WorkerProfile; job: Job } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [receiptTarget, setReceiptTarget] = useState<ReceiptTarget | null>(null);
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
  const pendingCountByJobId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of applications) {
      if (!tabStatuses.aguardando.includes(application.status)) continue;
      counts.set(application.jobId, (counts.get(application.jobId) ?? 0) + 1);
    }
    return counts;
  }, [applications]);
  const selectedApplications = selectedJobs.length > 0 ? applications.filter((application) => selectedJobIds.has(application.jobId)) : [];
  const tabCounts = {
    aguardando: selectedApplications.filter((application) => tabStatuses.aguardando.includes(application.status)).length,
    equipe: selectedApplications.filter((application) => tabStatuses.equipe.includes(application.status)).length,
    recusados: selectedApplications.filter((application) => tabStatuses.recusados.includes(application.status)).length
  };
  const visibleApplications = useMemo(
    () =>
      selectedApplications
        .filter((application) => tabStatuses[tab].includes(application.status))
        .filter((application) => {
          if (tab !== "aguardando" || !trustedCandidatesOnly) return true;
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
    [selectedApplications, state, tab, trustedCandidatesOnly]
  );
  const selectedCapacity = useMemo(() => getSelectedCapacity(selectedJobs), [selectedJobs]);
  const pendingReviews = useMemo(
    () => getPendingReviews(applications, state.jobs, state.workers),
    [applications, state.jobs, state.workers]
  );
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const progress = selectedCapacity.quantity > 0 ? Math.min(100, Math.round((selectedCapacity.filled / selectedCapacity.quantity) * 100)) : 0;
  const headerJob = selectedEvent ? selectedJobs[0] : selectedJob;

  useEffect(() => {
    if (selectedEventKey && !selectedEvent) {
      setSearchParams({ vaga: companyJobs[0]?.id ?? "" }, { replace: true });
      return;
    }
    if (!selectedEventKey && companyJobs.length > 0 && !companyJobs.some((job) => job.id === selectedJobId)) {
      setSearchParams({ vaga: companyJobs[0].id }, { replace: true });
    }
  }, [companyJobs, selectedEvent, selectedEventKey, selectedJobId, setSearchParams]);

  // Aprovar/recusar: o cartão faz uma saída rápida e só então muda de aba.
  function decide(application: Application, worker: WorkerProfile, status: "Aprovada" | "Recusada" | "Em análise") {
    setLeavingIds((current) => [...current, application.id]);
    window.setTimeout(() => {
      const result = updateApplicationStatus(application.id, status);
      setLeavingIds((current) => current.filter((id) => id !== application.id));
      if (!result.ok) {
        setMessage({ text: result.message, ok: false });
        return;
      }
      const firstName = worker.name.split(" ")[0];
      setMessage({
        ok: true,
        text:
          status === "Aprovada"
            ? `${firstName} foi aprovado(a) e agora está em Equipe confirmada.`
            : status === "Recusada"
              ? `${firstName} foi recusado(a) e saiu da lista.`
              : `${firstName} voltou para Aguardando decisão.`
      });
    }, LEAVE_ANIMATION_MS);
  }

  function openProfile(application: Application, worker: WorkerProfile, job: Job) {
    setProfileWorker({ worker, job });
    // Abrir o perfil conta como "olhei a candidatura": sai de Enviada para Em análise.
    if (application.status === "Enviada" && !companyBlocked && !state.adminModeration.blockedWorkerIds.includes(worker.id)) {
      updateApplicationStatus(application.id, "Em análise");
    }
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
    setMessage({ ok: true, text: `Avaliação registrada para ${reviewTarget.workerName}.` });
    setReviewTarget(null);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Candidatos"
        title="Candidatos"
        description="Escolha a vaga, decida quem entra na equipe e acompanhe os confirmados."
      />

      {companyJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma vaga para começar a receber candidatos." />
      ) : (
        <div className="grid gap-4">
          <section className="cand-job-panel">
            <label className="label">
              Vaga
              <select
                className="input"
                value={selectedControlValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setTab("aguardando");
                  setMessage(null);
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
                        {eventOption.name} ({eventOption.jobs.length} funções)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Vagas">
                  {companyJobs.map((job) => {
                    const pending = pendingCountByJobId.get(job.id) ?? 0;
                    return (
                      <option key={job.id} value={job.id}>
                        {job.title} · {formatDate(job.date)}
                        {pending > 0 ? ` · ${pending} aguardando` : ""}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </label>

            {headerJob && (
              <div className="cand-job-summary">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!selectedEvent && selectedJob?.urgent && <UrgentBadge />}
                    <span className="cand-chip">{selectedEvent ? "Pacote de evento" : functionLabel(headerJob.function)}</span>
                    {!selectedEvent && <span className="cand-chip">{formatCurrency(headerJob.dailyValue)} / diária</span>}
                  </div>
                  <h3 className="cand-job-title">{selectedEvent ? selectedEvent.name : headerJob.title}</h3>
                  <p className="cand-job-meta">
                    {formatDate(headerJob.date)} · {headerJob.startsAt} às {headerJob.endsAt} · {headerJob.neighborhood}
                  </p>
                </div>
                <div className="cand-team-meter">
                  <div className="flex items-baseline justify-between gap-3">
                    <span>Equipe</span>
                    <strong>
                      {selectedCapacity.filled} de {selectedCapacity.quantity}
                    </strong>
                  </div>
                  <div className="company-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <small>
                    {selectedCapacity.openSlots === 0
                      ? "Equipe completa"
                      : `${selectedCapacity.openSlots} vaga${selectedCapacity.openSlots === 1 ? "" : "s"} em aberto`}
                  </small>
                </div>
              </div>
            )}
          </section>

          {pendingReviews.length > 0 && (
            <button
              type="button"
              className="cand-review-banner"
              onClick={() => {
                const first = pendingReviews[0];
                setSearchParams({ vaga: first.job.id });
                setTab("equipe");
                openReview(first.application, first.job, first.worker.id, first.worker.name);
              }}
            >
              <Star size={18} />
              <span>
                <strong>
                  {pendingReviews.length} avaliaç{pendingReviews.length === 1 ? "ão pendente" : "ões pendentes"}
                </strong>{" "}
                de quem já concluiu o trabalho
              </span>
              <span className="cand-review-banner-cta">Avaliar agora</span>
            </button>
          )}

          {companyBlocked && (
            <div className="cand-alert">
              <AlertTriangle size={17} /> Sua empresa está em revisão pela administração. As decisões de candidatos ficam pausadas.
            </div>
          )}

          <div className="cand-tabs" role="tablist" aria-label="Situação dos candidatos">
            {(Object.keys(tabLabels) as CandidateTab[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => {
                  setTab(item);
                  setMessage(null);
                }}
                className={`cand-tab ${tab === item ? "is-active" : ""}`}
              >
                <span className="hidden sm:inline">{tabLabels[item].full}</span>
                <span className="sm:hidden">{tabLabels[item].short}</span>
                <span className="cand-tab-count">{tabCounts[item]}</span>
              </button>
            ))}
          </div>

          {message && (
            <div className={`cand-toast ${message.ok ? "" : "is-error"}`} role="status">
              {message.ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />} {message.text}
            </div>
          )}

          {tab === "aguardando" && tabCounts.aguardando > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-500">
                Ordenados pela confiabilidade. O contato é liberado depois da aprovação.
              </p>
              <label className="cand-toggle">
                <input
                  type="checkbox"
                  checked={trustedCandidatesOnly}
                  onChange={(event) => setTrustedCandidatesOnly(event.target.checked)}
                />
                <ShieldCheck size={16} /> Somente confiáveis
              </label>
            </div>
          )}

          {visibleApplications.length === 0 ? (
            <EmptyState {...getEmptyCopy(tab, selectedApplications.length, trustedCandidatesOnly)} />
          ) : (
            <div className="grid gap-2.5">
              {visibleApplications.map((application) => {
                const worker = state.workers.find((item) => item.id === application.workerId);
                const job = companyJobs.find((item) => item.id === application.jobId);
                if (!worker || !job) return null;
                const workerBlocked = state.adminModeration.blockedWorkerIds.includes(worker.id);
                const blockedAction = workerBlocked || companyBlocked;
                const leaving = leavingIds.includes(application.id);

                return (
                  <article key={application.id} className={`cand-card ${leaving ? "is-leaving" : ""}`}>
                    <CandidateIdentity
                      worker={worker}
                      job={job}
                      showJob={Boolean(selectedEvent)}
                      status={application.status}
                      showRiskWarning={tab === "aguardando"}
                      onOpenProfile={() => openProfile(application, worker, job)}
                    />

                    {tab === "aguardando" && (
                      <PendingActions
                        application={application}
                        job={job}
                        disabled={blockedAction || leaving}
                        workerBlocked={workerBlocked}
                        onOpenProfile={() => openProfile(application, worker, job)}
                        onApprove={() => decide(application, worker, "Aprovada")}
                        onRefuse={() => decide(application, worker, "Recusada")}
                      />
                    )}

                    {tab === "equipe" && (
                      <TeamActions
                        application={application}
                        job={job}
                        worker={worker}
                        companyName={currentCompany.establishmentName}
                        favorite={state.favoriteWorkerIds.includes(worker.id)}
                        onToggleFavorite={() => toggleFavorite(worker.id)}
                        onReview={() => openReview(application, job, worker.id, worker.name)}
                        onReceipt={() => setReceiptTarget({ application, job, worker })}
                      />
                    )}

                    {tab === "recusados" && (
                      <div className="cand-actions">
                        {application.status === "Recusada" && (
                          <button
                            type="button"
                            className="cand-btn"
                            disabled={blockedAction || leaving}
                            onClick={() => decide(application, worker, "Em análise")}
                          >
                            <RotateCcw size={16} /> Reconsiderar
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {profileWorker && (
        <Modal title={profileWorker.worker.name} onClose={() => setProfileWorker(null)}>
          <WorkerCard worker={profileWorker.worker} functionFocus={profileWorker.job.function} showActions={false} />
        </Modal>
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

function CandidateIdentity({
  worker,
  job,
  showJob,
  status,
  showRiskWarning,
  onOpenProfile
}: {
  worker: WorkerProfile;
  job: Job;
  showJob: boolean;
  status: ApplicationStatus;
  showRiskWarning: boolean;
  onOpenProfile: () => void;
}) {
  const reliability = calculateReliability(worker);
  const riskyHistory = showRiskWarning && (worker.cancellations >= 3 || worker.attendanceRate < 85);

  return (
    <div className="cand-identity">
      <AvatarButton src={worker.avatarUrl} name={worker.name} className="h-14 w-14 rounded-lg object-cover" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button type="button" onClick={onOpenProfile} className="cand-name">
            {worker.name}
          </button>
          {isWorkerVerified(worker) && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-aqua-700">
              <CheckCircle2 size={13} /> Verificado
            </span>
          )}
          <StatusBadge type="application" status={status} />
        </div>
        <p className="cand-sub">
          {showJob ? `${functionLabel(job.function)} · ` : ""}
          {getCompatibilityLabel(worker, job.function)}
        </p>
        <div className="cand-metrics">
          <span>
            <Star size={13} /> {worker.rating.toFixed(1)}
          </span>
          <span>{worker.completedJobs} trabalhos</span>
          <span>{worker.attendanceRate}% presença</span>
          <span className="is-highlight">
            <TermHint term="confiabilidade">{reliability}% confiável</TermHint>
          </span>
        </div>
        {riskyHistory && (
          <p className="cand-warning">
            <AlertTriangle size={13} /> Histórico com faltas ou cancelamentos: confirme disponibilidade antes de aprovar.
          </p>
        )}
      </div>
    </div>
  );
}

function PendingActions({
  application,
  job,
  disabled,
  workerBlocked,
  onOpenProfile,
  onApprove,
  onRefuse
}: {
  application: Application;
  job: Job;
  disabled: boolean;
  workerBlocked: boolean;
  onOpenProfile: () => void;
  onApprove: () => void;
  onRefuse: () => void;
}) {
  if (application.status === "Convidada") {
    return (
      <div className="cand-actions">
        <span className="cand-note">
          <Clock3 size={15} /> Convite enviado. Aguardando a resposta do profissional.
        </span>
      </div>
    );
  }

  const noSlots = getOpenSlots(job) === 0;

  return (
    <div className="cand-actions">
      {workerBlocked && (
        <span className="cand-note is-warning">
          <AlertTriangle size={15} /> Perfil em revisão pela administração
        </span>
      )}
      <button type="button" onClick={onOpenProfile} className="cand-btn">
        <UserRound size={16} /> Perfil
      </button>
      <button type="button" onClick={onRefuse} disabled={disabled} className="cand-btn is-danger">
        <UserX size={16} /> Recusar
      </button>
      <button type="button" onClick={onApprove} disabled={disabled || noSlots} className="cand-btn is-primary">
        <UserCheck size={16} /> {noSlots ? "Equipe completa" : "Aprovar"}
      </button>
    </div>
  );
}

function TeamActions({
  application,
  job,
  worker,
  companyName,
  favorite,
  onToggleFavorite,
  onReview,
  onReceipt
}: {
  application: Application;
  job: Job;
  worker: WorkerProfile;
  companyName: string;
  favorite: boolean;
  onToggleFavorite: () => void;
  onReview: () => void;
  onReceipt: () => void;
}) {
  const completed = application.status === "Trabalho concluído";
  const reviewed = worker.reviews.some((review) => review.jobId === job.id && review.applicationId === application.id);
  const contactUnlocked = application.status === "Aprovada" || completed;
  const verificationCode = getShiftVerificationCode(job.id, worker.id);

  return (
    <div className="cand-actions cand-team-actions">
      {contactUnlocked ? (
        <span className="cand-contact">
          <Phone size={14} /> {worker.phone}
          <span className="text-slate-500">·</span>
          <TermHint term="codigoVerificacao">código {verificationCode}</TermHint>
        </span>
      ) : (
        <span className="cand-note">
          <Lock size={15} /> Contato indisponível
        </span>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`cand-btn is-icon ${favorite ? "is-favorite" : ""}`}
          aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
          title={favorite ? "Remover dos favoritos" : "Favoritar"}
        >
          <Heart size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
        {completed && !reviewed && (
          <button type="button" onClick={onReview} className="cand-btn is-primary">
            <Star size={16} /> Avaliar
          </button>
        )}
        {completed && (
          <button type="button" onClick={onReceipt} className="cand-btn">
            <ClipboardCheck size={16} /> Comprovante
          </button>
        )}
        {contactUnlocked && (
          <a
            className="cand-btn is-primary"
            href={getWhatsAppUrl(worker.phone, `Olá, ${worker.name}. Sua vaga ${job.title} no ${companyName} foi aprovada.`)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function getEmptyCopy(tab: CandidateTab, totalApplications: number, trustedOnly: boolean) {
  if (totalApplications === 0) {
    return {
      title: "Nenhum candidato ainda",
      text: "Quando alguém se candidatar a esta vaga, aparece aqui para você aprovar ou recusar."
    };
  }
  if (tab === "aguardando") {
    return trustedOnly
      ? { title: "Nenhum candidato confiável aguardando", text: "Desmarque \"Somente confiáveis\" para ver todos." }
      : { title: "Tudo decidido por aqui", text: "Não há candidatos aguardando decisão nesta vaga." };
  }
  if (tab === "equipe") {
    return { title: "Ninguém confirmado ainda", text: "Aprove candidatos em \"Aguardando decisão\" para montar a equipe." };
  }
  return { title: "Nenhum recusado", text: "Candidatos recusados ficam guardados aqui, fora da lista principal." };
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
