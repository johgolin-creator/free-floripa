import { Link } from "react-router-dom";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getOpenSlots } from "../lib/rules";

export function CompanyJobsPage() {
  const { state, currentCompany } = useAppStore();
  const jobs = state.jobs.filter((job) => job.companyId === currentCompany.id);

  return (
    <div>
      <SectionHeader eyebrow="Minhas vagas" title="Vagas publicadas" description="Acompanhe vagas restantes, candidatos e preenchimento." />
      {jobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma nova vaga no painel da empresa." />
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <article key={job.id} className="card grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {job.urgent && <span className="badge urgent">URGENTE</span>}
                  <span className="badge">{job.function}</span>
                </div>
                <h3 className="font-black text-navy-950">{job.title}</h3>
                <p className="text-sm text-slate-600">
                  {job.neighborhood} - {formatDate(job.date)} - {formatCurrency(job.dailyValue)}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {getOpenSlots(job)} vagas restantes - {job.candidates} candidatos
                </p>
              </div>
              <Link to="/app/candidatos" className="secondary">Ver candidatos</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
