import { getFunctionExperience, isJobOpenForApplications, isWorkerVerified } from "./rules";
import type { AppState, Application, CompanyProfile, CompanyReview, Job, Review, WorkerProfile } from "./types";

// Feed da tela inicial (Issue #15). Monta os "posts" a partir dos dados que
// o app já tem (vagas, candidaturas, avaliações e histórico de turnos); não
// existe tabela de posts. Seguir, comentários e posts criados pelos usuários
// ficam para as Issues #16 e #17.

export type FeedItem =
  | { kind: "job"; id: string; job: Job; company?: CompanyProfile; matchScore?: number }
  | { kind: "companyReview"; id: string; review: CompanyReview; company?: CompanyProfile; authorAvatar?: string; createdAt: string }
  | { kind: "workerReview"; id: string; review: Review; worker: WorkerProfile; authorAvatar?: string; createdAt: string }
  | { kind: "application"; id: string; application: Application; job: Job; worker: WorkerProfile; createdAt: string }
  | { kind: "milestone"; id: string; worker: WorkerProfile; turns: number }
  | { kind: "spotlight"; id: string; worker: WorkerProfile };

type DatedFeedItem = Extract<FeedItem, { createdAt: string }>;

export type FeedTab = "Para você" | "Vagas" | "Candidatos" | "Novidades";

const MILESTONES = [100, 50, 25, 10, 5];

export function getWorkerJobScore(job: Job, worker: WorkerProfile) {
  const experience = getFunctionExperience(worker, job.function);
  return (
    (experience ? 45 : 0) +
    (job.neighborhood === worker.neighborhood ? 18 : job.distanceKm <= worker.maxDistanceKm ? 10 : 0) +
    (job.urgent ? 10 : 0) +
    (job.dailyValue >= 250 ? 10 : 0) +
    (experience?.verified ? 10 : 0) +
    (experience && experience.level !== "Iniciante" ? 7 : 0)
  );
}

/** Maior marco de turnos já alcançado (5, 10, 25...), ou 0 se nenhum. */
function reachedMilestone(completedJobs: number) {
  return MILESTONES.find((value) => completedJobs >= value) ?? 0;
}

function byNewest<T extends { createdAt: string }>(a: T, b: T) {
  return b.createdAt.localeCompare(a.createdAt);
}

/** Intercala: a cada `every` itens principais entra 1 item social. */
function interleave(primary: FeedItem[], social: FeedItem[], every = 2): FeedItem[] {
  const result: FeedItem[] = [];
  let s = 0;
  primary.forEach((item, index) => {
    result.push(item);
    if ((index + 1) % every === 0 && s < social.length) result.push(social[s++]);
  });
  return result.concat(social.slice(s));
}

function workerAvatar(state: AppState, workerId: string) {
  return state.workers.find((worker) => worker.id === workerId)?.avatarUrl;
}

function visibleWorkers(state: AppState) {
  return state.workers.filter((worker) => !state.adminModeration.blockedWorkerIds.includes(worker.id));
}

function milestoneItems(workers: WorkerProfile[]): FeedItem[] {
  return workers
    .map((worker) => ({ worker, turns: reachedMilestone(worker.completedJobs) }))
    .filter(({ turns }) => turns > 0)
    .sort((a, b) => b.turns - a.turns)
    .map(({ worker, turns }) => ({ kind: "milestone" as const, id: `milestone-${worker.id}-${turns}`, worker, turns }));
}

export function buildWorkerFeed(state: AppState, worker: WorkerProfile, tab: FeedTab): FeedItem[] {
  const companyById = new Map(state.companies.map((company) => [company.id, company]));
  const blockedCompanies = new Set(state.adminModeration.blockedCompanyIds);

  const jobs: FeedItem[] = state.jobs
    .filter((job) => isJobOpenForApplications(job) && !blockedCompanies.has(job.companyId))
    .map((job) => ({ job, score: getWorkerJobScore(job, worker) }))
    .sort((a, b) => b.score - a.score || a.job.date.localeCompare(b.job.date))
    .map(({ job, score }) => ({ kind: "job", id: `job-${job.id}`, job, company: companyById.get(job.companyId), matchScore: score }));

  if (tab === "Vagas") return jobs;

  const companyReviews: DatedFeedItem[] = state.companyReviews
    .filter((review) => !blockedCompanies.has(review.companyId))
    .map((review) => ({
      kind: "companyReview",
      id: `company-review-${review.id}`,
      review,
      company: companyById.get(review.companyId),
      authorAvatar: workerAvatar(state, review.workerId),
      createdAt: review.createdAt
    }));
  const myReviews: DatedFeedItem[] = worker.reviews.map((review) => ({
    kind: "workerReview",
    id: `worker-review-${review.id}`,
    review,
    worker,
    // Review guarda só o nome de quem avaliou; casa com a empresa pelo nome.
    authorAvatar: state.companies.find((company) => company.establishmentName === review.authorName)?.logoUrl,
    createdAt: review.createdAt ?? ""
  }));
  const social = [
    ...[...myReviews, ...companyReviews].sort(byNewest),
    ...milestoneItems(visibleWorkers(state))
  ];

  if (tab === "Novidades") return social;
  return interleave(jobs, social);
}

export function buildCompanyFeed(state: AppState, company: CompanyProfile, tab: FeedTab): FeedItem[] {
  const companyJobs = new Map(state.jobs.filter((job) => job.companyId === company.id).map((job) => [job.id, job]));
  const workers = visibleWorkers(state);
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));

  const applications: FeedItem[] = state.applications
    .filter((application) => companyJobs.has(application.jobId) && workerById.has(application.workerId))
    .filter((application) => application.status !== "Cancelada" && application.status !== "Convidada")
    .sort(byNewest)
    .map((application) => ({
      kind: "application",
      id: `application-${application.id}`,
      application,
      job: companyJobs.get(application.jobId) as Job,
      worker: workerById.get(application.workerId) as WorkerProfile,
      createdAt: application.createdAt
    }));

  if (tab === "Candidatos") return applications;

  const reviews: FeedItem[] = state.companyReviews
    .filter((review) => review.companyId === company.id)
    .sort(byNewest)
    .map((review) => ({
      kind: "companyReview",
      id: `company-review-${review.id}`,
      review,
      company,
      authorAvatar: workerAvatar(state, review.workerId),
      createdAt: review.createdAt
    }));
  const spotlights: FeedItem[] = workers
    .filter((worker) => isWorkerVerified(worker) && worker.completedJobs > 0)
    .sort((a, b) => b.rating - a.rating || b.completedJobs - a.completedJobs)
    .slice(0, 6)
    .map((worker) => ({ kind: "spotlight", id: `spotlight-${worker.id}`, worker }));
  // Quem já aparece em destaque não repete logo em seguida como conquista.
  const spotlighted = new Set(spotlights.map((item) => (item.kind === "spotlight" ? item.worker.id : "")));
  const social = [...reviews, ...milestoneItems(workers.filter((worker) => !spotlighted.has(worker.id)))];

  if (tab === "Novidades") return interleave(spotlights, social, 1);
  return interleave(applications, interleave(spotlights, social, 1));
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data, para itens antigos. */
export function timeAgo(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff) || diff < 0) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days === 1 ? "" : "s"}`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}
