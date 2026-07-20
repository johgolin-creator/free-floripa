import type { Application, ApplicationStatus, Job, WorkerProfile } from "./types";

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

export function canApply(job: Job, applications: Application[], workerId: string, creditsRemaining: number) {
  if (getOpenSlots(job) <= 0) {
    return { allowed: false, reason: "Todas as vagas já foram preenchidas." };
  }

  const duplicated = applications.some((application) => application.jobId === job.id && application.workerId === workerId);
  if (duplicated) {
    return { allowed: false, reason: "Você já se candidatou para esta vaga." };
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
