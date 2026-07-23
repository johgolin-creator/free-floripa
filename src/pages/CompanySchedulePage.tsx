import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Edit3, Mail, MessageCircle, Phone, Plus, Save, Trash2, UserCheck, UserX } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore, type CompanyScheduleInput } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Application, CompanySchedule, CompanyScheduleStatus, Job, JobFunction, Neighborhood, WorkShift } from "../lib/types";

type ScheduleFilter = "Todas" | "Hoje" | "Futuras" | "Concluídas";

const filters: ScheduleFilter[] = ["Todas", "Hoje", "Futuras", "Concluídas"];
const scheduleStatuses: CompanyScheduleStatus[] = ["Planejada", "Confirmada", "Concluída", "Cancelada"];

export function CompanySchedulePage() {
  const {
    state,
    currentCompany,
    checkIn,
    checkOut,
    updateApplicationStatus,
    createCompanySchedule,
    updateCompanySchedule,
    deleteCompanySchedule
  } = useAppStore();
  const [filter, setFilter] = useState<ScheduleFilter>("Todas");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanySchedule | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const companySchedules = state.companySchedules ?? [];
  const manualSchedules = companySchedules
    .filter((schedule) => schedule.companyId === currentCompany.id)
    .filter((schedule) => matchesManualScheduleFilter(schedule, filter, date, today))
    .sort((a, b) => `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`));
  const companyJobs = state.jobs
    .filter((job) => job.companyId === currentCompany.id)
    .filter((job) => getJobStatus(job) !== "Cancelada" && getJobStatus(job) !== "Rascunho");
  const scheduleJobs = useMemo(
    () =>
      companyJobs
        .filter((job) => matchesJobScheduleFilter(job, filter, date, today))
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
  const completedCount =
    scheduleApplications.filter((application) => application.status === "Trabalho concluído").length +
    companySchedules.filter((schedule) => schedule.companyId === currentCompany.id && schedule.status === "Concluída").length;

  function runStatus(applicationId: string, status: Application["status"]) {
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  function handleCreate(input: CompanyScheduleInput) {
    createCompanySchedule(input);
    setCreating(false);
    setMessage("Escala criada. Ela já aparece na aba Escala e pode ser editada a qualquer momento.");
  }

  function handleEdit(input: CompanyScheduleInput) {
    if (!editing) return;
    const result = updateCompanySchedule(editing.id, input);
    if (result.ok) setEditing(null);
    setMessage(result.message);
  }

  function handleDelete(scheduleId: string) {
    const result = deleteCompanySchedule(scheduleId);
    setMessage(result.message);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Escala"
        title="Montar escala"
        description="Crie suas próprias escalas, edite a operação e acompanhe também os profissionais aprovados nas vagas."
        action={<button type="button" onClick={() => setCreating(true)} className="primary"><Plus size={17} /> Criar escala</button>}
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="card mb-4 grid gap-3 p-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <Stat label="escalas criadas" value={String(companySchedules.filter((schedule) => schedule.companyId === currentCompany.id).length)} />
          <Stat label="confirmados" value={String(confirmedCount)} />
          <Stat label="em turno" value={String(checkedInCount)} />
          <Stat label="concluídos" value={String(completedCount)} />
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

      <section className="mb-5 grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-black text-navy-950">Escalas criadas pelo contratante</h3>
            <p className="text-sm font-semibold text-slate-600">Use para planejar equipe antes de publicar vaga ou antes de alguém se candidatar.</p>
          </div>
          <button type="button" onClick={() => setCreating(true)} className="secondary"><Plus size={17} /> Nova escala</button>
        </div>
        {manualSchedules.length === 0 ? (
          <EmptyState title="Nenhuma escala criada" text="Clique em Criar escala para montar uma escala manual da empresa." />
        ) : (
          <div className="grid gap-3">
            {manualSchedules.map((schedule) => (
              <ManualScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={() => setEditing(schedule)}
                onDelete={() => handleDelete(schedule.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div>
          <h3 className="text-lg font-black text-navy-950">Escala das vagas aprovadas</h3>
          <p className="text-sm font-semibold text-slate-600">Preenchida automaticamente quando candidatos forem aprovados em vagas.</p>
        </div>
        {companyJobs.length === 0 ? (
          <EmptyState title="Nenhuma vaga para escalar" text="Publique uma vaga e aprove candidatos para montar a escala automática." />
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
      </section>

      {creating && (
        <Modal title="Criar escala" onClose={() => setCreating(false)}>
          <ScheduleForm onSubmit={handleCreate} />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar escala" onClose={() => setEditing(null)}>
          <ScheduleForm schedule={editing} onSubmit={handleEdit} />
        </Modal>
      )}
    </div>
  );
}

function ManualScheduleCard({
  schedule,
  onEdit,
  onDelete
}: {
  schedule: CompanySchedule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="card grid gap-3 p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className={getManualStatusClass(schedule.status)}>{schedule.status}</span>
            <span className="badge">{schedule.function}</span>
            <span className="badge">{schedule.quantity} vaga{schedule.quantity === 1 ? "" : "s"}</span>
          </div>
          <h3 className="font-black text-navy-950">{schedule.title}</h3>
          <p className="text-sm font-semibold text-slate-600">
            {formatDate(schedule.date)} - {schedule.startsAt} às {schedule.endsAt} - {schedule.neighborhood}
          </p>
          <p className="mt-1 text-sm text-slate-600">{schedule.location}</p>
          {schedule.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{schedule.notes}</p>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[260px]">
          <button type="button" onClick={onEdit} className="primary"><Edit3 size={17} /> Editar</button>
          <button type="button" onClick={onDelete} className="danger"><Trash2 size={17} /> Excluir</button>
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 p-3">
        <span className="text-xs font-black uppercase text-slate-500">Equipe prevista</span>
        {schedule.workerNames.length === 0 ? (
          <p className="mt-1 text-sm font-semibold text-slate-500">Nenhum nome adicionado ainda.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {schedule.workerNames.map((name) => <span key={name} className="badge bg-white">{name}</span>)}
          </div>
        )}
      </div>
    </article>
  );
}

function ScheduleForm({
  schedule,
  onSubmit
}: {
  schedule?: CompanySchedule;
  onSubmit: (input: CompanyScheduleInput) => void;
}) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid max-h-[72vh] gap-3 overflow-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const title = String(form.get("title") || "").trim();
        const quantity = Number(form.get("quantity") || 0);
        const date = String(form.get("date") || "").trim();
        const startsAt = String(form.get("startsAt") || "").trim();
        const endsAt = String(form.get("endsAt") || "").trim();
        const location = String(form.get("location") || "").trim();
        const notes = String(form.get("notes") || "").trim();
        const workerNames = String(form.get("workerNames") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        const missing = [
          !title && "nome da escala",
          quantity <= 0 && "quantidade",
          !date && "data",
          !startsAt && "início",
          !endsAt && "fim",
          !location && "local"
        ].filter(Boolean);
        if (missing.length > 0) {
          setError(`Preencha: ${missing.join(", ")}.`);
          return;
        }

        setError("");
        onSubmit({
          title,
          function: form.get("function") as JobFunction,
          quantity,
          date,
          startsAt,
          endsAt,
          neighborhood: form.get("neighborhood") as Neighborhood,
          location,
          notes,
          workerNames,
          status: form.get("status") as CompanyScheduleStatus
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Nome da escala<input name="title" className="input" required defaultValue={schedule?.title} placeholder="Escala réveillon salão" /></label>
        <label className="label">Status<select name="status" className="input" required defaultValue={schedule?.status ?? "Planejada"}>{scheduleStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Função<select name="function" className="input" required defaultValue={schedule?.function}>{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" className="input" required defaultValue={schedule?.quantity ?? 1} /></label>
        <label className="label">Data<input name="date" type="date" className="input" required defaultValue={schedule?.date} /></label>
        <label className="label">Bairro<select name="neighborhood" className="input" required defaultValue={schedule?.neighborhood ?? "Centro"}>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Início<input name="startsAt" type="time" className="input" required defaultValue={schedule?.startsAt} /></label>
        <label className="label">Fim<input name="endsAt" type="time" className="input" required defaultValue={schedule?.endsAt} /></label>
      </div>
      <label className="label">Local<input name="location" className="input" required defaultValue={schedule?.location} placeholder="Salão principal, bar externo, cozinha..." /></label>
      <label className="label">Equipe prevista<input name="workerNames" className="input" defaultValue={schedule?.workerNames.join(", ")} placeholder="Maria, João, Carlos" /></label>
      <label className="label">Observações<textarea name="notes" className="input min-h-24 py-3" defaultValue={schedule?.notes} placeholder="Chegada 30 minutos antes, uniforme preto, briefing com gerente." /></label>
      <button type="submit" className="primary"><Save size={17} /> Salvar escala</button>
    </form>
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

function matchesManualScheduleFilter(schedule: CompanySchedule, filter: ScheduleFilter, selectedDate: string, today: string) {
  if (selectedDate && schedule.date !== selectedDate) return false;
  if (filter === "Hoje") return schedule.date === today;
  if (filter === "Futuras") return schedule.date >= today && schedule.status !== "Concluída" && schedule.status !== "Cancelada";
  if (filter === "Concluídas") return schedule.status === "Concluída";
  return true;
}

function matchesJobScheduleFilter(job: Job, filter: ScheduleFilter, selectedDate: string, today: string) {
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

function getManualStatusClass(status: CompanyScheduleStatus) {
  if (status === "Cancelada") return "badge bg-red-50 text-alert";
  if (status === "Concluída") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Confirmada") return "badge bg-aqua-100 text-aqua-700";
  return "badge";
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
