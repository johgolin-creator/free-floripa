import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Trash2,
  UserCheck,
  UserX
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { StatusBadge, StatusLegend } from "../components/StatusBadge";
import { TermHint } from "../components/TermHint";
import { UrgentBadge } from "../components/UrgentBadge";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore, type CompanyScheduleInput } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import { getShiftVerificationCode } from "../lib/shiftVerification";
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
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
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
  const manualTotal = companySchedules.filter((schedule) => schedule.companyId === currentCompany.id).length;
  const todayTotal =
    companySchedules.filter((schedule) => schedule.companyId === currentCompany.id && schedule.date === today).length +
    companyJobs.filter((job) => job.date === today).length;
  const openDemand =
    companySchedules
      .filter((schedule) => schedule.companyId === currentCompany.id && schedule.status !== "Concluída" && schedule.status !== "Cancelada")
      .reduce((total, schedule) => total + schedule.quantity, 0) +
    companyJobs.reduce((total, job) => total + getOpenSlots(job), 0);

  function runStatus(applicationId: string, status: Application["status"]) {
    if (companyBlocked) {
      setMessage("Sua empresa está em revisão pela administração e não pode alterar a escala no momento.");
      return false;
    }
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  function handleCreate(input: CompanyScheduleInput) {
    if (companyBlocked) {
      setMessage("Sua empresa está em revisão pela administração e não pode criar escalas no momento.");
      return;
    }
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
        action={<button type="button" onClick={() => setCreating(true)} disabled={companyBlocked} className="primary"><Plus size={17} /> Criar escala</button>}
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyBlocked && (
        <div className="mb-4">
          <SafetyNotice title="Escala em revisão" tone="warning">
            Sua empresa está em revisão pela administração. Criar, editar, excluir e concluir escalas fica pausado até a liberação.
          </SafetyNotice>
        </div>
      )}

      <section className="schedule-hero">
        <div>
          <span className="section-eyebrow">Planejamento da operação</span>
          <h2>Monte a equipe antes, acompanhe durante e feche depois</h2>
          <p>
            Separe escalas planejadas pela empresa das escalas automáticas das vagas, com check-in, conclusão e faltas no mesmo lugar.
          </p>
        </div>
        <div className="schedule-hero-metrics">
          <StatTile variant="primary" icon={<CalendarDays size={19} />} label="hoje" value={todayTotal} />
          <StatTile icon={<ClipboardList size={19} />} label="manuais" value={manualTotal} />
          <StatTile icon={<Clock3 size={19} />} label="em turno" value={checkedInCount} />
          <StatTile tone={openDemand > 0 ? "alert" : "normal"} icon={<AlertTriangle size={19} />} label="a preencher" value={openDemand} />
        </div>
      </section>

      <section className="schedule-filter-panel">
        <div className="schedule-stat-grid">
          <Stat label="escalas criadas" value={String(manualTotal)} />
          <Stat label="confirmados" value={String(confirmedCount)} />
          <Stat label="em turno" value={String(checkedInCount)} />
          <Stat label="concluídos" value={String(completedCount)} />
        </div>
        <div className="schedule-filter-controls">
          <label className="label">
            Data
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="schedule-filter-buttons">
            {filters.map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={`schedule-filter-button ${filter === item ? "is-active" : ""}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="schedule-section">
        <div className="schedule-section-heading">
          <div>
            <h3 className="text-lg font-black text-white">Escalas criadas pelo contratante</h3>
            <p className="text-sm font-semibold text-slate-600">Use para planejar equipe antes de publicar vaga ou antes de alguém se candidatar.</p>
            <StatusLegend type="schedule" />
          </div>
          <button type="button" onClick={() => setCreating(true)} disabled={companyBlocked} className="company-action"><Plus size={17} /> Nova escala</button>
        </div>
        {manualSchedules.length === 0 ? (
          <EmptyState title="Nenhuma escala criada" text="Clique em Criar escala para montar uma escala manual da empresa." />
        ) : (
          <div className="grid gap-3">
            {manualSchedules.map((schedule) => (
              <ManualScheduleCard
                key={schedule.id}
                schedule={schedule}
                disabled={companyBlocked}
                onEdit={() => setEditing(schedule)}
                onDelete={() => handleDelete(schedule.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="schedule-section">
        <div>
          <h3 className="text-lg font-black text-white">Escala das vagas aprovadas</h3>
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
                <section key={job.id} className="schedule-job-card">
                  <div className="schedule-job-head">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {job.urgent && <UrgentBadge />}
                        <StatusBadge type="job" status={getJobStatus(job)} />
                        <span className="badge">{job.function}</span>
                        <span className="badge">{formatCurrency(job.dailyValue)}</span>
                      </div>
                      <h3>{job.title}</h3>
                      <p className="text-sm font-semibold text-slate-600">
                        {formatDate(job.date)} - {job.startsAt} às {job.endsAt} - {job.neighborhood}
                      </p>
                    </div>
                    <div className="schedule-mini-grid">
                      <Mini label="confirmados" value={`${confirmed}/${job.quantity}`} />
                      <Mini label="em aberto" value={String(getOpenSlots(job))} />
                      <Mini label="check-in" value={String(shifts.filter((shift) => shift.status === "Fez check-in").length)} />
                      <Mini label="finalizados" value={String(shifts.filter((shift) => shift.status === "Finalizou o turno").length)} />
                    </div>
                  </div>

                  {getOpenSlots(job) > 0 && (
                    <div className="schedule-alert">
                      {getOpenSlots(job) === 1 ? "Falta" : "Faltam"} {getOpenSlots(job)} profissional{getOpenSlots(job) === 1 ? "" : "is"} para completar esta escala.
                      <Link to={`/app/candidatos?vaga=${job.id}`} className="ml-2 font-black text-aqua-700">Ver candidatos</Link>
                    </div>
                  )}

                  {applications.length === 0 ? (
                    <EmptyState title="Nenhum profissional confirmado" text="Aprove candidatos na vaga para preencher esta escala." />
                  ) : (
                    <div className="grid gap-3">
                      {applications.map((application) => (
                        <ScheduleWorker
                          key={application.id}
                          application={application}
                          job={job}
                          shift={state.shifts.find((item) => item.jobId === job.id && item.workerId === application.workerId)}
                          disabled={companyBlocked}
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
  disabled,
  onEdit,
  onDelete
}: {
  schedule: CompanySchedule;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="schedule-manual-card">
      <div className="schedule-job-head">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusBadge type="schedule" status={schedule.status} />
            <span className="badge">{schedule.function}</span>
            <span className="badge">{schedule.quantity} vaga{schedule.quantity === 1 ? "" : "s"}</span>
          </div>
          <h3 className="font-black text-white">{schedule.title}</h3>
          <p className="text-sm font-semibold text-slate-600">
            {formatDate(schedule.date)} - {schedule.startsAt} às {schedule.endsAt} - {schedule.neighborhood}
          </p>
          <p className="mt-1 text-sm text-slate-600">{schedule.location}</p>
          {schedule.notes && <p className="mt-2 text-sm leading-6 text-slate-600">{schedule.notes}</p>}
        </div>
        <div className="schedule-card-actions">
          <button type="button" onClick={onEdit} disabled={disabled} className="company-action company-action-primary"><Edit3 size={17} /> Editar</button>
          <button type="button" onClick={onDelete} disabled={disabled} className="company-action company-action-danger"><Trash2 size={17} /> Excluir</button>
        </div>
      </div>
      <div className="schedule-team-box">
        <span className="text-xs font-black uppercase text-slate-500">Equipe prevista</span>
        {schedule.workerNames.length === 0 ? (
          <p className="mt-1 text-sm font-semibold text-slate-500">Nenhum nome adicionado ainda.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {schedule.workerNames.map((name) => <span key={name} className="badge">{name}</span>)}
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
  disabled,
  onCheckIn,
  onCheckOut,
  onAbsence
}: {
  application: Application;
  job: Job;
  shift?: WorkShift;
  disabled?: boolean;
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
  const verificationCode = getShiftVerificationCode(job.id, worker.id);

  return (
    <article className="schedule-worker-card">
      <div className="flex min-w-0 gap-3">
        <img src={worker.avatarUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm text-white">{worker.name}</strong>
            <StatusBadge type="application" status={application.status} />
            {shift ? <StatusBadge type="shift" status={shift.status} /> : <span className="badge">Aguardando presença</span>}
            <span className="badge bg-aqua-50 text-aqua-700"><TermHint term="codigoVerificacao">Código {verificationCode}</TermHint></span>
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
      <div className="schedule-worker-actions">
        <button
          type="button"
          onClick={onCheckIn}
          disabled={disabled || !active || shift?.status !== "Ainda não chegou"}
          className="secondary"
        >
          <UserCheck size={17} /> Check-in
        </button>
        <button
          type="button"
          onClick={onCheckOut}
          disabled={disabled || !active || shift?.status !== "Fez check-in"}
          className="primary"
        >
          <CheckCircle2 size={17} /> Concluir
        </button>
        <button
          type="button"
          onClick={onAbsence}
          disabled={disabled || !active || completed || absence || shift?.status !== "Ainda não chegou"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="schedule-stat-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <span className="schedule-mini-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}
