import type { Application, ApplicationStatus, ExperienceLevel, FunctionExperience, Job, JobFunction, JobStatus, WorkerProfile } from "./types";

export const experienceRank: Record<ExperienceLevel, number> = {
  Iniciante: 1,
  "Poucas diárias": 2,
  Experiente: 3,
  "Profissional experiente": 4
};

export function calculateReliability(worker: WorkerProfile) {
  const reviewScore = Math.round((worker.rating / 5) * 100);
  const cancellationPenalty = Math.min(20, worker.cancellations * 4);
  const completedScore = Math.min(100, worker.completedJobs * 2);

  return Math.max(
    0,
    Math.round(
      completedScore * 0.2 +
        worker.attendanceRate * 0.25 +
        worker.punctualityRate * 0.25 +
        reviewScore * 0.2 -
        cancellationPenalty
    )
  );
}

export function getOpenSlots(job: Job) {
  return Math.max(0, job.quantity - job.filled);
}

export function getJobStatus(job: Job): JobStatus | "Urgente" {
  if (job.status === "Cancelada" || job.status === "Concluída" || job.status === "Rascunho") return job.status;
  if (job.status === "Em andamento") return "Em andamento";
  if (job.urgent && getOpenSlots(job) > 0) return "Urgente";
  if (getOpenSlots(job) === 0) return "Em andamento";
  return "Publicada";
}

export function isJobOpenForApplications(job: Job) {
  const status = getJobStatus(job);
  return (status === "Publicada" || status === "Urgente") && getOpenSlots(job) > 0;
}

export function getFunctionExperience(worker: WorkerProfile, functionName: JobFunction): FunctionExperience | null {
  const declared = worker.functionExperience?.find((item) => item.function === functionName);
  if (declared) return declared;
  if (!worker.functions.includes(functionName)) return null;

  return {
    function: functionName,
    level: worker.verified ? "Experiente" : "Poucas diárias",
    months: Math.max(1, Math.round(worker.completedJobs / Math.max(1, worker.functions.length))),
    acceptsAssistant: true,
    verified: worker.verified
  };
}

export function getExperienceLabel(level: ExperienceLevel) {
  if (level === "Iniciante") return "Estou começando";
  if (level === "Poucas diárias") return "Poucas diárias";
  return level;
}

export function getCompatibilityLabel(worker: WorkerProfile, functionName: JobFunction) {
  const experience = getFunctionExperience(worker, functionName);
  if (!experience) return "Função não declarada";
  if (experience.level === "Iniciante") return experience.acceptsAssistant ? "Somente como auxiliar" : "Iniciante";
  if (experience.level === "Poucas diárias") return "Precisa de orientação";
  if (experience.verified) return "Experiência verificada";
  return "Nível declarado";
}

export function canApply(job: Job, applications: Application[], worker: WorkerProfile, creditsRemaining: number) {
  if (!isJobOpenForApplications(job)) {
    return { allowed: false, reason: "Todas as vagas já foram preenchidas." };
  }

  const duplicated = applications.some((application) => application.jobId === job.id && application.workerId === worker.id);
  if (duplicated) {
    return { allowed: false, reason: "Você já se candidatou para esta vaga." };
  }

  if (!getFunctionExperience(worker, job.function)) {
    return {
      allowed: false,
      reason: "Antes de se candidatar, adicione esta função ao perfil e informe seu nível de experiência."
    };
  }

  if (creditsRemaining <= 0) {
    return { allowed: false, reason: "Você não possui candidaturas disponíveis." };
  }

  return { allowed: true, reason: "" };
}

export function canApprove(job: Job, applications: Application[]) {
  const approvedCount = applications.filter((application) => application.jobId === job.id && application.status === "Aprovada").length;
  return approvedCount < job.quantity;
}

export function nextApplicationStatus(status: ApplicationStatus): ApplicationStatus {
  if (status === "Enviada") return "Em análise";
  if (status === "Em análise") return "Aprovada";
  return status;
}
