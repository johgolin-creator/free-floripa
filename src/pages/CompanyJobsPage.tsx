import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, RotateCcw, Square, XCircle } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Application, Job, JobStatus } from "../lib/types";

type JobFilter = "Todas" | "Ativas" | "Rascunhos" | "Histórico";

const filters: JobFilter[] = ["Todas", "Ativas", "Rascunhos", "Histórico"];

export function CompanyJobsPage() {
  const { state, currentCompany, updateJobStatus, duplicateJob } = useAppStore();
  const [filter, setFilter] = useState<JobFilter>("Todas");
  const [message, setMessage] = useState("");
  const jobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const filteredJobs = useMemo(() => jobs.filter((job) => matchesFilter(job, filter)), [jobs, filter]);

  function runStatus(jobId: string, status: JobStatus) {
    const result = updateJobStatus(jobId, status);
    setMessage(result.message);
  }

  function runDuplicate(jobId: string) {
    const result = duplicateJob(jobId);
    setMessage(result.message);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Minhas vagas"
        title="Operação das vagas"
        description="Controle status, candidatos, encerramento, cancelamento, duplicação e histórico."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {jobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma nova vaga no painel da empresa." />
      ) : (
        <div className="grid gap-4">
          <section className="card grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <Stat label="ativas" value={String(jobs.filter((job) => isActiveStatus(getJobStatus(job))).length)} />
              <Stat label="rascunhos" value={String(jobs.filter((job) => getJobStatus(job) === "Rascunho").length)} />
              <Stat label="concluídas" value={String(jobs.filter((job) => getJobStatus(job) === "Concluída").length)} />
              <Stat label="canceladas" value={String(jobs.filter((job) => getJobStatus(job) === "Cancelada").length)} />
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={filter === item ? "primary" : "secondary"}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {filteredJobs.length === 0 ? (
            <EmptyState title="Nada neste filtro" text="Troque o filtro para visualizar outras vagas." />
          ) : (
            <div className="grid gap-3">
              {filteredJobs.map((job) => {
                const status = getJobStatus(job);
                const applications = state.applications.filter((application) => application.jobId === job.id);
                const confirmed = applications.filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído").length;
                const completed = applications.filter((application) => application.status === "Trabalho concluído").length;
                const absences = applications.filter((application) => application.status === "Falta registrada").length;
                const expectedValue = confirmed * job.dailyValue;
                const terminal = status === "Concluída" || status === "Cancelada";

                return (
                  <article key={job.id} className="card grid gap-4 p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className={getStatusClass(status)}>{status}</span>
                          {job.urgent && status !== "Cancelada" && status !== "Concluída" && <span className="badge urgent">URGENTE</span>}
                          <span className="badge">{job.function}</span>
                        </div>
                        <h3 className="font-black text-navy-950">{job.title}</h3>
                        <p className="text-sm text-slate-600">
                          {job.neighborhood} - {formatDate(job.date)} - {job.startsAt} às {job.endsAt} - {formatCurrency(job.dailyValue)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {getOpenSlots(job)} vagas restantes - {job.candidates} candidatos - {confirmed}/{job.quantity} confirmados
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:w-[520px]">
                        <Mini label="concluídos" value={String(completed)} />
                        <Mini label="faltas" value={String(absences)} />
                        <Mini label="previsto" value={formatCurrency(expectedValue)} />
                        <Mini label="status" value={status} />
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                      <Link to={`/app/candidatos?vaga=${job.id}`} className="secondary">
                        Ver candidatos
                      </Link>
                      <button type="button" onClick={() => runStatus(job.id, "Concluída")} disabled={terminal} className="primary">
                        <CheckCircle2 size={17} /> Encerrar
                      </button>
                      <button type="button" onClick={() => runStatus(job.id, "Cancelada")} disabled={terminal} className="danger">
                        <XCircle size={17} /> Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => runStatus(job.id, "Publicada")}
                        disabled={status === "Publicada" || status === "Urgente" || status === "Em andamento"}
                        className="secondary"
                      >
                        <RotateCcw size={17} /> Reabrir
                      </button>
                      <button type="button" onClick={() => runDuplicate(job.id)} className="secondary">
                        <Copy size={17} /> Duplicar
                      </button>
                      <button type="button" onClick={() => runStatus(job.id, "Rascunho")} disabled={status === "Rascunho" || terminal} className="secondary">
                        <Square size={17} /> Rascunho
                      </button>
                    </div>

                    <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-sm font-black text-navy-950">Histórico da vaga</summary>
                      <JobHistory job={job} applications={applications} />
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function matchesFilter(job: Job, filter: JobFilter) {
  const status = getJobStatus(job);
  if (filter === "Ativas") return isActiveStatus(status);
  if (filter === "Rascunhos") return status === "Rascunho";
  if (filter === "Histórico") return status === "Concluída" || status === "Cancelada";
  return true;
}

function isActiveStatus(status: ReturnType<typeof getJobStatus>) {
  return status === "Publicada" || status === "Urgente" || status === "Em andamento";
}

function getStatusClass(status: ReturnType<typeof getJobStatus>) {
  if (status === "Urgente") return "badge urgent";
  if (status === "Cancelada") return "badge bg-red-50 text-alert";
  if (status === "Concluída") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Rascunho") return "badge bg-slate-200 text-slate-700";
  return "badge";
}

function JobHistory({ job, applications }: { job: Job; applications: Application[] }) {
  const { state } = useAppStore();

  if (applications.length === 0) {
    return <p className="mt-3 text-sm font-semibold text-slate-500">Nenhuma candidatura registrada nesta vaga.</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {applications.map((application) => {
        const worker = state.workers.find((item) => item.id === application.workerId);
        const shift = state.shifts.find((item) => item.jobId === job.id && item.workerId === application.workerId);
        return (
          <div key={application.id} className="grid gap-2 rounded-lg bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <strong className="text-sm text-navy-950">{worker?.name ?? "Profissional"}</strong>
              <p className="text-xs font-semibold text-slate-500">
                {application.status} - inscrição em {formatDate(application.createdAt.slice(0, 10))}
                {shift?.checkinAt ? ` - check-in ${new Date(shift.checkinAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                {shift?.checkoutAt ? ` - saída ${new Date(shift.checkoutAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            </div>
            <span className="badge justify-center">{shift?.status ?? "Sem turno"}</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-50 p-3">
      <strong className="block text-lg font-black text-navy-950">{value}</strong>
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-50 p-2">
      <strong className="block truncate text-sm font-black text-navy-950">{value}</strong>
      <span className="text-[0.68rem] font-black uppercase text-slate-500">{label}</span>
    </span>
  );
}
