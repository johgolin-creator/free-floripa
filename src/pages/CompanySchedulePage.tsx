import { useEffect, useMemo, useRef, useState } from "react";
import { Edit3, Plus, Printer, Receipt, Save, Trash2 } from "lucide-react";
import { Modal } from "../components/Modal";
import { PrintPortal } from "../components/PrintPortal";
import { ReceiptsModal } from "../components/schedule/ReceiptsModal";
import { ReceiptPages } from "../components/schedule/ReceiptSheets";
import { JobSchedulePrintSheet, SchedulePrintSheet } from "../components/schedule/PrintSheets";
import { ScheduleCalendar, matchesStatusFilter, type CalendarView, type StatusFilter } from "../components/schedule/ScheduleCalendar";
import { ScheduleEventDetail } from "../components/schedule/ScheduleEventDetail";
import { MonthDatePicker } from "../components/schedule/MonthDatePicker";
import { ScheduleInvitePanel } from "../components/schedule/ScheduleInvitePanel";
import { ScheduleManualPanel } from "../components/schedule/ScheduleManualPanel";
import type { MenuAction } from "../components/schedule/KebabMenu";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore, type CompanyScheduleInput } from "../lib/store";
import { todayLocalISODate } from "../lib/format";
import { functionLabel } from "../lib/functionInfo";
import { getJobStatus } from "../lib/rules";
import { buildCalendarItems, buildJobEvents, type CalendarItem } from "../lib/scheduleEvents";
import { deactivateScheduleInvite, syncScheduleInvite } from "../lib/scheduleInvites";
import type { ReceiptCompany, ReceiptCustomText, ReceiptDoc, ReceiptPerson } from "../lib/receipts";
import { formatCNPJ, formatCPF } from "../lib/validation";
import type { JobEvent } from "../lib/scheduleEvents";
import type { Application, CompanySchedule, CompanyScheduleStatus, Job, JobFunction, Neighborhood } from "../lib/types";

const scheduleStatuses: CompanyScheduleStatus[] = ["Planejada", "Confirmada", "Concluída", "Cancelada"];

export function CompanySchedulePage() {
  const {
    state,
    currentCompany,
    updateApplicationStatus,
    createCompanySchedule,
    updateCompanySchedule,
    deleteCompanySchedule
  } = useAppStore();
  const today = todayLocalISODate();
  const [view, setView] = useState<CalendarView>("Semana");
  const [anchor, setAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState<{ date?: string } | null>(null);
  const [editing, setEditing] = useState<CompanySchedule | null>(null);
  const [justCreated, setJustCreated] = useState<CompanySchedule | null>(null);
  const [printSchedule, setPrintSchedule] = useState<CompanySchedule | null>(null);
  const [printJobs, setPrintJobs] = useState<Job[]>([]);
  const [receiptsFor, setReceiptsFor] = useState<{ title: string; people: ReceiptPerson[] } | null>(null);
  const [printReceipts, setPrintReceipts] = useState<{ docs: ReceiptDoc[]; company: ReceiptCompany; custom: ReceiptCustomText } | null>(null);
  const userPicked = useRef(false);
  const autoPicked = useRef(false);

  useEffect(() => {
    if (!printSchedule && printJobs.length === 0 && !printReceipts) return;
    const timeoutId = window.setTimeout(() => window.print(), 100);
    function clear() {
      setPrintSchedule(null);
      setPrintJobs([]);
      setPrintReceipts(null);
    }
    window.addEventListener("afterprint", clear);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("afterprint", clear);
    };
  }, [printSchedule, printJobs, printReceipts]);

  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const companySchedules = useMemo(
    () => (state.companySchedules ?? []).filter((schedule) => schedule.companyId === currentCompany.id),
    [state.companySchedules, currentCompany.id]
  );
  const companyJobs = useMemo(
    () =>
      state.jobs.filter(
        (job) => job.companyId === currentCompany.id && getJobStatus(job) !== "Cancelada" && getJobStatus(job) !== "Rascunho"
      ),
    [state.jobs, currentCompany.id]
  );
  const items = useMemo(
    () => buildCalendarItems(buildJobEvents(companyJobs, state.applications, state.workers), companySchedules),
    [companyJobs, state.applications, state.workers, companySchedules]
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => matchesStatusFilter(item, statusFilter))
        .filter((item) => !normalizedSearch || item.searchText.includes(normalizedSearch)),
    [items, statusFilter, normalizedSearch]
  );

  // Ao abrir, vai para hoje; se hoje não tem nada, para o próximo evento.
  useEffect(() => {
    if (userPicked.current || autoPicked.current || items.length === 0) return;
    autoPicked.current = true;
    if (items.some((item) => item.date === today)) return;
    const next = items.find((item) => item.date >= today);
    if (next) {
      setSelectedDate(next.date);
      setAnchor(next.date);
    }
  }, [items, today]);

  const markedDates = useMemo(() => new Set(items.map((item) => item.date)), [items]);
  const dayItems = filteredItems.filter((item) => item.date === selectedDate);
  const selectedItem = dayItems.find((item) => item.key === selectedItemKey) ?? dayItems[0];

  /** Menu de "três pontinhos" de cada cartão de evento. */
  function getCardActions(item: CalendarItem): MenuAction[] {
    const open: MenuAction = { label: "Abrir detalhes", onClick: () => { pickDate(item.date); pickItem(item.key); } };
    if (item.kind === "job" && item.jobEvent) {
      const event = item.jobEvent;
      return [
        open,
        { label: "Ver escala (imprimir)", icon: <Printer size={15} />, onClick: () => setPrintJobs(event.jobs) },
        { label: "Recibos", icon: <Receipt size={15} />, onClick: () => openJobReceipts(event) },
        { label: "Gerenciar equipe", to: `/app/candidatos?vaga=${event.jobs[0].id}` }
      ];
    }
    const schedule = item.schedule;
    if (!schedule) return [open];
    return [
      open,
      { label: "Imprimir", icon: <Printer size={15} />, onClick: () => setPrintSchedule(schedule) },
      { label: "Recibos", icon: <Receipt size={15} />, onClick: () => openManualReceipts(schedule) },
      { label: "Editar escala", icon: <Edit3 size={15} />, disabled: companyBlocked, onClick: () => setEditing(schedule) },
      { label: "Excluir", icon: <Trash2 size={15} />, danger: true, disabled: companyBlocked, onClick: () => handleDelete(schedule.id) }
    ];
  }

  function pickDate(date: string) {
    userPicked.current = true;
    setSelectedDate(date);
    setSelectedItemKey("");
  }

  function pickItem(key: string) {
    userPicked.current = true;
    setSelectedItemKey(key);
  }

  function runStatus(applicationId: string, status: Application["status"]) {
    if (companyBlocked) {
      setMessage("Sua empresa está em revisão pela administração e não pode alterar a escala no momento.");
      return false;
    }
    const result = updateApplicationStatus(applicationId, status);
    setMessage(result.message);
    return result.ok;
  }

  const receiptCompany: ReceiptCompany = {
    name: currentCompany.establishmentName,
    documentLabel: currentCompany.cnpj ? "CNPJ" : currentCompany.cpf ? "CPF" : "",
    document: currentCompany.cnpj ? formatCNPJ(currentCompany.cnpj) : currentCompany.cpf ? formatCPF(currentCompany.cpf) : "",
    responsible: currentCompany.responsibleName
  };

  /** Vaga/evento publicado: um recibo por profissional confirmado, com os dados da própria vaga. */
  function openJobReceipts(event: JobEvent) {
    const jobById = new Map(event.jobs.map((job) => [job.id, job]));
    const people: ReceiptPerson[] = [];
    for (const person of event.people) {
      if (person.bucket !== "confirmado") continue;
      const job = jobById.get(person.application.jobId);
      if (!job) continue;
      people.push({
        key: person.application.id,
        name: person.worker?.name ?? "Profissional",
        functionName: functionLabel(job.function),
        eventTitle: event.name,
        date: job.date,
        startsAt: job.startsAt,
        endsAt: job.endsAt,
        place: [job.fullAddress || job.approximateAddress, job.neighborhood].filter(Boolean).join(", "),
        value: job.dailyValue,
        method: job.paymentMethod,
        cpf: person.worker?.cpf ?? ""
      });
    }
    people.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    setReceiptsFor({ title: event.name, people });
  }

  /** Escala criada à mão: um recibo por nome da equipe prevista (valor a preencher). */
  function openManualReceipts(schedule: CompanySchedule) {
    const people: ReceiptPerson[] = schedule.workerNames.map((name, index) => ({
      key: `manual:${schedule.id}:${index}:${name}`,
      name,
      functionName: functionLabel(schedule.function),
      eventTitle: schedule.title,
      date: schedule.date,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      place: [schedule.location, schedule.neighborhood].filter(Boolean).join(" - "),
      value: 0,
      method: "Pix",
      cpf: ""
    }));
    setReceiptsFor({ title: schedule.title, people });
  }

  function handleCreate(input: CompanyScheduleInput) {
    if (companyBlocked) {
      setMessage("Sua empresa está em revisão pela administração e não pode criar escalas no momento.");
      return;
    }
    const id = createCompanySchedule(input);
    setCreating(null);
    if (!id) return;
    userPicked.current = true;
    setSelectedDate(input.date);
    setAnchor(input.date);
    setMessage("Escala criada. Ela já aparece no calendário e pode ser editada a qualquer momento.");
    // O link de convite é gerado logo em seguida, no painel que abre com a escala nova.
    const now = new Date().toISOString();
    setJustCreated({ id, companyId: currentCompany.id, ...input, createdAt: now, updatedAt: now });
  }

  function handleEdit(input: CompanyScheduleInput) {
    if (!editing) return;
    const result = updateCompanySchedule(editing.id, input);
    if (result.ok) {
      // Mantém o convite igual à escala (título, data, vagas...). Melhor esforço.
      void syncScheduleInvite({ ...editing, ...input }, currentCompany.establishmentName);
      setEditing(null);
    }
    setMessage(result.message);
  }

  function handleDelete(scheduleId: string) {
    const result = deleteCompanySchedule(scheduleId);
    if (result.ok) void deactivateScheduleInvite(scheduleId);
    setMessage(result.message);
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Escala"
        title="Escala"
        description="Visualize, gerencie e acompanhe sua equipe em um só lugar."
        action={
          <button type="button" onClick={() => setCreating({})} disabled={companyBlocked} className="primary">
            <Plus size={17} /> Nova escala
          </button>
        }
      />
      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyBlocked && (
        <SafetyNotice title="Escala em revisão" tone="warning">
          Sua empresa está em revisão pela administração. Criar, editar, excluir e concluir escalas fica pausado até a liberação.
        </SafetyNotice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem] xl:items-start">
        <ScheduleCalendar
          items={filteredItems}
          view={view}
          onViewChange={setView}
          anchor={anchor}
          onAnchorChange={setAnchor}
          today={today}
          selectedDate={selectedDate}
          onSelectDate={pickDate}
          selectedItemKey={selectedItem?.key ?? ""}
          onSelectItem={pickItem}
          onAddOnDate={(date) => setCreating({ date })}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          getCardActions={getCardActions}
          disabled={companyBlocked}
        />

        {!selectedItem ? (
          <aside className="grid content-start justify-items-start gap-3 rounded-2xl border border-dashed border-white/15 p-6">
            <strong className="text-base text-white">Nenhum evento selecionado</strong>
            <p className="text-sm font-semibold text-slate-400">
              Escolha um evento na lista para ver a equipe, os detalhes e as ações, ou crie uma escala para este dia.
            </p>
            <button type="button" className="primary" disabled={companyBlocked} onClick={() => setCreating({ date: selectedDate })}>
              <Plus size={17} /> Criar escala neste dia
            </button>
          </aside>
        ) : selectedItem.kind === "job" && selectedItem.jobEvent ? (
          <ScheduleEventDetail
            key={selectedItem.key}
            event={selectedItem.jobEvent}
            today={today}
            companyName={currentCompany.establishmentName}
            disabled={companyBlocked}
            onComplete={(applicationId) => runStatus(applicationId, "Trabalho concluído")}
            onAbsence={(applicationId) => runStatus(applicationId, "Falta registrada")}
            onPrint={setPrintJobs}
            onReceipts={openJobReceipts}
          />
        ) : selectedItem.schedule ? (
          <ScheduleManualPanel
            key={selectedItem.key}
            schedule={selectedItem.schedule}
            companyName={currentCompany.establishmentName}
            disabled={companyBlocked}
            onEdit={() => setEditing(selectedItem.schedule!)}
            onDelete={() => handleDelete(selectedItem.schedule!.id)}
            onPrint={() => setPrintSchedule(selectedItem.schedule!)}
            onReceipts={() => openManualReceipts(selectedItem.schedule!)}
          />
        ) : null}
      </div>

      {creating && (
        <Modal title="Nova escala" onClose={() => setCreating(null)}>
          <ScheduleForm defaultDate={creating.date} markedDates={markedDates} onSubmit={handleCreate} />
        </Modal>
      )}

      {receiptsFor && (
        <ReceiptsModal
          title={receiptsFor.title}
          people={receiptsFor.people}
          company={receiptCompany}
          onClose={() => setReceiptsFor(null)}
          onPrint={(docs, company, custom) => {
            setReceiptsFor(null);
            setPrintReceipts({ docs, company, custom });
          }}
        />
      )}

      {justCreated && (
        <Modal title="Escala criada" onClose={() => setJustCreated(null)}>
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-slate-300">
              {justCreated.title} já está no calendário. Envie o link abaixo na lista de transmissão ou no grupo para a equipe confirmar.
            </p>
            <ScheduleInvitePanel schedule={justCreated} companyName={currentCompany.establishmentName} disabled={companyBlocked} autoCreate />
            <button type="button" className="secondary" onClick={() => setJustCreated(null)}>
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar escala" onClose={() => setEditing(null)}>
          <ScheduleForm schedule={editing} markedDates={markedDates} onSubmit={handleEdit} />
        </Modal>
      )}

      {printSchedule && (
        <PrintPortal>
          <SchedulePrintSheet companyName={currentCompany.establishmentName} schedule={printSchedule} />
        </PrintPortal>
      )}
      {printReceipts && (
        <PrintPortal>
          <ReceiptPages docs={printReceipts.docs} company={printReceipts.company} custom={printReceipts.custom} />
        </PrintPortal>
      )}
      {printJobs.length > 0 && (
        <PrintPortal>
          {printJobs.map((job, index) => (
            <div key={job.id} style={index < printJobs.length - 1 ? { pageBreakAfter: "always" } : undefined}>
              <JobSchedulePrintSheet
                companyName={currentCompany.establishmentName}
                job={job}
                applications={state.applications.filter(
                  (application) => application.jobId === job.id && isRelevantToSchedule(application)
                )}
                workers={state.workers}
              />
            </div>
          ))}
        </PrintPortal>
      )}
    </div>
  );
}

function isRelevantToSchedule(application: Application) {
  return application.status === "Aprovada" || application.status === "Trabalho concluído" || application.status === "Falta registrada";
}

function ScheduleForm({
  schedule,
  defaultDate,
  markedDates,
  onSubmit
}: {
  schedule?: CompanySchedule;
  defaultDate?: string;
  markedDates?: ReadonlySet<string>;
  onSubmit: (input: CompanyScheduleInput) => void;
}) {
  const [error, setError] = useState("");
  const [date, setDate] = useState(schedule?.date ?? defaultDate ?? "");

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
        <label className="label">Função<select name="function" className="input" required defaultValue={schedule?.function}>{functions.map((item) => <option key={item} value={item}>{functionLabel(item)}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" className="input" required defaultValue={schedule?.quantity ?? 1} /></label>
        <label className="label">
          Bairro
          <input
            name="neighborhood"
            list="neighborhoods-schedule"
            className="input"
            required
            defaultValue={schedule?.neighborhood ?? "Centro"}
            placeholder="Digite o bairro"
            autoComplete="off"
          />
          <datalist id="neighborhoods-schedule">
            {neighborhoods.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
        <label className="label">Início<input name="startsAt" type="time" className="input" required defaultValue={schedule?.startsAt} /></label>
        <label className="label">Fim<input name="endsAt" type="time" className="input" required defaultValue={schedule?.endsAt} /></label>
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-bold text-slate-600">Data</span>
        <MonthDatePicker name="date" value={date} onChange={setDate} markedDates={markedDates} today={todayLocalISODate()} />
      </div>
      <label className="label">Local<input name="location" className="input" required defaultValue={schedule?.location} placeholder="Salão principal, bar externo, cozinha..." /></label>
      <label className="label">Equipe prevista<input name="workerNames" className="input" defaultValue={schedule?.workerNames.join(", ")} placeholder="Maria, João, Carlos" /></label>
      <label className="label">Observações<textarea name="notes" className="input min-h-24 py-3" defaultValue={schedule?.notes} placeholder="Chegada 30 minutos antes, uniforme preto, briefing com gerente." /></label>
      <button type="submit" className="primary"><Save size={17} /> Salvar escala</button>
    </form>
  );
}
