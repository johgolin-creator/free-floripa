import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Heart, UserCheck, UserX } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getOpenSlots } from "../lib/rules";
import type { Application, Job, WorkShift } from "../lib/types";

const terminalStatuses = ["Recusada", "Cancelada", "Trabalho concluído", "Falta registrada"];

export function CandidatesPage() {
  const { state, currentCompany, toggleFavorite, updateApplicationStatus, checkIn, checkOut } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const selectedJobId = searchParams.get("vaga") || companyJobs[0]?.id || "";
  const selectedJob = companyJobs.find((job) => job.id === selectedJobId) ?? companyJobs[0];
  const applications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
  const selectedApplications = selectedJob ? applications.filter((application) => application.jobId === selectedJob.id) : [];
  const stats = useMemo(() => getJobStats(selectedJob, selectedApplications), [selectedApplications, selectedJob]);

  useEffect(() => {
    if (companyJobs.length > 0 && !companyJobs.some((job) => job.id === selectedJobId)) {
      setSearchParams({ vaga: companyJobs[0].id }, { replace: true });
    }
  }, [companyJobs, selectedJobId, setSearchParams]);

  function runStatus(applicationId: string, status: Application["status"]) {
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Candidatos"
        title="Gerenciar candidatos"
        description="Filtre por vaga, aprove profissionais, registre presença e finalize o turno."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga publicada" text="Crie uma vaga para começar a receber candidatos." />
      ) : (
        <div className="grid gap-4">
          <section className="card grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="label">
              Vaga
              <select
                className="input"
                value={selectedJob?.id ?? ""}
                onChange={(event) => setSearchParams({ vaga: event.target.value })}
              >
                {companyJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {formatDate(job.date)} - {job.candidates} candidato{job.candidates === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            {selectedJob && (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Stat label="candidatos" value={String(stats.total)} />
                <Stat label="em análise" value={String(stats.pending)} />
                <Stat label="confirmados" value={`${selectedJob.filled}/${selectedJob.quantity}`} />
                <Stat label="vagas abertas" value={String(getOpenSlots(selectedJob))} />
              </div>
            )}
          </section>

          {selectedJob && (
            <section className="card p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedJob.urgent && <span className="badge urgent">URGENTE</span>}
                    <span className="badge">{selectedJob.function}</span>
                    <span className="badge">{formatCurrency(selectedJob.dailyValue)}</span>
                  </div>
                  <h3 className="text-lg font-black text-navy-950">{selectedJob.title}</h3>
                  <p className="text-sm font-semibold text-slate-600">
                    {selectedJob.neighborhood} - {formatDate(selectedJob.date)} - {selectedJob.startsAt} até {selectedJob.endsAt}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-600">
                  {stats.completed} concluído{stats.completed === 1 ? "" : "s"} - {stats.noShow} falta{stats.noShow === 1 ? "" : "s"}
                </div>
              </div>
            </section>
          )}

          {!selectedJob || selectedApplications.length === 0 ? (
            <EmptyState title="Nenhum candidato nesta vaga" text="Quando alguém se candidatar, os dados aparecerão aqui com ações de aprovação." />
          ) : (
            <div className="grid gap-3">
              {selectedApplications.map((application) => {
                const worker = state.workers.find((item) => item.id === application.workerId);
                if (!worker || !selectedJob) return null;
                const shift = state.shifts.find((item) => item.jobId === selectedJob.id && item.workerId === worker.id);
                const favorite = state.favoriteWorkerIds.includes(worker.id);
                const approved = application.status === "Aprovada";
                const completed = application.status === "Trabalho concluído";
                const refused = terminalStatuses.includes(application.status) && !approved;
                const noSlots = getOpenSlots(selectedJob) === 0 && !approved && !completed;

                return (
                  <article key={application.id} className="grid gap-2">
                    <WorkerCard worker={worker} functionFocus={selectedJob.function} showActions={false} />
                    <div className="card grid gap-3 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="badge bg-aqua-100 text-aqua-700">{application.status}</span>
                          <span className="badge">{getShiftLabel(application, shift)}</span>
                          <span className="badge">Inscrito em {formatDate(application.createdAt.slice(0, 10))}</span>
                        </div>
                        <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
                          <Heart size={17} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Favorito" : "Favoritar"}
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Em análise")}
                          disabled={application.status !== "Enviada"}
                          className="secondary"
                        >
                          <Clock3 size={17} /> Analisar
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Aprovada")}
                          disabled={approved || completed || noSlots}
                          className="primary"
                        >
                          <UserCheck size={17} /> {approved || completed ? "Confirmado" : noSlots ? "Sem vaga" : "Aprovar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Recusada")}
                          disabled={refused || approved || completed}
                          className="secondary"
                        >
                          <UserX size={17} /> Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            checkIn(selectedJob.id, worker.id);
                            setMessage(`Check-in registrado para ${worker.name}.`);
                          }}
                          disabled={!approved || shift?.status !== "Ainda não chegou"}
                          className="secondary"
                        >
                          Check-in
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            checkOut(selectedJob.id, worker.id);
                            runStatus(application.id, "Trabalho concluído");
                          }}
                          disabled={!approved || shift?.status !== "Fez check-in"}
                          className="primary"
                        >
                          <CheckCircle2 size={17} /> Concluir
                        </button>
                        <button
                          type="button"
                          onClick={() => runStatus(application.id, "Falta registrada")}
                          disabled={!approved || shift?.status !== "Ainda não chegou"}
                          className="danger"
                        >
                          Registrar falta
                        </button>
                      </div>
                    </div>
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

function getJobStats(job: Job | undefined, applications: Application[]) {
  if (!job) return { total: 0, pending: 0, completed: 0, noShow: 0 };
  return {
    total: applications.length,
    pending: applications.filter((item) => item.status === "Enviada" || item.status === "Em análise").length,
    completed: applications.filter((item) => item.status === "Trabalho concluído").length,
    noShow: applications.filter((item) => item.status === "Falta registrada").length
  };
}

function getShiftLabel(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Trabalho concluído") return "Turno finalizado";
  if (application.status === "Falta registrada") return "Falta registrada";
  if (application.status === "Aprovada") return shift?.status ?? "Aguardando presença";
  if (application.status === "Em análise") return "Em análise";
  if (application.status === "Recusada") return "Recusado";
  if (application.status === "Cancelada") return "Cancelado";
  return "Novo candidato";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-50 p-3">
      <strong className="block text-lg font-black text-navy-950">{value}</strong>
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    </span>
  );
}
