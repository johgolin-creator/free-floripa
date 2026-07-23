import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Mail, MessageCircle, Phone, UserCheck, UserX } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Application, Job, WorkShift } from "../lib/types";

type ScheduleFilter = "Todas" | "Hoje" | "Futuras" | "Concluídas";

const filters: ScheduleFilter[] = ["Todas", "Hoje", "Futuras", "Concluídas"];

export function CompanySchedulePage() {
  const { state, currentCompany, checkIn, checkOut, updateApplicationStatus } = useAppStore();
  const [filter, setFilter] = useState<ScheduleFilter>("Todas");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const companyJobs = state.jobs
    .filter((job) => job.companyId === currentCompany.id)
    .filter((job) => getJobStatus(job) !== "Cancelada" && getJobStatus(job) !== "Rascunho");
  const scheduleJobs = useMemo(
    () =>
      companyJobs
        .filter((job) => matchesScheduleFilter(job, filter, date, today))
        .sort((a, b) => `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`)),
    [companyJobs, date, filter, today]
  );
  const scheduleApplications = state.applications.filter((application) =>
    companyJobs.some((job) => job.id === application.jobId)
  );
  const confirmedCount = scheduleApplications.filter((application) => isScheduled(application)).length;
  const checkedInCount = state.shifts.filter((shift) =>
    companyJobs.some((job) => job.id === shift.jobId) && shift.status === "Fez check-in"
  ).length;
  const completedCount = scheduleApplications.filter((application) => application.status === "Trabalho concluído").length;

  function runStatus(applicationId: string, status: Application["status"]) {
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Escala"
        title="Montar escala"
        description="Organize profissionais aprovados por data, vaga e turno. Registre presença, conclusão ou falta no mesmo lugar."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="card mb-4 grid gap-3 p-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <Stat label="confirmados" value={String(confirmedCount)} />
          <Stat label="em turno" value={String(checkedInCount)} />
          <Stat label="concluídos" value={String(completedCount)} />
          <Stat label="vagas abertas" value={String(companyJobs.reduce((total, job) => total + getOpenSlots(job), 0))} />
        </div>
        <div className="grid gap-2 md:grid-cols-[180px_1fr]">
          <label className="label">
            Data
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            {filters.map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={filter === item ? "primary" : "secondary"}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {companyJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga para escalar" text="Publique uma vaga e aprove candidatos para montar a escala." />
      ) : scheduleJobs.length === 0 ? (
        <EmptyState title="Nada neste filtro" text="Troque a data ou o filtro para visualizar outras escalas." />
      ) : (
        <div className="grid gap-4">
          {scheduleJobs.map((job) => {
            const applications = state.applications.filter((application) => application.jobId === job.id && isRelevantToSchedule(application));
            const confirmed = applications.filter((application) => isScheduled(application)).length;
            const shifts = state.shifts.filter((shift) => shift.jobId === job.id);

            return (
              <section key={job.id} className="card grid gap-4 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {job.urgent && <span className="badge urgent">URGENTE</span>}
                      <span className="badge">{getJobStatus(job)}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                    </div>
                    <h3 className="text-lg font-black text-navy-950">{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {formatDate(job.date)} - {job.startsAt} às {job.endsAt} - {job.neighborhood}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:w-[520px]">
                    <Mini label="confirmados" value={`${confirmed}/${job.quantity}`} />
                    <Mini label="em aberto" value={String(getOpenSlots(job))} />
                    <Mini label="check-in" value={String(shifts.filter((shift) => shift.status === "Fez check-in").length)} />
                    <Mini label="finalizados" value={String(shifts.filter((shift) => shift.status === "Finalizou o turno").length)} />
                  </div>
                </div>

                {getOpenSlots(job) > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-slate-700">
                    Faltam {getOpenSlots(job)} profissional{getOpenSlots(job) === 1 ? "" : "is"} para completar esta escala.
                    <Link to={`/app/candidatos?vaga=${job.id}`} className="ml-2 font-black text-aqua-700">Ver candidatos</Link>
                  </div>
                )}

                {applications.length === 0 ? (
                  <EmptyState title="Nenhum profissional confirmado" text="Aprove candidatos para preencher esta escala." />
                ) : (
                  <div className="grid gap-3">
                    {applications.map((application) => (
                      <ScheduleWorker
                        key={application.id}
                        application={application}
                        job={job}
                        shift={state.shifts.find((item) => item.jobId === job.id && item.workerId === application.workerId)}
                        onCheckIn={() => {
                          checkIn(job.id, application.workerId);
                          setMessage("Check-in registrado na escala.");
                        }}
                        onCheckOut={() => {
                          checkOut(job.id, application.workerId);
                          runStatus(application.id, "Trabalho concluído");
                        }}
                        onAbsence={() => runStatus(application.id, "Falta registrada")}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScheduleWorker({
  application,
  job,
  shift,
  onCheckIn,
  onCheckOut,
  onAbsence
}: {
  application: Application;
  job: Job;
  shift?: WorkShift;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onAbsence: () => void;
}) {
  const { state, currentCompany } = useAppStore();
  const worker = state.workers.find((item) => item.id === application.workerId);
  if (!worker) return null;

  const active = application.status === "Aprovada";
  const completed = application.status === "Trabalho concluído";
  const absence = application.status === "Falta registrada";

  return (
    <article className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <img src={worker.avatarUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-navy-950">{worker.name}</strong>
            <span className="badge">{application.status}</span>
            <span className="badge">{shift?.status ?? "Aguardando presença"}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {worker.functions.join(", ")} - {worker.neighborhood}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><Phone size={14} /> {worker.phone}</span>
            <span className="flex items-center gap-1.5"><Mail size={14} /> {worker.email}</span>
            <a
              href={getWhatsAppUrl(worker.phone, `Olá, ${worker.name}. Estou organizando a escala da vaga ${job.title} no ${currentCompany.establishmentName}.`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-black text-aqua-700"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]">
        <button
          type="button"
          onClick={onCheckIn}
          disabled={!active || shift?.status !== "Ainda não chegou"}
          className="secondary"
        >
          <UserCheck size={17} /> Check-in
        </button>
        <button
          type="button"
          onClick={onCheckOut}
          disabled={!active || shift?.status !== "Fez check-in"}
          className="primary"
        >
          <CheckCircle2 size={17} /> Concluir
        </button>
        <button
          type="button"
          onClick={onAbsence}
          disabled={!active || completed || absence || shift?.status !== "Ainda não chegou"}
          className="danger"
        >
          <UserX size={17} /> Falta
        </button>
      </div>
    </article>
  );
}

function matchesScheduleFilter(job: Job, filter: ScheduleFilter, selectedDate: string, today: string) {
  if (selectedDate && job.date !== selectedDate) return false;
  if (filter === "Hoje") return job.date === today;
  if (filter === "Futuras") return job.date >= today && getJobStatus(job) !== "Concluída";
  if (filter === "Concluídas") return getJobStatus(job) === "Concluída";
  return true;
}

function isRelevantToSchedule(application: Application) {
  return application.status === "Aprovada" || application.status === "Trabalho concluído" || application.status === "Falta registrada";
}

function isScheduled(application: Application) {
  return application.status === "Aprovada" || application.status === "Trabalho concluído";
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
