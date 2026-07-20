import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { initialState } from "../data/demoData";
import { canApply, canApprove, getOpenSlots } from "./rules";
import type { AppState, Application, ApplicationStatus, Job, JobFunction, Neighborhood, PaymentMethod, Review } from "./types";

const STORAGE_KEY = "free-floripa:state";

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
  currentWorker: AppState["workers"][number];
  currentCompany: AppState["companies"][number];
  setRole: (role: AppState["activeRole"]) => void;
  createJob: (input: CreateJobInput) => string;
  createUrgentReplacement: (input: UrgentReplacementInput) => string;
  applyToJob: (jobId: string) => { ok: boolean; message: string; requiresPlan?: boolean };
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => { ok: boolean; message: string };
  toggleFavorite: (workerId: string) => void;
  checkIn: (jobId: string, workerId: string) => void;
  checkOut: (jobId: string, workerId: string) => void;
  subscribeProfessional: () => void;
  buyCredits: () => void;
  addReview: (workerId: string, review: Omit<Review, "id">) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : initialState;
  } catch {
    return initialState;
  }
}

function persist(nextState: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitialState());

  function commit(updater: (current: AppState) => AppState) {
    setState((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  }

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
      applyToJob(jobId) {
        const job = state.jobs.find((item) => item.id === jobId);
        if (!job) return { ok: false, message: "Vaga não encontrada." };

        const result = canApply(job, state.applications, currentWorker.id, state.subscription.creditsRemaining);
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

        if (status === "Aprovada" && !canApprove(job, state.applications)) {
          return { ok: false, message: "Não é possível aprovar mais pessoas do que a quantidade disponível." };
        }

        commit((current) => ({
          ...current,
          applications: current.applications.map((item) => (item.id === applicationId ? { ...item, status } : item)),
          jobs: current.jobs.map((item) =>
            item.id === job.id && status === "Aprovada" ? { ...item, filled: Math.min(item.quantity, item.filled + 1) } : item
          ),
          shifts:
            status === "Aprovada"
              ? [
                  ...current.shifts,
                  {
                    id: crypto.randomUUID(),
                    jobId: job.id,
                    workerId: application.workerId,
                    status: "Ainda não chegou"
                  }
                ]
              : current.shifts,
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
        }));

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
              ? { ...worker, reviews: [{ id: crypto.randomUUID(), ...review }, ...worker.reviews] }
              : worker
          )
        }));
      }
    }),
    [state, currentWorker, currentCompany]
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
