import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";

export function CandidatesPage() {
  const { state, currentCompany, updateApplicationStatus } = useAppStore();
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
                    return (
                      <div key={application.id} className="grid gap-2">
                        <WorkerCard worker={worker} />
                        <div className="card grid gap-2 p-3 md:grid-cols-3">
                          <span className="badge justify-center">{application.status}</span>
                          <button type="button" onClick={() => alert(updateApplicationStatus(application.id, "Recusada").message)} className="secondary">
                            Recusar
                          </button>
                          <button type="button" onClick={() => alert(updateApplicationStatus(application.id, "Aprovada").message)} className="primary">
                            Aprovar
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
