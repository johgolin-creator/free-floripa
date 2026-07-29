import { calculateReliability } from "./rules";
import type { WorkerProfile } from "./types";

export interface TrustBadge {
  label: string;
  detail: string;
  tone: string;
}

export function getTrustBadges(worker: WorkerProfile): TrustBadge[] {
  const reliability = calculateReliability(worker);
  const badges: TrustBadge[] = [];

  if (reliability >= 88) {
    badges.push({
      label: "Confiável",
      detail: `${reliability}% de confiabilidade`,
      tone: "bg-aqua-100 text-aqua-700"
    });
  }

  if (worker.punctualityRate >= 92) {
    badges.push({
      label: "Pontual",
      detail: `${worker.punctualityRate}% de pontualidade`,
      tone: "bg-sky-50 text-sky-700"
    });
  }

  if (worker.attendanceRate >= 95) {
    badges.push({
      label: "Presença forte",
      detail: `${worker.attendanceRate}% de comparecimento`,
      tone: "bg-emerald-50 text-emerald-700"
    });
  }

  if (worker.rating >= 4.8 && worker.reviews.length >= 2) {
    badges.push({
      label: "Muito recomendado",
      detail: `${worker.rating.toFixed(1)} de média`,
      tone: "bg-amber-50 text-amber-700"
    });
  }

  if (worker.completedJobs >= 20) {
    badges.push({
      label: "Experiente",
      detail: `${worker.completedJobs} trabalhos`,
      tone: "bg-violet-50 text-violet-700"
    });
  }

  return badges.slice(0, 4);
}
