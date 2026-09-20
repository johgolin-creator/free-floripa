import type { Application, CompanySchedule, Job, WorkerProfile } from "./types";

/** Como o status da candidatura vira "resposta" na Escala:
 *  - confirmado: Aprovada / Trabalho concluído
 *  - recusou: Convite recusado / Cancelada
 *  - aguardando: Convidada (convite enviado, ainda sem resposta)
 *  - faltou: Falta registrada
 *  - candidato: Enviada / Em análise (aguarda decisão da empresa, não do profissional)
 *  Recusada (a empresa recusou o candidato) não entra. */
export type Bucket = "confirmado" | "recusou" | "aguardando" | "faltou" | "candidato";

export function getBucket(status: Application["status"]): Bucket | null {
  if (status === "Aprovada" || status === "Trabalho concluído") return "confirmado";
  if (status === "Convite recusado" || status === "Cancelada") return "recusou";
  if (status === "Convidada") return "aguardando";
  if (status === "Falta registrada") return "faltou";
  if (status === "Enviada" || status === "Em análise") return "candidato";
  return null;
}

export interface Person {
  application: Application;
  worker: WorkerProfile | undefined;
  bucket: Bucket;
}

export interface FunctionSummary {
  function: string;
  slots: number;
  confirmed: number;
}

export interface JobEvent {
  key: string;
  date: string;
  name: string;
  startsAt: string;
  endsAt: string;
  jobs: Job[];
  slots: number;
  people: Person[];
  confirmed: number;
  completed: number;
  pending: number;
  declined: number;
  absent: number;
  candidates: number;
  concluded: boolean;
  functions: FunctionSummary[];
}

export type CalendarState = "completo" | "vagas" | "concluido";

export interface CalendarItem {
  key: string;
  kind: "job" | "manual";
  date: string;
  title: string;
  startsAt: string;
  endsAt: string;
  place: string;
  filled: number;
  slots: number;
  state: CalendarState;
  /** Vagas por função (cartão do evento: "Garçom 4"). */
  functions: Array<{ function: string; slots: number }>;
  searchText: string;
  jobEvent?: JobEvent;
  schedule?: CompanySchedule;
}

/** Vagas criadas pela aba Eventos têm o título "Evento: função" e agrupam por
 *  evento; as demais ficam agrupadas pelo próprio título. */
export function getEventName(job: Job): string {
  if (job.description.includes("Equipe criada pela aba Eventos")) {
    const separatorIndex = job.title.indexOf(":");
    if (separatorIndex > 0) return job.title.slice(0, separatorIndex).trim();
  }
  return job.title;
}

export function buildJobEvents(jobs: Job[], applications: Application[], workers: WorkerProfile[]): JobEvent[] {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const applicationsByJob = new Map<string, Application[]>();
  for (const application of applications) {
    const list = applicationsByJob.get(application.jobId);
    if (list) list.push(application);
    else applicationsByJob.set(application.jobId, [application]);
  }

  const events = new Map<string, JobEvent>();
  for (const job of jobs) {
    const name = getEventName(job);
    const key = `${job.date}|${name}`;
    const event =
      events.get(key) ??
      ({
        key,
        date: job.date,
        name,
        startsAt: job.startsAt,
        endsAt: job.endsAt,
        jobs: [],
        slots: 0,
        people: [],
        confirmed: 0,
        completed: 0,
        pending: 0,
        declined: 0,
        absent: 0,
        candidates: 0,
        concluded: true,
        functions: []
      } satisfies JobEvent);

    event.jobs.push(job);
    event.slots += job.quantity;
    if (job.startsAt < event.startsAt) event.startsAt = job.startsAt;
    if (job.endsAt > event.endsAt) event.endsAt = job.endsAt;
    if (job.status !== "Concluída") event.concluded = false;

    let confirmedForJob = 0;
    for (const application of applicationsByJob.get(job.id) ?? []) {
      const bucket = getBucket(application.status);
      if (!bucket) continue;
      event.people.push({ application, worker: workerById.get(application.workerId), bucket });
      if (bucket === "confirmado") {
        event.confirmed += 1;
        confirmedForJob += 1;
        if (application.status === "Trabalho concluído") event.completed += 1;
      } else if (bucket === "aguardando") event.pending += 1;
      else if (bucket === "recusou") event.declined += 1;
      else if (bucket === "faltou") event.absent += 1;
      else event.candidates += 1;
    }

    const existing = event.functions.find((item) => item.function === job.function);
    if (existing) {
      existing.slots += job.quantity;
      existing.confirmed += confirmedForJob;
    } else {
      event.functions.push({ function: job.function, slots: job.quantity, confirmed: confirmedForJob });
    }

    events.set(key, event);
  }

  return [...events.values()].sort((a, b) => `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`));
}

function stateFor(filled: number, slots: number, concluded: boolean): CalendarState {
  if (concluded) return "concluido";
  return filled >= slots ? "completo" : "vagas";
}

export function buildCalendarItems(events: JobEvent[], schedules: CompanySchedule[]): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const event of events) {
    const names = event.people.map((person) => person.worker?.name ?? "").join(" ");
    const places = event.jobs.map((job) => `${job.neighborhood} ${job.approximateAddress}`).join(" ");
    items.push({
      key: `job:${event.key}`,
      kind: "job",
      date: event.date,
      title: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      place: event.jobs[0]?.neighborhood ?? "",
      filled: event.confirmed,
      slots: event.slots,
      state: stateFor(event.confirmed, event.slots, event.concluded),
      functions: event.functions.map((item) => ({ function: item.function, slots: item.slots })),
      searchText: `${event.name} ${places} ${names}`.toLowerCase(),
      jobEvent: event
    });
  }

  for (const schedule of schedules) {
    if (schedule.status === "Cancelada") continue;
    items.push({
      key: `manual:${schedule.id}`,
      kind: "manual",
      date: schedule.date,
      title: schedule.title,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      place: schedule.neighborhood,
      filled: schedule.workerNames.length,
      slots: schedule.quantity,
      state: stateFor(schedule.workerNames.length, schedule.quantity, schedule.status === "Concluída"),
      functions: [{ function: schedule.function, slots: schedule.quantity }],
      searchText: `${schedule.title} ${schedule.location} ${schedule.neighborhood} ${schedule.workerNames.join(" ")}`.toLowerCase(),
      schedule
    });
  }

  return items.sort((a, b) => `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`));
}

// --- Datas (sempre no calendário local, como strings AAAA-MM-DD) ---------

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Segunda-feira da semana da data (a imagem de referência começa na segunda). */
export function startOfWeek(value: string): string {
  const date = parseISODate(value);
  const offset = (date.getDay() + 6) % 7;
  return addDays(value, -offset);
}

export function weekDates(anchor: string): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** 6 semanas (42 dias) cobrindo o mês da data, começando na segunda. */
export function monthGrid(anchor: string): string[] {
  const first = parseISODate(anchor);
  first.setDate(1);
  const start = startOfWeek(toISODate(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function addMonths(value: string, months: number): string {
  const date = parseISODate(value);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}
