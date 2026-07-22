import { Heart } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { getOpenSlots } from "../lib/rules";

export function CandidatesPage() {
  const { state, currentCompany, toggleFavorite, updateApplicationStatus } = useAppStore();
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const applications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));

  return (
    <div>
      <SectionHeader eyebrow="Candidatos" title="Candidatos por vaga" description="Aprove, recuse e favorite profissionais sem exceder a quantidade de vagas." />
      {applications.length === 0 ? (
        <EmptyState title="Nenhum candidato ainda" text="Quando trabalhadores se candidatarem às suas vagas, eles aparecerão nesta tela." />
      ) : (
        <div className="grid gap-5">
          {companyJobs.map((job) => {
            const jobApplications = applications.filter((application) => application.jobId === job.id);
            if (jobApplications.length === 0) return null;
            return (
              <section key={job.id} className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black text-navy-950">{job.title}</h3>
                    <p className="text-sm text-slate-600">{job.filled}/{job.quantity} profissionais confirmados</p>
                  </div>
                  {job.urgent && <span className="badge urgent">URGENTE</span>}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {jobApplications.map((application) => {
                    const worker = state.workers.find((item) => item.id === application.workerId);
                    if (!worker) return null;
                    const favorite = state.favoriteWorkerIds.includes(worker.id);
                    const approved = application.status === "Aprovada";
                    const refused = application.status === "Recusada";
                    const noSlots = getOpenSlots(job) === 0 && !approved;
                    return (
                      <div key={application.id} className="grid gap-2">
                        <WorkerCard worker={worker} functionFocus={job.function} showActions={false} />
                        <div className="card grid gap-2 p-3 md:grid-cols-4">
                          <span className="badge justify-center">{application.status}</span>
                          <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
                            <Heart size={17} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorito" : "Favoritar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(updateApplicationStatus(application.id, "Recusada").message)}
                            disabled={refused}
                            className="secondary"
                          >
                            Recusar
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(updateApplicationStatus(application.id, "Aprovada").message)}
                            disabled={approved || noSlots}
                            className="primary"
                          >
                            {approved ? "Confirmado" : noSlots ? "Sem vagas" : "Aprovar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
