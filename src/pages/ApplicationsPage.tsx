import { Link } from "react-router-dom";
import { Lock, MessageCircle, Phone } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDateTime, getWhatsAppUrl } from "../lib/format";

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
            const contactUnlocked = application.status === "Aprovada" || application.status === "Trabalho concluído";
            if (!job) return null;
            return (
              <article key={application.id} className="card grid gap-3 p-4">
                <div>
                  <span className="badge">{application.status}</span>
                  <h3 className="mt-2 font-black text-navy-950">{job.title}</h3>
                  <p className="text-sm text-slate-600">
                    {company?.establishmentName} - {job.neighborhood} - {formatCurrency(job.dailyValue)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(application.createdAt)}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                  {contactUnlocked && company ? (
                    <div className="flex flex-wrap gap-3 rounded-lg bg-aqua-100 p-3 text-sm font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5"><Phone size={15} /> {company.phone}</span>
                      <a
                        className="inline-flex items-center gap-1.5 font-black text-aqua-700"
                        href={getWhatsAppUrl(company.phone, `Olá, sou ${currentWorker.name}. Minha candidatura para ${job.title} foi aprovada.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-500">
                      <Lock size={16} /> Contato liberado após aprovação.
                    </div>
                  )}
                  <Link to={`/app/vagas/${job.id}`} className="secondary">
                    Ver detalhes
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
