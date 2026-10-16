import { CalendarDays, ChevronRight, Clock, MapPin, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarButton } from "./AvatarButton";
import { UrgentBadge } from "./UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, pluralize } from "../lib/format";
import { functionLabel } from "../lib/functionInfo";
import { getOpenSlots } from "../lib/rules";
import type { Job } from "../lib/types";

// Cartão de vaga compacto: título, empresa e diária no topo; dados do turno
// em uma linha com ícones; combinação com o perfil como selo.
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
  const companyReviews = state.companyReviews.filter((review) => review.companyId === job.companyId);
  const openSlots = getOpenSlots(job);
  const strongMatch = typeof matchScore === "number" && matchScore >= 62;

  return (
    <article className={`job-card ${job.urgent ? "is-urgent" : ""}`}>
      <div className="job-card-head">
        {company?.logoUrl && (
          <AvatarButton
            src={company.logoUrl}
            name={company.establishmentName}
            className="h-11 w-11 rounded-lg object-cover"
            ringClassName="ring-1 ring-white/10"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="job-card-title">{job.title}</h3>
          <p className="job-card-company">
            {company?.establishmentName}
            {companyReviews.length > 0 && (
              <span>
                <Star size={12} /> {company?.rating.toFixed(1)} ({companyReviews.length})
              </span>
            )}
          </p>
        </div>
        <div className="job-card-price">
          <strong>{formatCurrency(job.dailyValue)}</strong>
          <span>diária</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {job.urgent && <UrgentBadge />}
        <span className="cand-chip">{functionLabel(job.function)}</span>
        <span className="cand-chip">{job.paymentMethod}</span>
        {matchLabel && (
          <span className={`job-card-match ${strongMatch ? "is-strong" : ""}`}>
            <Star size={12} /> {typeof matchScore === "number" && !compact ? `${Math.min(100, matchScore)}% · ` : ""}
            {matchLabel}
          </span>
        )}
      </div>

      <p className="job-card-meta">
        <span>
          <MapPin size={14} /> {job.neighborhood}
        </span>
        <span>
          <CalendarDays size={14} /> {formatDate(job.date)}
        </span>
        <span>
          <Clock size={14} /> {job.startsAt} às {job.endsAt}
        </span>
        <span>
          <Users size={14} /> {pluralize(openSlots, "vaga", "vagas")}
        </span>
      </p>

      {!compact && job.description && <p className="line-clamp-2 text-sm leading-6 text-slate-500">{job.description}</p>}

      <div className="job-card-footer">
        <span>
          {job.candidates} candidato{job.candidates === 1 ? "" : "s"}
        </span>
        <Link to={`/app/vagas/${job.id}`} className="cand-btn is-primary">
          Ver vaga <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}
