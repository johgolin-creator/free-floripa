import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDateTime } from "../lib/format";

export function ApplicationsPage() {
  const { state, currentWorker } = useAppStore();
  const applications = state.applications.filter((application) => application.workerId === currentWorker.id);

  return (
    <div>
      <SectionHeader eyebrow="Candidaturas" title="Candidaturas enviadas" description="Acompanhe o status de cada candidatura." />
      {applications.length === 0 ? (
        <EmptyState title="Nenhuma candidatura enviada" text="Busque vagas disponíveis e envie sua primeira candidatura." />
      ) : (
        <div className="grid gap-3">
          {applications.map((application) => {
            const job = state.jobs.find((item) => item.id === application.jobId);
            const company = state.companies.find((item) => item.id === job?.companyId);
            if (!job) return null;
            return (
              <article key={application.id} className="card grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="badge">{application.status}</span>
                  <h3 className="mt-2 font-black text-navy-950">{job.title}</h3>
                  <p className="text-sm text-slate-600">
                    {company?.establishmentName} - {job.neighborhood} - {formatCurrency(job.dailyValue)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(application.createdAt)}</p>
                </div>
                <Link to={`/app/vagas/${job.id}`} className="secondary">
                  Ver detalhes
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
