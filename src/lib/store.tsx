import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { initialState } from "../data/demoData";
import { useAuth } from "./auth";
import { canApply, getOpenSlots } from "./rules";
import {
  loadCompanyMarketplace,
  loadPublicWorkerProfiles,
  loadRemoteNotifications,
  loadWorkerMarketplace,
  markRemoteNotificationRead,
  markRemoteRoleNotificationsRead,
  publishApplication,
  publishCompanyProfile,
  publishCompanyReview,
  publishInvitedApplication,
  publishJob,
  publishNotification,
  publishWorkerProfile,
  publishWorkerReview,
  supabaseMarketplaceEnabled,
  updateRemoteApplicationStatus,
  type MarketplaceJobsPayload
} from "./supabaseMarketplace";
import { getSupabaseStateKey, loadSupabaseState, saveSupabaseState, supabaseStateEnabled } from "./supabaseState";
import {
  loadModerationOverview,
  publishTrustReport,
  resolveTrustReportRemote,
  setModerationBlock,
  supabaseModerationEnabled
} from "./supabaseModeration";
import {
  grantRemoteCoins,
  loadRemoteCoinAccount,
  supabaseCoinsEnabled,
  unlockRemoteJobWithCoin,
  type CoinAccount
} from "./supabaseCoins";
import { emailNotificationsEnabled, enqueueEmailNotification, type EmailNotificationInput } from "./emailNotifications";
import type { AppState, Application, ApplicationStatus, ChatMessage, CompanyProfile, CompanyReview, CompanySchedule, CompanyScheduleStatus, Job, JobFunction, JobStatus, Neighborhood, PaymentMethod, Review, TrustReportTargetType, UserRole, WorkerProfile } from "./types";

const STORAGE_KEY = "free-floripa:state";
const DEFAULT_WORKER_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80";
const DEFAULT_COMPANY_LOGO = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80";
const DEMO_WORKER_IDS = new Set(["worker-1", "worker-2", "worker-3", "worker-4"]);
const DEMO_COMPANY_IDS = new Set(["company-1", "company-2", "company-3"]);
const DEMO_APPLICATION_IDS = new Set(["application-1", "application-2", "application-3"]);

export interface CreateJobInput {
  title: string;
  function: JobFunction;
  quantity: number;
  date: string;
  startsAt: string;
  endsAt: string;
  dailyValue: number;
  paymentMethod: PaymentMethod;
  approximateAddress: string;
  fullAddress: string;
  neighborhood: Neighborhood;
  uniform: string;
  requiredExperience: string;
  description: string;
  benefits: string[];
  urgent: boolean;
}

export interface UrgentReplacementInput {
  function: JobFunction;
  quantity: number;
  startsAt: string;
  dailyValue: number;
  neighborhood: Neighborhood;
  observation: string;
}

export interface CompanyScheduleInput {
  title: string;
  function: JobFunction;
  quantity: number;
  date: string;
  startsAt: string;
  endsAt: string;
  neighborhood: Neighborhood;
  location: string;
  notes: string;
  workerNames: string[];
  status: CompanyScheduleStatus;
}

interface AppContextValue {
  state: AppState;
  storageMode: "supabase" | "local";
  syncStatus: "carregando" | "sincronizado" | "salvando" | "local" | "erro";
  syncError: string;
  currentWorker: AppState["workers"][number];
  currentCompany: AppState["companies"][number];
  setRole: (role: AppState["activeRole"]) => void;
  createJob: (input: CreateJobInput) => string;
  createUrgentReplacement: (input: UrgentReplacementInput) => string;
  createCompanySchedule: (input: CompanyScheduleInput) => string;
  updateCompanySchedule: (scheduleId: string, input: CompanyScheduleInput) => { ok: boolean; message: string };
  deleteCompanySchedule: (scheduleId: string) => { ok: boolean; message: string };
  updateJobStatus: (jobId: string, status: JobStatus) => { ok: boolean; message: string };
  duplicateJob: (jobId: string) => { ok: boolean; message: string; jobId?: string };
  updateWorkerProfile: (input: Partial<Pick<WorkerProfile, "name" | "phone" | "email" | "avatarUrl" | "birthDate" | "city" | "neighborhood" | "functions" | "functionExperience" | "experience" | "description" | "availability" | "hasTransport" | "maxDistanceKm">>) => void;
  updateCompanyProfile: (input: Partial<CompanyProfile>) => void;
  applyToJob: (jobId: string) => { ok: boolean; message: string; requiresPlan?: boolean };
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => { ok: boolean; message: string };
  toggleFavorite: (workerId: string) => void;
  inviteWorkerToJob: (workerId: string, jobId: string) => { ok: boolean; message: string };
  markNotificationRead: (notificationId: string) => void;
  markRoleNotificationsRead: (role: AppState["activeRole"]) => void;
  markChatConversationRead: (applicationId: string) => void;
  sendChatMessage: (applicationId: string, body: string) => { ok: boolean; message: string };
  unlockJobWithCoins: (jobId: string) => { ok: boolean; message: string };
  subscribeProfessional: () => void;
  subscribePlus: () => void;
  buyCredits: (amount?: number) => void;
  addReview: (workerId: string, review: Omit<Review, "id">) => void;
  addCompanyReview: (companyId: string, review: Omit<CompanyReview, "id" | "companyId" | "createdAt">) => { ok: boolean; message: string };
  toggleWorkerBlock: (workerId: string) => void;
  toggleCompanyBlock: (companyId: string) => void;
  submitTrustReport: (input: { targetType: TrustReportTargetType; targetId: string; targetName: string; reason: string }) => { ok: boolean; message: string };
  resolveTrustReport: (reportId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function getLocalStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function loadInitialState(storageKey = STORAGE_KEY, fallbackState = initialState): AppState {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? mergeSeedUpdates(JSON.parse(raw)) : fallbackState;
  } catch {
    return fallbackState;
  }
}

function persist(nextState: AppState, storageKey = STORAGE_KEY) {
  localStorage.setItem(storageKey, JSON.stringify(nextState));
}

function countApproved(applications: Application[], jobId: string) {
  return applications.filter(
    (application) =>
      application.jobId === jobId && (application.status === "Aprovada" || application.status === "Trabalho concluído")
  ).length;
}

function coinLedgerEntry(input: Omit<AppState["coinLedger"][number], "id" | "createdAt">): AppState["coinLedger"][number] {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };
}

function mergeSeedUpdates(savedState: AppState): AppState {
  const securityJob = initialState.jobs.find((job) => job.id === "job-6");
  const seededWorker = initialState.workers.find((worker) => worker.id === "worker-3");
  const normalizedState = {
    ...savedState,
    subscription: {
      ...savedState.subscription,
      companyCreditsRemaining: Number.isFinite(savedState.subscription?.companyCreditsRemaining)
        ? savedState.subscription.companyCreditsRemaining
        : 0,
      unlockedJobIds: Array.isArray(savedState.subscription?.unlockedJobIds)
        ? savedState.subscription.unlockedJobIds
        : []
    },
    companySchedules: Array.isArray(savedState.companySchedules) ? savedState.companySchedules : [],
    chatMessages: Array.isArray(savedState.chatMessages) ? savedState.chatMessages : [],
    companyReviews: Array.isArray(savedState.companyReviews) ? savedState.companyReviews : [],
    coinLedger: Array.isArray(savedState.coinLedger) ? savedState.coinLedger : [],
    trustReports: Array.isArray(savedState.trustReports) ? savedState.trustReports : [],
    adminModeration: {
      blockedWorkerIds: Array.isArray(savedState.adminModeration?.blockedWorkerIds)
        ? savedState.adminModeration.blockedWorkerIds
        : [],
      blockedCompanyIds: Array.isArray(savedState.adminModeration?.blockedCompanyIds)
        ? savedState.adminModeration.blockedCompanyIds
        : []
    }
  };
  let changed =
    !Array.isArray(savedState.companySchedules) ||
    !Array.isArray(savedState.chatMessages) ||
    !Array.isArray(savedState.companyReviews) ||
    !Array.isArray(savedState.coinLedger) ||
    !Array.isArray(savedState.trustReports) ||
    !Number.isFinite(savedState.subscription?.companyCreditsRemaining) ||
    !Array.isArray(savedState.subscription?.unlockedJobIds) ||
    !Array.isArray(savedState.adminModeration?.blockedWorkerIds) ||
    !Array.isArray(savedState.adminModeration?.blockedCompanyIds);

  const jobs =
    securityJob && !normalizedState.jobs.some((job) => job.id === securityJob.id)
      ? [securityJob, ...normalizedState.jobs]
      : normalizedState.jobs;
  changed ||= jobs !== normalizedState.jobs;

  const workers = seededWorker
    ? normalizedState.workers.map((worker) => {
        if (worker.id !== seededWorker.id) return worker;

        const functions = Array.from(new Set([...worker.functions, ...seededWorker.functions]));
        const functionExperience = [
          ...worker.functionExperience,
          ...seededWorker.functionExperience.filter(
            (seedExperience) =>
              !worker.functionExperience.some((experience) => experience.function === seedExperience.function)
          )
        ];

        const updated =
          functions.length !== worker.functions.length || functionExperience.length !== worker.functionExperience.length;
        changed ||= updated;

        return updated
          ? {
              ...worker,
              functions,
              functionExperience,
              experience: worker.experience.includes("Controle de acesso")
                ? worker.experience
                : `${worker.experience} Controle de acesso.`
            }
          : worker;
      })
    : normalizedState.workers;

  return changed ? { ...normalizedState, jobs, workers } : normalizedState;
}

function getMetadataString(user: User, key: string, fallback = "") {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getMetadataNumber(user: User, key: string, fallback: number) {
  const value = user.user_metadata?.[key];
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function getMetadataBoolean(user: User, key: string, fallback = false) {
  const value = user.user_metadata?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function getMetadataStrings(user: User, key: string, fallback: string[]) {
  const value = user.user_metadata?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

function createWorkerForUser(user: User): WorkerProfile {
  const functions = getMetadataStrings(user, "functions", ["Garçom"]) as JobFunction[];
  const functionLevels = Array.isArray(user.user_metadata?.functionLevels) ? user.user_metadata.functionLevels : [];

  return {
    id: user.id,
    name: getMetadataString(user, "name", user.email ?? "Trabalhador PONT"),
    phone: getMetadataString(user, "phone", ""),
    email: user.email ?? getMetadataString(user, "email", ""),
    avatarUrl: getMetadataString(user, "avatarUrl", DEFAULT_WORKER_AVATAR),
    birthDate: getMetadataString(user, "birthDate", "2000-01-01"),
    city: getMetadataString(user, "city", "Florianópolis"),
    neighborhood: getMetadataString(user, "neighborhood", "Centro") as Neighborhood,
    functions,
    functionExperience: functions.map((functionName) => {
      const levelItem = functionLevels.find(
        (item) =>
          item &&
          typeof item === "object" &&
          "function" in item &&
          item.function === functionName &&
          "level" in item &&
          typeof item.level === "string"
      ) as { level?: string; months?: unknown; acceptsAssistant?: unknown } | undefined;
      const months = typeof levelItem?.months === "number" ? levelItem.months : Number(levelItem?.months ?? 0);

      return {
        function: functionName,
        level: (levelItem?.level ?? "Iniciante") as WorkerProfile["functionExperience"][number]["level"],
        months: Number.isFinite(months) && months > 0 ? months : 0,
        acceptsAssistant: false,
        verified: false
      };
    }),
    experience: getMetadataString(user, "experience", ""),
    description: getMetadataString(user, "description", "Perfil recém-criado no PONT."),
    availability: getMetadataString(user, "availability", "A combinar"),
    hasTransport: getMetadataBoolean(user, "hasTransport", false),
    maxDistanceKm: getMetadataNumber(user, "maxDistanceKm", 10),
    rating: 0,
    completedJobs: 0,
    attendanceRate: 100,
    punctualityRate: 100,
    cancellations: 0,
    reviews: [],
    verified: false
  };
}

function createCompanyForUser(user: User): CompanyProfile {
  return {
    id: user.id,
    establishmentName: getMetadataString(user, "establishmentName", "Empresa PONT"),
    responsibleName: getMetadataString(user, "responsibleName", "Responsável"),
    cnpj: getMetadataString(user, "cnpj", ""),
    phone: getMetadataString(user, "phone", ""),
    email: user.email ?? getMetadataString(user, "email", ""),
    category: getMetadataString(user, "category", "Outro") as CompanyProfile["category"],
    address: getMetadataString(user, "address", ""),
    neighborhood: getMetadataString(user, "neighborhood", "Centro") as Neighborhood,
    description: getMetadataString(user, "description", "Empresa cadastrada no PONT."),
    logoUrl: getMetadataString(user, "logoUrl", DEFAULT_COMPANY_LOGO),
    rating: 0
  };
}

function createStateForUser(user: User | null, role: UserRole | null): AppState {
  if (!user || !role) return initialState;

  if (role === "empresa") {
    const company = createCompanyForUser(user);
    return {
      ...initialState,
      activeRole: "empresa",
      selectedWorkerId: "",
      selectedCompanyId: company.id,
      workers: [],
      companies: [company],
      jobs: [],
      companySchedules: [],
      applications: [],
      favoriteWorkerIds: [],
      notifications: [],
      chatMessages: []
    };
  }

  const worker = createWorkerForUser(user);
  return {
    ...initialState,
    activeRole: "trabalhador",
    selectedWorkerId: worker.id,
    workers: [worker],
    applications: [],
    favoriteWorkerIds: [],
    notifications: [],
    chatMessages: []
  };
}

function removeDemoWorkers(state: AppState) {
  const applications = state.applications.filter(
    (application) => !DEMO_APPLICATION_IDS.has(application.id) && !DEMO_WORKER_IDS.has(application.workerId)
  );
  return {
    ...state,
    workers: state.workers.filter((worker) => !DEMO_WORKER_IDS.has(worker.id)),
    applications,
    favoriteWorkerIds: state.favoriteWorkerIds.filter((workerId) => !DEMO_WORKER_IDS.has(workerId)),
    notifications: state.notifications.filter((notification) => !notification.id.startsWith("notification-")),
    chatMessages: (state.chatMessages ?? []).filter(
      (message) => !DEMO_APPLICATION_IDS.has(message.applicationId) && !DEMO_WORKER_IDS.has(message.workerId)
    )
  };
}

function mergePublicWorkers(state: AppState, publicWorkers: WorkerProfile[]) {
  if (publicWorkers.length === 0) return removeDemoWorkers(state);

  const publicIds = new Set(publicWorkers.map((worker) => worker.id));
  return {
    ...removeDemoWorkers(state),
    workers: [
      ...publicWorkers,
      ...state.workers.filter((worker) => !DEMO_WORKER_IDS.has(worker.id) && !publicIds.has(worker.id))
    ]
  };
}

function mergeCompanies(currentCompanies: CompanyProfile[], incomingCompanies: CompanyProfile[]) {
  const incomingIds = new Set(incomingCompanies.map((company) => company.id));
  return [...incomingCompanies, ...currentCompanies.filter((company) => !incomingIds.has(company.id))];
}

function applyApplicationCounts(jobs: Job[], applications: Application[]) {
  return jobs.map((job) => ({
    ...job,
    candidates: applications.filter((application) => application.jobId === job.id).length,
    filled: Math.min(job.quantity, countApproved(applications, job.id))
  }));
}

function mergeCompanyMarketplaceState(state: AppState, companyId: string, payload: MarketplaceJobsPayload) {
  const companyJobIds = new Set([
    ...state.jobs.filter((job) => job.companyId === companyId).map((job) => job.id),
    ...payload.jobs.map((job) => job.id)
  ]);
  const payloadApplicationIds = new Set(payload.applications.map((application) => application.id));
  const applications = [
    ...payload.applications,
    ...state.applications.filter(
      (application) => !companyJobIds.has(application.jobId) && !payloadApplicationIds.has(application.id)
    )
  ];

  return {
    ...state,
    jobs: applyApplicationCounts(
      [...payload.jobs, ...state.jobs.filter((job) => job.companyId !== companyId)],
      applications
    ),
    applications
  };
}

function mergeWorkerMarketplaceState(state: AppState, workerId: string, payload: MarketplaceJobsPayload) {
  const payloadJobIds = new Set(payload.jobs.map((job) => job.id));
  const payloadApplicationIds = new Set(payload.applications.map((application) => application.id));
  const applications = [
    ...payload.applications,
    ...state.applications.filter(
      (application) => application.workerId !== workerId && !payloadApplicationIds.has(application.id)
    )
  ];

  return {
    ...state,
    companies: mergeCompanies(state.companies, payload.companies),
    jobs: applyApplicationCounts(
      [...payload.jobs, ...state.jobs.filter((job) => !payloadJobIds.has(job.id))],
      applications
    ),
    applications
  };
}

function mergeModerationState(state: AppState, overview: Awaited<ReturnType<typeof loadModerationOverview>>) {
  // Keep the moderator's own worker/company entry as the SAME object reference
  // (instead of the freshly-fetched copy) so currentWorker/currentCompany stay
  // referentially stable. Otherwise the effect that auto-republishes the
  // logged-in worker's profile on every currentWorker change (store.tsx,
  // "publishWorkerProfile(user, currentWorker)") re-fires right after this
  // merge, racing its own DELETE+INSERT of worker_function_experience against
  // the in-flight one and failing with a 409, which surfaces as "Falha ao
  // salvar" even though nothing is actually wrong.
  const ownWorker = state.workers.find((worker) => worker.id === state.selectedWorkerId);
  const ownCompany = state.companies.find((company) => company.id === state.selectedCompanyId);
  const workers = ownWorker
    ? [ownWorker, ...overview.workers.filter((worker) => worker.id !== ownWorker.id)]
    : overview.workers;
  const companies = ownCompany
    ? [ownCompany, ...overview.companies.filter((company) => company.id !== ownCompany.id)]
    : overview.companies;

  return {
    ...state,
    workers,
    companies,
    jobs: applyApplicationCounts(overview.jobs, overview.applications),
    applications: overview.applications,
    trustReports: overview.trustReports,
    adminModeration: overview.adminModeration
  };
}

function mergeNotifications(state: AppState, notifications: AppState["notifications"]) {
  const incomingIds = new Set(notifications.map((notification) => notification.id));
  return {
    ...state,
    notifications: [
      ...notifications,
      ...state.notifications.filter((notification) => !incomingIds.has(notification.id))
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

function sanitizeAccountState(state: AppState, user: User, role: UserRole): AppState {
  const withoutDemoWorkers = removeDemoWorkers(state);

  if (role === "empresa") {
    const company = withoutDemoWorkers.companies.find((item) => item.id === user.id) ?? createCompanyForUser(user);
    const companyJobs = withoutDemoWorkers.jobs.filter((job) => job.companyId === company.id);
    return {
      ...withoutDemoWorkers,
      activeRole: "empresa",
      selectedWorkerId: "",
      selectedCompanyId: company.id,
      companies: [company, ...withoutDemoWorkers.companies.filter((item) => item.id !== company.id && !DEMO_COMPANY_IDS.has(item.id))],
      jobs: companyJobs,
      applications: withoutDemoWorkers.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId)),
      chatMessages: (withoutDemoWorkers.chatMessages ?? []).filter((message) => companyJobs.some((job) => job.id === message.jobId))
    };
  }

  const worker = withoutDemoWorkers.workers.find((item) => item.id === user.id) ?? createWorkerForUser(user);
  return {
    ...withoutDemoWorkers,
    activeRole: "trabalhador",
    selectedWorkerId: worker.id,
    workers: [worker, ...withoutDemoWorkers.workers.filter((item) => item.id !== worker.id)],
    applications: withoutDemoWorkers.applications.filter((application) => application.workerId === worker.id),
    favoriteWorkerIds: [],
    chatMessages: (withoutDemoWorkers.chatMessages ?? []).filter((message) => message.workerId === worker.id)
  };
}

function ensureAccountProfile(state: AppState, user: User | null, role: UserRole | null) {
  if (!user || !role) return state;

  if (role === "empresa") {
    const cleanState = sanitizeAccountState(state, user, role);
    const company = cleanState.companies.find((item) => item.id === user.id) ?? createCompanyForUser(user);
    return {
      ...cleanState,
      activeRole: "empresa" as const,
      selectedCompanyId: company.id,
      companies: cleanState.companies.some((item) => item.id === company.id)
        ? cleanState.companies
        : [company, ...cleanState.companies]
    };
  }

  const cleanState = sanitizeAccountState(state, user, role);
  const worker = cleanState.workers.find((item) => item.id === user.id) ?? createWorkerForUser(user);
  return {
    ...cleanState,
    activeRole: "trabalhador" as const,
    selectedWorkerId: worker.id,
    workers: cleanState.workers.some((item) => item.id === worker.id) ? cleanState.workers : [worker, ...cleanState.workers]
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, role, user, isAdmin, isModerator } = useAuth();
  const accountState = useMemo(() => createStateForUser(user, role), [role, user]);
  const localStorageKey = getLocalStorageKey(user?.id);
  const remoteStateKey = getSupabaseStateKey(user?.id);
  // Deliberately NOT reading localStorage here: at mount time we don't yet
  // know which account is signed in (Supabase session resolution is async),
  // so there is no correct per-user key to read. Reading the old unscoped
  // STORAGE_KEY risked seeding the very first render with a stale
  // activeRole left over from a *different* account that once used this
  // browser (e.g. "empresa"), which could bounce a real "trabalhador" user
  // out of role-gated routes like /app/vagas for a frame before the
  // effect below corrects it. Starting from the plain demo default and
  // letting that effect hydrate the right state per-user avoids the race.
  const [state, setState] = useState<AppState>(() => initialState);
  const [syncStatus, setSyncStatus] = useState<AppContextValue["syncStatus"]>(
    supabaseStateEnabled ? "carregando" : "local"
  );
  const [syncError, setSyncError] = useState("");
  const pendingApplicationKeys = useRef(new Set<string>());

  function commit(updater: (current: AppState) => AppState) {
    setState((current) => {
      const next = updater(current);
      persist(next, localStorageKey);
      void persistRemote(next);
      return next;
    });
  }

  async function persistRemote(nextState: AppState) {
    if (!supabaseStateEnabled) return;
    try {
      setSyncStatus("salvando");
      await saveSupabaseState(nextState, remoteStateKey);
      setSyncError("");
      setSyncStatus("sincronizado");
    } catch (error) {
      setSyncError("Falha ao salvar os dados.");
      setSyncStatus("erro");
    }
  }

  function publishRemoteNotification(userId: string | undefined | null, notification: AppState["notifications"][number]) {
    if (!userId || !supabaseMarketplaceEnabled) return;
    publishNotification(userId, notification).catch(() => {
      setSyncError("Falha ao publicar notificação.");
      setSyncStatus("erro");
    });
  }

  function queueEmail(input: EmailNotificationInput) {
    if (!emailNotificationsEnabled) return;
    enqueueEmailNotification(input).catch((error) => {
      console.warn("Falha ao enfileirar email do PONT.", error);
    });
  }

  function queueLowCoinsEmail(nextBalance: number) {
    if (nextBalance > 2 || !currentWorker?.email) return;
    queueEmail({
      recipientUserId: user?.id ?? currentWorker.id,
      recipientEmail: currentWorker.email,
      recipientName: currentWorker.name,
      subject: "Suas moedas PONT estão acabando",
      preview: `Você tem ${nextBalance} moeda${nextBalance === 1 ? "" : "s"} disponível${nextBalance === 1 ? "" : "is"}.`,
      body: `Oi, ${currentWorker.name}. Seu saldo atual é de ${nextBalance} moeda${nextBalance === 1 ? "" : "s"}. Recarregue para continuar liberando vagas completas.`,
      eventType: "low_coins",
      metadata: { balance: nextBalance }
    });
  }

  function applyCoinAccount(account: CoinAccount | null) {
    if (!account) return;

    setState((current) => {
      const unlockedJobIds = Array.from(
        new Set([...current.subscription.unlockedJobIds, ...account.unlockedJobIds])
      );
      const next = {
        ...current,
        subscription: {
          ...current.subscription,
          creditsRemaining: account.balance,
          unlockedJobIds
        }
      };
      persist(next, localStorageKey);
      return next;
    });
  }

  function trackCoinSync(action: Promise<CoinAccount | null>, fallbackMessage: string) {
    if (!supabaseCoinsEnabled) return;

    setSyncStatus("salvando");
    action
      .then((account) => {
        applyCoinAccount(account);
        setSyncError("");
        setSyncStatus("sincronizado");
      })
      .catch(() => {
        setSyncError(fallbackMessage);
        setSyncStatus("erro");
      });
  }

  useEffect(() => {
    if (authLoading) return;

    const localState = ensureAccountProfile(loadInitialState(localStorageKey, accountState), user, role);

    if (!supabaseStateEnabled) {
      setState(localState);
      setSyncStatus("local");
      setSyncError("");
      return;
    }

    let active = true;
    setSyncStatus("carregando");
    loadSupabaseState(remoteStateKey)
      .then((remoteState) => {
        if (!active) return;
        if (remoteState) {
          const migratedState = ensureAccountProfile(mergeSeedUpdates(remoteState), user, role);
          setState(migratedState);
          persist(migratedState, localStorageKey);
          if (migratedState !== remoteState) {
            void persistRemote(migratedState);
          }
        } else {
          setState(localState);
          persist(localState, localStorageKey);
          void persistRemote(localState);
        }
        setSyncError("");
        setSyncStatus("sincronizado");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar seus dados.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [accountState, authLoading, localStorageKey, remoteStateKey]);

  const currentWorker = state.workers.find((worker) => worker.id === state.selectedWorkerId) ?? state.workers[0];
  const currentCompany = state.companies.find((company) => company.id === state.selectedCompanyId) ?? state.companies[0];

  useEffect(() => {
    if (authLoading || role !== "empresa" || !currentCompany || !supabaseMarketplaceEnabled) return;

    let active = true;
    Promise.all([loadPublicWorkerProfiles(user?.id), loadCompanyMarketplace(currentCompany.id)])
      .then(([publicWorkers, companyPayload]) => {
        if (!active) return;
        setState((current) => mergeCompanyMarketplaceState(mergePublicWorkers(current, publicWorkers), currentCompany.id, companyPayload));
        setSyncError("");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar o banco de profissionais.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [authLoading, currentCompany?.id, role, user?.id]);

  useEffect(() => {
    if (authLoading || !(isAdmin || isModerator) || !supabaseModerationEnabled) return;

    let active = true;
    loadModerationOverview()
      .then((overview) => {
        if (!active) return;
        setState((current) => mergeModerationState(current, overview));
        setSyncError("");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar o painel de moderação.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdmin, isModerator]);

  useEffect(() => {
    if (authLoading || role !== "trabalhador" || !user || !currentWorker || !supabaseMarketplaceEnabled) return;

    publishWorkerProfile(user, currentWorker).catch(() => {
      setSyncError("Falha ao publicar o perfil no banco de profissionais.");
      setSyncStatus("erro");
    });
  }, [authLoading, currentWorker, role, user]);

  useEffect(() => {
    if (authLoading || role !== "trabalhador" || !currentWorker || !supabaseMarketplaceEnabled) return;

    let active = true;
    loadWorkerMarketplace(currentWorker.id)
      .then((payload) => {
        if (!active) return;
        setState((current) => mergeWorkerMarketplaceState(current, currentWorker.id, payload));
        setSyncError("");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar vagas e candidaturas.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [authLoading, currentWorker?.id, role]);

  useEffect(() => {
    if (authLoading || !user || !supabaseMarketplaceEnabled) return;

    let active = true;
    loadRemoteNotifications(user.id)
      .then((notifications) => {
        if (!active) return;
        setState((current) => mergeNotifications(current, notifications));
        setSyncError("");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar notificações.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading || !user || !supabaseCoinsEnabled) return;

    let active = true;
    loadRemoteCoinAccount(user.id)
      .then((account) => {
        if (!active) return;
        applyCoinAccount(account);
        setSyncError("");
      })
      .catch(() => {
        if (!active) return;
        setSyncError("Falha ao carregar carteira de moedas.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id, localStorageKey]);

  const createJobHandler = (input: CreateJobInput) => {
    if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
      return "";
    }

    const id = crypto.randomUUID();
    const job: Job = {
      id,
      companyId: currentCompany.id,
      status: "Publicada",
      filled: 0,
      contactAfterConfirmation: true,
      candidates: 0,
      distanceKm: 6,
      ...input
    };
    commit((current) => ({
      ...current,
      jobs: [job, ...current.jobs],
      notifications: [
        {
          id: crypto.randomUUID(),
          title: input.urgent ? "A empresa solicitou reposição urgente" : "Nova vaga publicada",
          body: `${input.function} em ${input.neighborhood} por ${input.dailyValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })}.`,
          role: "trabalhador",
          createdAt: new Date().toISOString(),
          read: false
        },
        ...current.notifications
      ]
    }));
    if (supabaseMarketplaceEnabled) {
      setSyncStatus("salvando");
      publishJob(user, currentCompany, job)
        .then(() => {
          setSyncError("");
          setSyncStatus("sincronizado");
        })
        .catch(() => {
          setSyncError("Falha ao publicar vaga.");
          setSyncStatus("erro");
        });
    }
    if (input.urgent) {
      state.workers
        .filter((worker) => worker.email && worker.functions.includes(input.function))
        .slice(0, 30)
        .forEach((worker) => {
          queueEmail({
            recipientUserId: worker.id,
            recipientEmail: worker.email,
            recipientName: worker.name,
            subject: `Vaga urgente para ${input.function}`,
            preview: `${currentCompany.establishmentName} precisa de ${input.function} em ${input.neighborhood}.`,
            body: `${currentCompany.establishmentName} publicou uma vaga urgente para ${input.function} em ${input.neighborhood}, com diária de ${input.dailyValue.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}. Entre no PONT para ver os detalhes e se candidatar.`,
            eventType: "urgent_job",
            metadata: { jobId: id, companyId: currentCompany.id, function: input.function, neighborhood: input.neighborhood }
          });
        });
    }
    return id;
  };

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      storageMode: supabaseStateEnabled ? "supabase" : "local",
      syncStatus,
      syncError,
      currentWorker,
      currentCompany,
      setRole(role) {
        commit((current) => ({ ...current, activeRole: role }));
      },
      createJob: createJobHandler,
      createCompanySchedule(input) {
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return "";
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const schedule: CompanySchedule = {
          id,
          companyId: currentCompany.id,
          ...input,
          createdAt: now,
          updatedAt: now
        };

        commit((current) => ({
          ...current,
          companySchedules: [schedule, ...(current.companySchedules ?? [])],
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Nova escala criada",
              body: `${input.title} em ${input.neighborhood}, ${input.date}.`,
              role: "empresa",
              createdAt: now,
              read: false
            },
            ...current.notifications
          ]
        }));

        return id;
      },
      updateCompanySchedule(scheduleId, input) {
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return { ok: false, message: "Sua empresa está em revisão pela administração e não pode editar escalas no momento." };
        }

        const exists = (state.companySchedules ?? []).some((schedule) => schedule.id === scheduleId && schedule.companyId === currentCompany.id);
        if (!exists) return { ok: false, message: "Escala não encontrada para esta empresa." };

        commit((current) => ({
          ...current,
          companySchedules: (current.companySchedules ?? []).map((schedule) =>
            schedule.id === scheduleId && schedule.companyId === currentCompany.id
              ? { ...schedule, ...input, updatedAt: new Date().toISOString() }
              : schedule
          )
        }));

        return { ok: true, message: "Escala atualizada." };
      },
      deleteCompanySchedule(scheduleId) {
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return { ok: false, message: "Sua empresa está em revisão pela administração e não pode excluir escalas no momento." };
        }

        const exists = (state.companySchedules ?? []).some((schedule) => schedule.id === scheduleId && schedule.companyId === currentCompany.id);
        if (!exists) return { ok: false, message: "Escala não encontrada para esta empresa." };

        commit((current) => ({
          ...current,
          companySchedules: (current.companySchedules ?? []).filter((schedule) => schedule.id !== scheduleId)
        }));

        return { ok: true, message: "Escala excluída." };
      },
      updateJobStatus(jobId, status) {
        const job = state.jobs.find((item) => item.id === jobId && item.companyId === currentCompany.id);
        if (!job) return { ok: false, message: "Vaga não encontrada para esta empresa." };
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return { ok: false, message: "Sua empresa está em revisão pela administração e não pode alterar vagas no momento." };
        }
        const affectedApplications = state.applications.filter((application) => application.jobId === jobId);
        const approvedCount = countApproved(state.applications, jobId);
        const filledCancellationFee = status === "Cancelada" && approvedCount >= job.quantity ? 10 : 0;

        if (filledCancellationFee > 0 && state.subscription.companyCreditsRemaining < filledCancellationFee) {
          return {
            ok: false,
            message: `Esta vaga já está preenchida. Para cancelar, a empresa precisa de ${filledCancellationFee} moedas empresariais. Saldo atual: ${state.subscription.companyCreditsRemaining}.`
          };
        }

        commit((current) => {
          const nextApplications = current.applications.map((application) => {
            if (application.jobId !== jobId) return application;
            if (status === "Cancelada" && application.status !== "Trabalho concluído" && application.status !== "Falta registrada") {
              return { ...application, status: "Cancelada" as const };
            }
            if (status === "Concluída" && application.status === "Aprovada") {
              return { ...application, status: "Trabalho concluído" as const };
            }
            return application;
          });

          return {
            ...current,
            applications: nextApplications,
            subscription:
              filledCancellationFee > 0
                ? {
                    ...current.subscription,
                    companyCreditsRemaining: Math.max(0, current.subscription.companyCreditsRemaining - filledCancellationFee)
                  }
                : current.subscription,
            coinLedger:
              filledCancellationFee > 0
                ? [
                    coinLedgerEntry({
                      role: "empresa",
                      kind: "spend",
                      reason: "cancel_filled_job",
                      amount: -filledCancellationFee,
                      balanceAfter: Math.max(0, current.subscription.companyCreditsRemaining - filledCancellationFee),
                      jobId
                    }),
                    ...current.coinLedger
                  ]
                : current.coinLedger,
            jobs: current.jobs.map((item) =>
              item.id === jobId
                ? {
                    ...item,
                    status,
                    urgent: status === "Cancelada" || status === "Concluída" ? false : item.urgent,
                    filled: status === "Cancelada" ? 0 : countApproved(nextApplications, item.id)
                  }
                : item
            ),
            notifications:
              status === "Cancelada" || status === "Concluída"
                ? [
                    {
                      id: crypto.randomUUID(),
                      title: status === "Cancelada" ? "Uma vaga foi cancelada" : "Uma vaga foi encerrada",
                      body: `${job.title}: ${affectedApplications.length} candidatura${affectedApplications.length === 1 ? "" : "s"} atualizada${affectedApplications.length === 1 ? "" : "s"}.`,
                      role: "trabalhador",
                      createdAt: new Date().toISOString(),
                      read: false
                    },
                    ...current.notifications
                  ]
                : current.notifications
          };
        });
        if (status === "Cancelada" || status === "Concluída") {
          affectedApplications.slice(0, 100).forEach((application) => {
            const worker = state.workers.find((item) => item.id === application.workerId);
            if (!worker?.email) return;
            queueEmail({
              recipientUserId: worker.id,
              recipientEmail: worker.email,
              recipientName: worker.name,
              subject: status === "Cancelada" ? "Uma vaga foi cancelada" : "Uma vaga foi encerrada",
              preview: `${job.title}: ${status}.`,
              body: `${worker.name}, a vaga ${job.title} foi marcada como ${status}. Entre no PONT para acompanhar seus próximos turnos e candidaturas.`,
              eventType: "application_status",
              metadata: { jobId, applicationId: application.id, workerId: worker.id, status }
            });
          });
        }

        if (supabaseMarketplaceEnabled) {
          publishJob(user, currentCompany, { ...job, status, urgent: status === "Cancelada" || status === "Concluída" ? false : job.urgent }).catch(() => {
            setSyncError("Falha ao atualizar vaga.");
            setSyncStatus("erro");
          });
        }

        return {
          ok: true,
          message:
            filledCancellationFee > 0
              ? `Vaga cancelada. Como ela já estava preenchida, foram cobradas ${filledCancellationFee} moedas.`
              : `Vaga marcada como ${status}.`
        };
      },
      duplicateJob(jobId) {
        const job = state.jobs.find((item) => item.id === jobId && item.companyId === currentCompany.id);
        if (!job) return { ok: false, message: "Vaga não encontrada para esta empresa." };
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return { ok: false, message: "Sua empresa está em revisão pela administração e não pode duplicar vagas no momento." };
        }

        const nextJobId = crypto.randomUUID();
        const duplicated: Job = {
          ...job,
          id: nextJobId,
          title: `${job.title} (cópia)`,
          status: "Rascunho",
          urgent: false,
          filled: 0,
          candidates: 0
        };

        commit((current) => ({
          ...current,
          jobs: [duplicated, ...current.jobs]
        }));

        return { ok: true, message: "Vaga duplicada como rascunho.", jobId: nextJobId };
      },
      createUrgentReplacement(input) {
        return createJobHandler({
          title: `Reposição urgente: ${input.function}`,
          function: input.function,
          quantity: input.quantity,
          date: new Date().toISOString().slice(0, 10),
          startsAt: input.startsAt,
          endsAt: "A combinar",
          dailyValue: input.dailyValue,
          paymentMethod: "Pix",
          approximateAddress: `${input.neighborhood}, Florianópolis`,
          fullAddress: currentCompany.address,
          neighborhood: input.neighborhood,
          uniform: "A combinar com a empresa",
          requiredExperience: "Experiência na função",
          description: input.observation || "Reposição rápida para cobrir turno aberto.",
          benefits: ["Contato liberado após confirmação"],
          urgent: true
        });
      },
      updateWorkerProfile(input) {
        commit((current) => ({
          ...current,
          workers: current.workers.map((worker) =>
            worker.id === currentWorker.id
              ? {
                  ...worker,
                  ...input,
                  id: worker.id,
                  rating: worker.rating,
                  completedJobs: worker.completedJobs,
                  reviews: worker.reviews
                }
              : worker
          )
        }));
      },
      updateCompanyProfile(input) {
        const nextCompany = {
          ...currentCompany,
          ...input,
          id: currentCompany.id,
          rating: currentCompany.rating,
          logoUrl: input.logoUrl ?? currentCompany.logoUrl
        };
        commit((current) => ({
          ...current,
          companies: current.companies.map((company) =>
            company.id === currentCompany.id
              ? nextCompany
              : company
          )
        }));
        if (supabaseMarketplaceEnabled && user) {
          publishCompanyProfile(user, nextCompany).catch(() => {
            setSyncError("Falha ao publicar perfil da empresa.");
            setSyncStatus("erro");
          });
        }
      },
      applyToJob(jobId) {
        const job = state.jobs.find((item) => item.id === jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };
        const company = state.companies.find((item) => item.id === job.companyId);
        const pendingKey = `${currentWorker.id}:${jobId}`;
        if (state.adminModeration.blockedWorkerIds.includes(currentWorker.id)) {
          return { ok: false, message: "Seu perfil está em revisão pela administração e não pode enviar candidaturas no momento." };
        }
        if (state.adminModeration.blockedCompanyIds.includes(job.companyId)) {
          return { ok: false, message: "Esta empresa está em revisão pela administração. A candidatura está bloqueada por segurança." };
        }

        if (!state.subscription.unlockedJobIds.includes(jobId)) {
          return {
            ok: false,
            message: "Use 1 moeda para liberar a vaga completa antes de enviar candidatura.",
            requiresPlan: true
          };
        }

        const result = canApply(job, state.applications, currentWorker);
        if (!result.allowed) {
          return { ok: false, message: result.reason };
        }
        if (pendingApplicationKeys.current.has(pendingKey)) {
          return { ok: false, message: "Sua candidatura já está sendo enviada. Aguarde alguns segundos." };
        }
        pendingApplicationKeys.current.add(pendingKey);

        const existingApplication = state.applications.find(
          (item) => item.jobId === jobId && item.workerId === currentWorker.id
        );
        const application: Application = {
          id: existingApplication?.id ?? crypto.randomUUID(),
          jobId,
          workerId: currentWorker.id,
          status: "Enviada",
          createdAt: existingApplication?.createdAt ?? new Date().toISOString()
        };
        const companyNotification: AppState["notifications"][number] = {
          id: crypto.randomUUID(),
          title: "Um candidato se inscreveu na sua vaga",
          body: `${currentWorker.name} enviou candidatura para ${job.title}.`,
          role: "empresa",
          createdAt: new Date().toISOString(),
          read: false
        };

        commit((current) => ({
          ...current,
          applications: [application, ...current.applications.filter((item) => item.id !== application.id)],
          jobs: current.jobs.map((item) => (item.id === jobId ? { ...item, candidates: item.candidates + 1 } : item)),
          notifications: [
            companyNotification,
            ...current.notifications
          ]
        }));
        if (company?.email) {
          queueEmail({
            recipientUserId: company.id,
            recipientEmail: company.email,
            recipientName: company.establishmentName,
            subject: "Nova candidatura recebida",
            preview: `${currentWorker.name} se candidatou para ${job.title}.`,
            body: `${currentWorker.name} enviou candidatura para ${job.title}. Entre no PONT para analisar o perfil, aprovar ou recusar.`,
            eventType: "application_status",
            metadata: { jobId, applicationId: application.id, workerId: currentWorker.id, companyId: company.id }
          });
        }
        if (supabaseMarketplaceEnabled) {
          publishApplication(currentWorker, jobId, application.id).catch(() => {
            setSyncError("Falha ao enviar candidatura.");
            setSyncStatus("erro");
          });
          publishRemoteNotification(job.companyId, companyNotification);
        }
        window.setTimeout(() => pendingApplicationKeys.current.delete(pendingKey), 1500);

        return { ok: true, message: "Candidatura enviada com sucesso. A vaga já estava liberada e nenhuma nova moeda foi usada." };
      },
      updateApplicationStatus(applicationId, status) {
        const application = state.applications.find((item) => item.id === applicationId);
        if (!application) return { ok: false, message: "Candidatura não encontrada." };
        const job = state.jobs.find((item) => item.id === application.jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };
        const worker = state.workers.find((item) => item.id === application.workerId);
        if (state.adminModeration.blockedCompanyIds.includes(job.companyId)) {
          return { ok: false, message: "Esta empresa está bloqueada para alterar candidaturas." };
        }
        if (state.adminModeration.blockedWorkerIds.includes(application.workerId)) {
          return { ok: false, message: "Este profissional está em revisão pela administração. A ação foi bloqueada por segurança." };
        }

        if (application.status === status) {
          return { ok: true, message: `Candidatura já está marcada como ${status}.` };
        }

        const approvedWithoutCurrent = state.applications.filter(
          (item) =>
            item.jobId === job.id &&
            item.id !== application.id &&
            (item.status === "Aprovada" || item.status === "Trabalho concluído")
        ).length;
        if (status === "Aprovada" && approvedWithoutCurrent >= job.quantity) {
          return { ok: false, message: "Não é possível aprovar mais pessoas do que a quantidade disponível." };
        }

        commit((current) => {
          const nextApplications = current.applications.map((item) => (item.id === applicationId ? { ...item, status } : item));

          return {
            ...current,
            applications: nextApplications,
            jobs: current.jobs.map((item) =>
              item.id === job.id ? { ...item, filled: Math.min(item.quantity, countApproved(nextApplications, item.id)) } : item
            ),
            notifications: [
              {
                id: crypto.randomUUID(),
                title: status === "Aprovada" ? "Sua candidatura foi aprovada" : "Sua candidatura foi atualizada",
                body: `${job.title}: status ${status}.`,
                role: "trabalhador",
                createdAt: new Date().toISOString(),
                read: false
              },
              ...current.notifications
            ]
          };
        });
        if (worker?.email) {
          const approved = status === "Aprovada";
          queueEmail({
            recipientUserId: worker.id,
            recipientEmail: worker.email,
            recipientName: worker.name,
            subject: approved ? "Sua candidatura foi aprovada" : "Sua candidatura foi atualizada",
            preview: `${job.title}: status ${status}.`,
            body: approved
              ? `Boa notícia, ${worker.name}. Sua candidatura para ${job.title} foi aprovada. Entre no PONT para ver os próximos passos e falar com a empresa.`
              : `${worker.name}, sua candidatura para ${job.title} foi atualizada para ${status}. Entre no PONT para acompanhar os detalhes.`,
            eventType: "application_status",
            metadata: { jobId: job.id, applicationId, workerId: worker.id, status }
          });
        }

        if (supabaseMarketplaceEnabled) {
          updateRemoteApplicationStatus(application, status).catch(() => {
            setSyncError("Falha ao atualizar candidatura.");
            setSyncStatus("erro");
          });
          publishRemoteNotification(application.workerId, {
            id: crypto.randomUUID(),
            title: status === "Aprovada" ? "Sua candidatura foi aprovada" : "Sua candidatura foi atualizada",
            body: `${job.title}: status ${status}.`,
            role: "trabalhador",
            createdAt: new Date().toISOString(),
            read: false
          });
        }

        return { ok: true, message: `Candidatura marcada como ${status}.` };
      },
      toggleFavorite(workerId) {
        commit((current) => ({
          ...current,
          favoriteWorkerIds: current.favoriteWorkerIds.includes(workerId)
            ? current.favoriteWorkerIds.filter((id) => id !== workerId)
            : [...current.favoriteWorkerIds, workerId]
        }));
      },
      inviteWorkerToJob(workerId, jobId) {
        const worker = state.workers.find((item) => item.id === workerId);
        if (!worker) return { ok: false, message: "Profissional não encontrado." };
        const job = state.jobs.find((item) => item.id === jobId && item.companyId === currentCompany.id);
        if (!job) return { ok: false, message: "Vaga não encontrada para esta empresa." };
        if (state.adminModeration.blockedCompanyIds.includes(currentCompany.id)) {
          return { ok: false, message: "Sua empresa está em revisão pela administração e não pode confirmar profissionais no momento." };
        }
        if (state.adminModeration.blockedWorkerIds.includes(workerId)) {
          return { ok: false, message: "Este profissional está em revisão pela administração e não pode ser confirmado no momento." };
        }
        const existing = state.applications.find((item) => item.jobId === jobId && item.workerId === workerId);
        const approvedCount = state.applications.filter(
          (item) => item.jobId === jobId && item.id !== existing?.id && item.status === "Aprovada"
        ).length;

        if (existing?.status === "Aprovada") {
          return { ok: true, message: `${worker.name} já está confirmado nesta vaga.` };
        }
        if (approvedCount >= job.quantity) {
          return { ok: false, message: "Não há vagas restantes para confirmar este profissional." };
        }

        const invitedApplication: Application = existing
          ? { ...existing, status: "Aprovada" }
          : {
              id: crypto.randomUUID(),
              jobId,
              workerId,
              status: "Aprovada",
              createdAt: new Date().toISOString()
            };
        const remoteInviteNotification: AppState["notifications"][number] = {
          id: crypto.randomUUID(),
          title: "Você foi convidado para uma vaga",
          body: `${currentCompany.establishmentName} confirmou você em ${job.title}.`,
          role: "trabalhador",
          createdAt: new Date().toISOString(),
          read: false
        };

        commit((current) => {
          const nextApplications = existing
            ? current.applications.map((item) => (item.id === existing.id ? invitedApplication : item))
            : [invitedApplication, ...current.applications];

          return {
            ...current,
            applications: nextApplications,
            jobs: current.jobs.map((item) =>
              item.id === jobId
                ? {
                    ...item,
                    candidates: existing ? item.candidates : item.candidates + 1,
                    filled: Math.min(item.quantity, countApproved(nextApplications, item.id))
                  }
                : item
            ),
            notifications: [
              {
                id: crypto.randomUUID(),
                title: "Você foi convidado para uma vaga",
                body: `${currentCompany.establishmentName} confirmou você em ${job.title}.`,
                role: "trabalhador",
                createdAt: new Date().toISOString(),
                read: false
              },
              ...current.notifications
            ]
          };
        });
        if (supabaseMarketplaceEnabled) {
          publishInvitedApplication(jobId, workerId, invitedApplication.id).catch(() => {
            setSyncError("Falha ao enviar convite.");
            setSyncStatus("erro");
          });
          publishRemoteNotification(workerId, remoteInviteNotification);
        }
        if (worker.email) {
          queueEmail({
            recipientUserId: worker.id,
            recipientEmail: worker.email,
            recipientName: worker.name,
            subject: "Você foi convidado para uma vaga",
            preview: `${currentCompany.establishmentName} confirmou você em ${job.title}.`,
            body: `${currentCompany.establishmentName} confirmou você em ${job.title}. Entre no PONT para ver horário, local e detalhes do turno.`,
            eventType: "application_status",
            metadata: { jobId, applicationId: invitedApplication.id, workerId, companyId: currentCompany.id, status: "Aprovada" }
          });
        }

        return { ok: true, message: `${worker.name} foi confirmado em ${job.title}.` };
      },
      markNotificationRead(notificationId) {
        commit((current) => ({
          ...current,
          notifications: current.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification
          )
        }));
        if (supabaseMarketplaceEnabled) {
          markRemoteNotificationRead(notificationId).catch(() => {
            setSyncError("Falha ao marcar notificação como lida.");
            setSyncStatus("erro");
          });
        }
      },
      markRoleNotificationsRead(role) {
        commit((current) => ({
          ...current,
          notifications: current.notifications.map((notification) =>
            notification.role === role ? { ...notification, read: true } : notification
          )
        }));
        if (supabaseMarketplaceEnabled && user) {
          markRemoteRoleNotificationsRead(user.id, role).catch(() => {
            setSyncError("Falha ao marcar notificações como lidas.");
            setSyncStatus("erro");
          });
        }
      },
      markChatConversationRead(applicationId) {
        commit((current) => {
          let changed = false;
          const chatMessages = (current.chatMessages ?? []).map((message) => {
            if (message.applicationId !== applicationId) return message;
            if (state.activeRole === "trabalhador" && !message.readByWorker) {
              changed = true;
              return { ...message, readByWorker: true };
            }
            if (state.activeRole === "empresa" && !message.readByCompany) {
              changed = true;
              return { ...message, readByCompany: true };
            }
            return message;
          });
          return changed ? { ...current, chatMessages } : current;
        });
      },
      sendChatMessage(applicationId, body) {
        const text = body.trim();
        if (text.length < 2) return { ok: false, message: "Escreva uma mensagem antes de enviar." };

        const application = state.applications.find((item) => item.id === applicationId);
        if (!application) return { ok: false, message: "Conversa não encontrada." };

        const job = state.jobs.find((item) => item.id === application.jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada para esta conversa." };

        const worker = state.workers.find((item) => item.id === application.workerId);
        const company = state.companies.find((item) => item.id === job.companyId);
        if (!worker || !company) return { ok: false, message: "Participante da conversa não encontrado." };
        if (state.adminModeration.blockedWorkerIds.includes(worker.id) || state.adminModeration.blockedCompanyIds.includes(company.id)) {
          return { ok: false, message: "Esta conversa está bloqueada enquanto um dos perfis passa por revisão de segurança." };
        }

        const allowedStatus = application.status === "Aprovada" || application.status === "Trabalho concluído";
        if (!allowedStatus) return { ok: false, message: "O chat libera somente após a aprovação da candidatura." };

        const senderRole = state.activeRole;
        const chatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          applicationId: application.id,
          jobId: job.id,
          workerId: worker.id,
          companyId: company.id,
          senderRole,
          senderName: senderRole === "empresa" ? company.establishmentName : worker.name,
          body: text,
          createdAt: new Date().toISOString(),
          readByWorker: senderRole === "trabalhador",
          readByCompany: senderRole === "empresa"
        };
        const targetRole: UserRole = senderRole === "empresa" ? "trabalhador" : "empresa";
        const notification = {
          id: crypto.randomUUID(),
          title: "Nova mensagem no chat",
          body: `${chatMessage.senderName}: ${text.slice(0, 80)}${text.length > 80 ? "..." : ""}`,
          role: targetRole,
          createdAt: chatMessage.createdAt,
          read: false
        };

        commit((current) => ({
          ...current,
          chatMessages: [chatMessage, ...(current.chatMessages ?? [])],
          notifications: [notification, ...current.notifications]
        }));

        if (supabaseMarketplaceEnabled) {
          const userId = targetRole === "empresa" ? company.id : worker.id;
          publishRemoteNotification(userId, notification);
        }
        const recipient = targetRole === "empresa"
          ? { id: company.id, email: company.email, name: company.establishmentName }
          : { id: worker.id, email: worker.email, name: worker.name };
        if (recipient.email) {
          queueEmail({
            recipientUserId: recipient.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            subject: "Nova mensagem no PONT",
            preview: `${chatMessage.senderName}: ${text.slice(0, 90)}${text.length > 90 ? "..." : ""}`,
            body: `${chatMessage.senderName} enviou uma mensagem sobre ${job.title}: "${text}". Entre no PONT para responder.`,
            eventType: "chat_message",
            metadata: { applicationId: application.id, jobId: job.id, senderRole, targetRole }
          });
        }

        return { ok: true, message: "Mensagem enviada." };
      },
      unlockJobWithCoins(jobId) {
        const job = state.jobs.find((item) => item.id === jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };
        if (state.subscription.unlockedJobIds.includes(jobId)) {
          return { ok: true, message: "Esta vaga já está liberada." };
        }
        if (state.subscription.creditsRemaining <= 0) {
          return { ok: false, message: "Você não possui moedas suficientes para liberar esta vaga." };
        }

        commit((current) => ({
          ...current,
          subscription: {
            ...current.subscription,
            creditsRemaining: Math.max(0, current.subscription.creditsRemaining - 1),
            unlockedJobIds: [...current.subscription.unlockedJobIds, jobId]
          },
          coinLedger: [
            coinLedgerEntry({
              role: "trabalhador",
              kind: "spend",
              reason: "unlock_job",
              amount: -1,
              balanceAfter: Math.max(0, current.subscription.creditsRemaining - 1),
              jobId
            }),
            ...current.coinLedger
          ]
        }));
        if (supabaseCoinsEnabled && user) {
          trackCoinSync(unlockRemoteJobWithCoin(user.id, jobId), "Falha ao liberar vaga com moeda.");
        }
        queueLowCoinsEmail(Math.max(0, state.subscription.creditsRemaining - 1));

        return { ok: true, message: "Vaga completa liberada. 1 moeda foi utilizada." };
      },
      subscribeProfessional() {
        commit((current) => ({
          ...current,
          subscription: {
            ...current.subscription,
            plan: "Profissional",
            creditsRemaining:
              current.activeRole === "trabalhador"
                ? current.subscription.creditsRemaining + 20
                : current.subscription.creditsRemaining,
            companyCreditsRemaining:
              current.activeRole === "empresa"
                ? current.subscription.companyCreditsRemaining + 20
                : current.subscription.companyCreditsRemaining
          },
          coinLedger: [
            coinLedgerEntry({
              role: current.activeRole,
              kind: "purchase",
              reason: "package_professional",
              amount: 20,
              balanceAfter:
                current.activeRole === "empresa"
                  ? current.subscription.companyCreditsRemaining + 20
                  : current.subscription.creditsRemaining + 20
            }),
            ...current.coinLedger
          ]
        }));
        if (state.activeRole === "trabalhador" && supabaseCoinsEnabled && user) {
          trackCoinSync(grantRemoteCoins(user.id, 20, "package_professional"), "Falha ao adicionar moedas.");
        }
      },
      subscribePlus() {
        commit((current) => ({
          ...current,
          subscription: {
            ...current.subscription,
            plan: "Plus",
            creditsRemaining:
              current.activeRole === "trabalhador"
                ? current.subscription.creditsRemaining + 35
                : current.subscription.creditsRemaining,
            companyCreditsRemaining:
              current.activeRole === "empresa"
                ? current.subscription.companyCreditsRemaining + 35
                : current.subscription.companyCreditsRemaining
          },
          coinLedger: [
            coinLedgerEntry({
              role: current.activeRole,
              kind: "purchase",
              reason: "package_plus",
              amount: 35,
              balanceAfter:
                current.activeRole === "empresa"
                  ? current.subscription.companyCreditsRemaining + 35
                  : current.subscription.creditsRemaining + 35
            }),
            ...current.coinLedger
          ]
        }));
        if (state.activeRole === "trabalhador" && supabaseCoinsEnabled && user) {
          trackCoinSync(grantRemoteCoins(user.id, 35, "package_plus"), "Falha ao adicionar moedas.");
        }
      },
      buyCredits(amount = 5) {
        commit((current) => ({
          ...current,
          subscription: {
            ...current.subscription,
            creditsRemaining:
              current.activeRole === "trabalhador"
                ? current.subscription.creditsRemaining + amount
                : current.subscription.creditsRemaining,
            companyCreditsRemaining:
              current.activeRole === "empresa"
                ? current.subscription.companyCreditsRemaining + amount
                : current.subscription.companyCreditsRemaining
          },
          coinLedger: [
            coinLedgerEntry({
              role: current.activeRole,
              kind: "purchase",
              reason: "coin_pack",
              amount,
              balanceAfter:
                current.activeRole === "empresa"
                  ? current.subscription.companyCreditsRemaining + amount
                  : current.subscription.creditsRemaining + amount
            }),
            ...current.coinLedger
          ]
        }));
        if (state.activeRole === "trabalhador" && supabaseCoinsEnabled && user) {
          trackCoinSync(grantRemoteCoins(user.id, amount, "coin_pack"), "Falha ao adicionar moedas.");
        }
      },
      addReview(workerId, review) {
        const worker = state.workers.find((item) => item.id === workerId);
        if (!worker) return;
        const alreadyReviewed =
          review.applicationId && worker.reviews.some((item) => item.applicationId === review.applicationId);
        if (alreadyReviewed) return;

        const reviewId = crypto.randomUUID();
        commit((current) => ({
          ...current,
          workers: current.workers.map((item) => {
            if (item.id !== workerId) return item;
            const reviews = [{ id: reviewId, ...review }, ...item.reviews];
            const rating = reviews.reduce((total, entry) => total + entry.rating, 0) / reviews.length;
            return {
              ...item,
              rating: Number(rating.toFixed(1)),
              completedJobs: item.completedJobs + 1,
              reviews
            };
          })
        }));

        if (supabaseMarketplaceEnabled && user) {
          publishWorkerReview(currentCompany.id, workerId, { id: reviewId, ...review }).catch(() => {
            setSyncError("Falha ao publicar avaliação.");
            setSyncStatus("erro");
          });
        }
      },
      addCompanyReview(companyId, review) {
        const company = state.companies.find((item) => item.id === companyId);
        if (!company) return { ok: false, message: "Empresa não encontrada para avaliação." };
        if (review.rating < 1 || review.rating > 5 || !review.comment.trim()) {
          return { ok: false, message: "Informe nota e comentário para avaliar a empresa." };
        }
        const alreadyReviewed =
          review.applicationId &&
          state.companyReviews.some((item) => item.applicationId === review.applicationId && item.workerId === review.workerId);

        if (alreadyReviewed) {
          return { ok: false, message: "Você já avaliou esta empresa neste turno." };
        }

        const nextReview: CompanyReview = {
          id: crypto.randomUUID(),
          companyId,
          ...review,
          comment: review.comment.trim(),
          createdAt: new Date().toISOString()
        };

        commit((current) => {
          const companyReviews = [nextReview, ...current.companyReviews];
          const reviewsForCompany = companyReviews.filter((item) => item.companyId === companyId);
          const rating = reviewsForCompany.reduce((total, item) => total + item.rating, 0) / reviewsForCompany.length;

          return {
            ...current,
            companyReviews,
            companies: current.companies.map((item) =>
              item.id === companyId
                ? {
                    ...item,
                    rating: Number(rating.toFixed(1))
                  }
                : item
            )
          };
        });

        if (supabaseMarketplaceEnabled && user) {
          publishCompanyReview(nextReview).catch(() => {
            setSyncError("Falha ao publicar avaliação da empresa.");
            setSyncStatus("erro");
          });
        }

        return { ok: true, message: "Avaliação da empresa registrada. Obrigado por fortalecer a reputação da plataforma." };
      },
      submitTrustReport(input) {
        const reason = input.reason.trim();
        if (reason.length < 12) {
          return { ok: false, message: "Descreva o problema com um pouco mais de detalhe para a administração avaliar." };
        }

        const reporterId = state.activeRole === "empresa" ? currentCompany.id : currentWorker.id;
        const reporterName = state.activeRole === "empresa" ? currentCompany.establishmentName : currentWorker.name;
        const alreadyOpen = state.trustReports.some(
          (report) =>
            report.status === "Aberto" &&
            report.reporterId === reporterId &&
            report.targetType === input.targetType &&
            report.targetId === input.targetId
        );

        if (alreadyOpen) {
          return { ok: false, message: "Você já enviou um relato aberto sobre este caso. A administração ainda vai revisar." };
        }

        const report = {
          id: crypto.randomUUID(),
          reporterRole: state.activeRole,
          reporterId,
          reporterName,
          targetType: input.targetType,
          targetId: input.targetId,
          targetName: input.targetName,
          reason,
          status: "Aberto" as const,
          createdAt: new Date().toISOString()
        };

        commit((current) => ({
          ...current,
          trustReports: [report, ...current.trustReports],
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Relato enviado para revisão",
              body: "A administração recebeu o relato e poderá bloquear perfis se houver risco.",
              role: state.activeRole,
              createdAt: report.createdAt,
              read: false
            },
            ...current.notifications
          ]
        }));

        if (supabaseModerationEnabled) {
          publishTrustReport(report).catch(() => {
            setSyncError("Falha ao enviar o relato para a administração.");
            setSyncStatus("erro");
          });
        }

        return { ok: true, message: "Relato enviado para a administração. Obrigado por ajudar a manter o PONT seguro." };
      },
      resolveTrustReport(reportId) {
        commit((current) => ({
          ...current,
          trustReports: current.trustReports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  status: "Resolvido" as const,
                  resolvedAt: new Date().toISOString()
                }
              : report
          )
        }));

        if (supabaseModerationEnabled && (isAdmin || isModerator)) {
          resolveTrustReportRemote(reportId).catch(() => {
            setSyncError("Falha ao atualizar o relato.");
            setSyncStatus("erro");
          });
        }
      },
      toggleWorkerBlock(workerId) {
        const nextBlocked = !state.adminModeration.blockedWorkerIds.includes(workerId);

        commit((current) => {
          const blockedWorkerIds = current.adminModeration.blockedWorkerIds.includes(workerId)
            ? current.adminModeration.blockedWorkerIds.filter((id) => id !== workerId)
            : [...current.adminModeration.blockedWorkerIds, workerId];

          return {
            ...current,
            adminModeration: {
              ...current.adminModeration,
              blockedWorkerIds
            }
          };
        });

        if (supabaseModerationEnabled && (isAdmin || isModerator)) {
          setModerationBlock("worker", workerId, nextBlocked, user?.id).catch(() => {
            setSyncError("Falha ao atualizar o bloqueio.");
            setSyncStatus("erro");
          });
        }
      },
      toggleCompanyBlock(companyId) {
        const nextBlocked = !state.adminModeration.blockedCompanyIds.includes(companyId);

        commit((current) => {
          const blockedCompanyIds = current.adminModeration.blockedCompanyIds.includes(companyId)
            ? current.adminModeration.blockedCompanyIds.filter((id) => id !== companyId)
            : [...current.adminModeration.blockedCompanyIds, companyId];

          return {
            ...current,
            adminModeration: {
              ...current.adminModeration,
              blockedCompanyIds
            }
          };
        });

        if (supabaseModerationEnabled && (isAdmin || isModerator)) {
          setModerationBlock("company", companyId, nextBlocked, user?.id).catch(() => {
            setSyncError("Falha ao atualizar o bloqueio.");
            setSyncStatus("erro");
          });
        }
      }
    }),
    [state, syncStatus, syncError, currentWorker, currentCompany, user, localStorageKey, isAdmin, isModerator]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppStore deve ser usado dentro de AppProvider.");
  }
  return context;
}

export function hasOpenSlots(job: Job) {
  return getOpenSlots(job) > 0;
}
