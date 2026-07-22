import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { initialState } from "../data/demoData";
import { useAuth } from "./auth";
import { canApply, getOpenSlots } from "./rules";
import { getSupabaseStateKey, loadSupabaseState, saveSupabaseState, supabaseStateEnabled } from "./supabaseState";
import type { AppState, Application, ApplicationStatus, CompanyProfile, Job, JobFunction, Neighborhood, PaymentMethod, Review, UserRole, WorkerProfile } from "./types";

const STORAGE_KEY = "free-floripa:state";
const DEFAULT_WORKER_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80";
const DEFAULT_COMPANY_LOGO = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80";

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
  updateWorkerProfile: (input: Partial<Pick<WorkerProfile, "name" | "phone" | "email" | "avatarUrl" | "birthDate" | "city" | "neighborhood" | "functions" | "functionExperience" | "experience" | "description" | "availability" | "hasTransport" | "maxDistanceKm">>) => void;
  updateCompanyProfile: (input: Partial<CompanyProfile>) => void;
  applyToJob: (jobId: string) => { ok: boolean; message: string; requiresPlan?: boolean };
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => { ok: boolean; message: string };
  toggleFavorite: (workerId: string) => void;
  inviteWorkerToJob: (workerId: string, jobId: string) => { ok: boolean; message: string };
  checkIn: (jobId: string, workerId: string) => void;
  checkOut: (jobId: string, workerId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markRoleNotificationsRead: (role: AppState["activeRole"]) => void;
  subscribeProfessional: () => void;
  buyCredits: () => void;
  addReview: (workerId: string, review: Omit<Review, "id">) => void;
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
  return applications.filter((application) => application.jobId === jobId && application.status === "Aprovada").length;
}

function hasShiftFor(shifts: AppState["shifts"], jobId: string, workerId: string) {
  return shifts.some((shift) => shift.jobId === jobId && shift.workerId === workerId);
}

function mergeSeedUpdates(savedState: AppState): AppState {
  const securityJob = initialState.jobs.find((job) => job.id === "job-6");
  const seededWorker = initialState.workers.find((worker) => worker.id === "worker-3");
  let changed = false;

  const jobs =
    securityJob && !savedState.jobs.some((job) => job.id === securityJob.id)
      ? [securityJob, ...savedState.jobs]
      : savedState.jobs;
  changed ||= jobs !== savedState.jobs;

  const workers = seededWorker
    ? savedState.workers.map((worker) => {
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
    : savedState.workers;

  return changed ? { ...savedState, jobs, workers } : savedState;
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
    name: getMetadataString(user, "name", user.email ?? "Trabalhador Free Floripa"),
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
      ) as { level?: string } | undefined;

      return {
        function: functionName,
        level: (levelItem?.level ?? "Iniciante") as WorkerProfile["functionExperience"][number]["level"],
        months: 0,
        acceptsAssistant: true,
        verified: false
      };
    }),
    experience: getMetadataString(user, "experience", ""),
    description: getMetadataString(user, "description", "Perfil recém-criado no Free Floripa."),
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
    establishmentName: getMetadataString(user, "establishmentName", "Empresa Free Floripa"),
    responsibleName: getMetadataString(user, "responsibleName", "Responsável"),
    cnpj: getMetadataString(user, "cnpj", ""),
    phone: getMetadataString(user, "phone", ""),
    email: user.email ?? getMetadataString(user, "email", ""),
    category: getMetadataString(user, "category", "Outro") as CompanyProfile["category"],
    address: getMetadataString(user, "address", ""),
    neighborhood: getMetadataString(user, "neighborhood", "Centro") as Neighborhood,
    description: getMetadataString(user, "description", "Empresa cadastrada no Free Floripa."),
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
      selectedCompanyId: company.id,
      companies: [company, ...initialState.companies.filter((item) => item.id !== company.id)]
    };
  }

  const worker = createWorkerForUser(user);
  return {
    ...initialState,
    activeRole: "trabalhador",
    selectedWorkerId: worker.id,
    workers: [worker, ...initialState.workers.filter((item) => item.id !== worker.id)]
  };
}

function ensureAccountProfile(state: AppState, user: User | null, role: UserRole | null) {
  if (!user || !role) return state;

  if (role === "empresa") {
    const company = state.companies.find((item) => item.id === user.id) ?? createCompanyForUser(user);
    return {
      ...state,
      activeRole: "empresa" as const,
      selectedCompanyId: company.id,
      companies: state.companies.some((item) => item.id === company.id)
        ? state.companies
        : [company, ...state.companies]
    };
  }

  const worker = state.workers.find((item) => item.id === user.id) ?? createWorkerForUser(user);
  return {
    ...state,
    activeRole: "trabalhador" as const,
    selectedWorkerId: worker.id,
    workers: state.workers.some((item) => item.id === worker.id) ? state.workers : [worker, ...state.workers]
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, role, user } = useAuth();
  const accountState = useMemo(() => createStateForUser(user, role), [role, user]);
  const localStorageKey = getLocalStorageKey(user?.id);
  const remoteStateKey = getSupabaseStateKey(user?.id);
  const [state, setState] = useState<AppState>(() => loadInitialState(STORAGE_KEY, initialState));
  const [syncStatus, setSyncStatus] = useState<AppContextValue["syncStatus"]>(
    supabaseStateEnabled ? "carregando" : "local"
  );
  const [syncError, setSyncError] = useState("");

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
      setSyncError(error instanceof Error ? error.message : "Falha ao salvar no Supabase.");
      setSyncStatus("erro");
    }
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
      .catch((error) => {
        if (!active) return;
        setSyncError(error instanceof Error ? error.message : "Falha ao carregar dados do Supabase.");
        setSyncStatus("erro");
      });

    return () => {
      active = false;
    };
  }, [accountState, authLoading, localStorageKey, remoteStateKey]);

  const currentWorker = state.workers.find((worker) => worker.id === state.selectedWorkerId) ?? state.workers[0];
  const currentCompany = state.companies.find((company) => company.id === state.selectedCompanyId) ?? state.companies[0];

  const createJobHandler = (input: CreateJobInput) => {
    const id = crypto.randomUUID();
    const job: Job = {
      id,
      companyId: currentCompany.id,
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
        commit((current) => ({
          ...current,
          companies: current.companies.map((company) =>
            company.id === currentCompany.id
              ? {
                  ...company,
                  ...input,
                  id: company.id,
                  rating: company.rating,
                  logoUrl: input.logoUrl ?? company.logoUrl
                }
              : company
          )
        }));
      },
      applyToJob(jobId) {
        const job = state.jobs.find((item) => item.id === jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };

        const result = canApply(job, state.applications, currentWorker, state.subscription.creditsRemaining);
        if (!result.allowed) {
          return { ok: false, message: result.reason, requiresPlan: state.subscription.creditsRemaining <= 0 };
        }

        const application: Application = {
          id: crypto.randomUUID(),
          jobId,
          workerId: currentWorker.id,
          status: "Enviada",
          createdAt: new Date().toISOString()
        };

        commit((current) => ({
          ...current,
          applications: [application, ...current.applications],
          jobs: current.jobs.map((item) => (item.id === jobId ? { ...item, candidates: item.candidates + 1 } : item)),
          subscription:
            current.subscription.plan === "Profissional"
              ? current.subscription
              : { ...current.subscription, creditsRemaining: current.subscription.creditsRemaining - 1 },
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "Um candidato se inscreveu na sua vaga",
              body: `${currentWorker.name} enviou candidatura para ${job.title}.`,
              role: "empresa",
              createdAt: new Date().toISOString(),
              read: false
            },
            ...current.notifications
          ]
        }));

        return { ok: true, message: "Candidatura enviada com sucesso." };
      },
      updateApplicationStatus(applicationId, status) {
        const application = state.applications.find((item) => item.id === applicationId);
        if (!application) return { ok: false, message: "Candidatura não encontrada." };
        const job = state.jobs.find((item) => item.id === application.jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };

        if (application.status === status) {
          return { ok: true, message: `Candidatura já está marcada como ${status}.` };
        }

        const approvedWithoutCurrent = state.applications.filter(
          (item) => item.jobId === job.id && item.id !== application.id && item.status === "Aprovada"
        ).length;
        if (status === "Aprovada" && approvedWithoutCurrent >= job.quantity) {
          return { ok: false, message: "Não é possível aprovar mais pessoas do que a quantidade disponível." };
        }

        commit((current) => {
          const nextApplications = current.applications.map((item) => (item.id === applicationId ? { ...item, status } : item));
          const nextShifts =
            status === "Aprovada"
              ? hasShiftFor(current.shifts, job.id, application.workerId)
                ? current.shifts
                : [
                    ...current.shifts,
                    {
                      id: crypto.randomUUID(),
                      jobId: job.id,
                      workerId: application.workerId,
                      status: "Ainda não chegou" as const
                    }
                  ]
              : current.shifts.filter((shift) => !(shift.jobId === job.id && shift.workerId === application.workerId));

          return {
            ...current,
            applications: nextApplications,
            jobs: current.jobs.map((item) =>
              item.id === job.id ? { ...item, filled: Math.min(item.quantity, countApproved(nextApplications, item.id)) } : item
            ),
            shifts: nextShifts,
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

        commit((current) => {
          const invitedApplication: Application = existing
            ? { ...existing, status: "Aprovada" }
            : {
                id: crypto.randomUUID(),
                jobId,
                workerId,
                status: "Aprovada",
                createdAt: new Date().toISOString()
              };
          const nextApplications = existing
            ? current.applications.map((item) => (item.id === existing.id ? invitedApplication : item))
            : [invitedApplication, ...current.applications];
          const nextShifts = hasShiftFor(current.shifts, jobId, workerId)
            ? current.shifts
            : [
                ...current.shifts,
                {
                  id: crypto.randomUUID(),
                  jobId,
                  workerId,
                  status: "Ainda não chegou" as const
                }
              ];

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
            shifts: nextShifts,
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

        return { ok: true, message: `${worker.name} foi confirmado em ${job.title}.` };
      },
      checkIn(jobId, workerId) {
        commit((current) => ({
          ...current,
          shifts: current.shifts.map((shift) =>
            shift.jobId === jobId && shift.workerId === workerId
              ? { ...shift, status: "Fez check-in", checkinAt: new Date().toISOString() }
              : shift
          ),
          notifications: [
            {
              id: crypto.randomUUID(),
              title: "O profissional realizou check-in",
              body: "O início do turno foi registrado.",
              role: "empresa",
              createdAt: new Date().toISOString(),
              read: false
            },
            ...current.notifications
          ]
        }));
      },
      checkOut(jobId, workerId) {
        commit((current) => ({
          ...current,
          shifts: current.shifts.map((shift) =>
            shift.jobId === jobId && shift.workerId === workerId
              ? { ...shift, status: "Finalizou o turno", checkoutAt: new Date().toISOString() }
              : shift
          )
        }));
      },
      markNotificationRead(notificationId) {
        commit((current) => ({
          ...current,
          notifications: current.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification
          )
        }));
      },
      markRoleNotificationsRead(role) {
        commit((current) => ({
          ...current,
          notifications: current.notifications.map((notification) =>
            notification.role === role ? { ...notification, read: true } : notification
          )
        }));
      },
      subscribeProfessional() {
        commit((current) => ({
          ...current,
          subscription: { ...current.subscription, plan: "Profissional", creditsRemaining: 999 }
        }));
      },
      buyCredits() {
        commit((current) => ({
          ...current,
          subscription: {
            ...current.subscription,
            creditsRemaining: current.subscription.creditsRemaining + 5
          }
        }));
      },
      addReview(workerId, review) {
        commit((current) => ({
          ...current,
          workers: current.workers.map((worker) =>
            worker.id === workerId
              ? (() => {
                  const reviews = [{ id: crypto.randomUUID(), ...review }, ...worker.reviews];
                  const rating = reviews.reduce((total, item) => total + item.rating, 0) / reviews.length;
                  return {
                    ...worker,
                    rating: Number(rating.toFixed(1)),
                    completedJobs: worker.completedJobs + 1,
                    reviews
                  };
                })()
              : worker
          )
        }));
      }
    }),
    [state, syncStatus, syncError, currentWorker, currentCompany]
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
