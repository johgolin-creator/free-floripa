import { CalendarDays, Clock, Lock, MapPin, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { UrgentBadge } from "./UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, pluralize } from "../lib/format";
import { getOpenSlots } from "../lib/rules";
import type { Job } from "../lib/types";

export function JobCard({
  job,
  compact = false,
  matchLabel,
  matchScore
}: {
  job: Job;
  compact?: boolean;
  matchLabel?: string;
  matchScore?: number;
}) {
  const { state } = useAppStore();
  const company = state.companies.find((item) => item.id === job.companyId);
  const application = state.applications.find((item) => item.jobId === job.id && item.workerId === state.selectedWorkerId);
  const confirmed = application?.status === "Aprovada" || application?.status === "Trabalho concluído";
  const openSlots = getOpenSlots(job);
  const canViewFullJob = confirmed || state.subscription.unlockedJobIds.includes(job.id);

  return (
    <article className="card relative grid gap-4 overflow-hidden p-4 pl-5 hover:-translate-y-0.5 hover:border-aqua-200 hover:shadow-lift">
      <div className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full bg-aqua-500" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            {job.urgent && <UrgentBadge />}
            <span className="badge">{job.function}</span>
            <span className="badge">{job.paymentMethod}</span>
            {matchLabel && <span className={matchScore && matchScore >= 62 ? "badge bg-aqua-100 text-aqua-700" : "badge bg-slate-100 text-slate-600"}><Star size={14} /> {matchLabel}</span>}
          </div>
          <h3 className="text-lg font-black leading-snug text-navy-950">{job.title}</h3>
          <p className="text-sm font-semibold text-slate-600">{canViewFullJob ? company?.establishmentName : "Empresa verificada"}</p>
        </div>
        <div className="w-fit rounded-lg bg-navy-950 px-3 py-2 text-left text-white shadow-soft sm:text-right">
          <strong className="block text-lg text-white">{formatCurrency(job.dailyValue)}</strong>
          <span className="text-xs font-black uppercase text-aqua-300">diária</span>
        </div>
      </div>

      {!compact && (
        <p className="text-sm leading-6 text-slate-600">
          {canViewFullJob
            ? job.description
            : "Prévia da vaga disponível. Use 1 moeda para ver descrição completa, requisitos, benefícios e dados protegidos."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <span className="meta-pill">
          <MapPin size={16} /> {job.neighborhood}
        </span>
        <span className="meta-pill">
          <CalendarDays size={16} /> {formatDate(job.date)}
        </span>
        <span className="meta-pill">
          <Clock size={16} /> {job.startsAt} às {job.endsAt}
        </span>
        <span className="meta-pill">
          <Users size={16} /> {pluralize(openSlots, "vaga", "vagas")}
        </span>
      </div>

      {typeof matchScore === "number" && !compact && (
        <div className="job-match-bar">
          <div>
            <span>Combinação com seu perfil</span>
            <strong>{Math.min(100, matchScore)}%</strong>
          </div>
          <div>
            <span style={{ width: `${Math.min(100, matchScore)}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-600">{job.candidates} candidatos</span>
        <Link to={`/app/vagas/${job.id}`} className="primary w-full sm:w-auto">
          {!canViewFullJob && <Lock size={17} />}
          {canViewFullJob ? "Ver vaga" : "Liberar por 1 moeda"}
        </Link>
      </div>
    </article>
  );
}
