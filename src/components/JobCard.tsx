import { CalendarDays, Clock, Lock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, pluralize } from "../lib/format";
import { getOpenSlots } from "../lib/rules";
import type { Job } from "../lib/types";

export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { state } = useAppStore();
  const company = state.companies.find((item) => item.id === job.companyId);
  const openSlots = getOpenSlots(job);
  const canViewFullJob = state.subscription.plan === "Profissional";

  return (
    <article className="card relative grid gap-4 overflow-hidden p-4 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="absolute inset-y-0 left-0 w-1 bg-aqua-500" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {job.urgent && <span className="badge urgent">URGENTE</span>}
            <span className="badge">{job.function}</span>
            <span className="badge">{job.paymentMethod}</span>
          </div>
          <h3 className="text-lg font-black text-navy-950">{job.title}</h3>
          <p className="text-sm font-semibold text-slate-600">{canViewFullJob ? company?.establishmentName : "Empresa verificada"}</p>
        </div>
        <div className="rounded-lg border border-aqua-100 bg-aqua-50 px-3 py-2 text-right">
          <strong className="block text-lg text-navy-950">{formatCurrency(job.dailyValue)}</strong>
          <span className="text-xs font-black uppercase text-aqua-700">diária</span>
        </div>
      </div>

      {!compact && (
        <p className="text-sm leading-6 text-slate-600">
          {canViewFullJob
            ? job.description
            : "Prévia da vaga disponível. Assine o plano profissional para ver descrição completa, requisitos, benefícios e dados protegidos."}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm font-semibold text-slate-600 md:grid-cols-4">
        <span className="flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-2">
          <MapPin size={16} /> {job.neighborhood}
        </span>
        <span className="flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-2">
          <CalendarDays size={16} /> {formatDate(job.date)}
        </span>
        <span className="flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-2">
          <Clock size={16} /> {job.startsAt} às {job.endsAt}
        </span>
        <span className="flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-2">
          <Users size={16} /> {pluralize(openSlots, "vaga", "vagas")}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-600">{job.candidates} candidatos</span>
        <Link to={`/app/vagas/${job.id}`} className="primary">
          {!canViewFullJob && <Lock size={17} />}
          {canViewFullJob ? "Ver vaga" : "Liberar vaga completa"}
        </Link>
      </div>
    </article>
  );
}
