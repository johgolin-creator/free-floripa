import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, pluralize } from "../lib/format";
import { getOpenSlots } from "../lib/rules";
import type { Job } from "../lib/types";

export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { state } = useAppStore();
  const company = state.companies.find((item) => item.id === job.companyId);
  const openSlots = getOpenSlots(job);

  return (
    <article className="card grid gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {job.urgent && <span className="badge urgent">URGENTE</span>}
            <span className="badge">{job.function}</span>
            <span className="badge">{job.paymentMethod}</span>
          </div>
          <h3 className="text-lg font-black text-navy-950">{job.title}</h3>
          <p className="text-sm font-semibold text-slate-600">{company?.establishmentName}</p>
        </div>
        <div className="text-right">
          <strong className="block text-lg text-navy-950">{formatCurrency(job.dailyValue)}</strong>
          <span className="text-xs font-bold text-slate-500">diária</span>
        </div>
      </div>

      {!compact && <p className="text-sm leading-6 text-slate-600">{job.description}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 md:grid-cols-4">
        <span className="flex items-center gap-1.5">
          <MapPin size={16} /> {job.neighborhood}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={16} /> {formatDate(job.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={16} /> {job.startsAt} às {job.endsAt}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={16} /> {pluralize(openSlots, "vaga", "vagas")}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-600">{job.candidates} candidatos</span>
        <Link to={`/app/vagas/${job.id}`} className="primary">
          Ver vaga
        </Link>
      </div>
    </article>
  );
}
