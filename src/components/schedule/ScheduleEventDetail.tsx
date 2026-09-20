import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Printer,
  Receipt,
  Star,
  UserX,
  Users
} from "lucide-react";
import { AvatarButton } from "../AvatarButton";
import { formatDate, getWhatsAppUrl } from "../../lib/format";
import { functionLabel } from "../../lib/functionInfo";
import { getJobStatus } from "../../lib/rules";
import { getShiftVerificationCode } from "../../lib/shiftVerification";
import { parseISODate, type Bucket, type JobEvent, type Person } from "../../lib/scheduleEvents";

const LIME = "#C8FF38";
const AMBER = "#F4B740";
const TRACK = "#3A3F4A";

const BUCKET_ORDER: Record<Bucket, number> = { confirmado: 0, aguardando: 1, candidato: 2, recusou: 3, faltou: 4 };
const OTHERS_PREVIEW = 6;
// Todas as colunas com largura definida: assim as linhas alinham entre si (a de ações não muda com o número de botões).
const TABLE_COLUMNS = "md:grid-cols-[2rem_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)_13.5rem]";

function durationLabel(startsAt: string, endsAt: string) {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  const total = (toMinutes(endsAt) - toMinutes(startsAt) + 24 * 60) % (24 * 60);
  if (total === 0) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

function longDate(date: string) {
  const label = parseISODate(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function eventStatus(event: JobEvent, today: string) {
  if (event.concluded) return "Concluída";
  if (event.jobs.some((job) => getJobStatus(job) === "Em andamento")) return "Em andamento";
  if (event.date === today) return "Hoje";
  return event.jobs.some((job) => getJobStatus(job) === "Urgente") ? "Urgente" : "Publicada";
}

function personStatus(person: Person): { label: string; color: string } {
  if (person.application.status === "Trabalho concluído") return { label: "Concluído", color: LIME };
  if (person.bucket === "confirmado") return { label: "Confirmado", color: LIME };
  if (person.bucket === "aguardando") return { label: "Aguardando", color: AMBER };
  if (person.bucket === "candidato") return { label: "Candidato", color: "#7D8494" };
  if (person.bucket === "faltou") return { label: "Faltou", color: "#FF5252" };
  return { label: "Recusou", color: "#FF5252" };
}

function summaryText(event: JobEvent) {
  const missing = Math.max(0, event.slots - event.confirmed);
  const tail = missing > 0 ? ` Faltam ${missing} para completar.` : " Escala completa.";
  return `Escala ${formatDate(event.date)} - ${event.name}: ${event.confirmed} confirmado(s), ${event.declined} recusaram, ${event.pending} sem resposta.${tail}`;
}

function cleanNotes(event: JobEvent) {
  const lines: string[] = [];
  for (const job of event.jobs) {
    const text = job.description.replace(/Equipe criada pela aba Eventos[^.\n]*\.?/gi, "").trim();
    if (text && !lines.includes(text)) lines.push(text);
  }
  const first = event.jobs[0];
  if (first?.uniform && first.uniform !== "A combinar") lines.push(`Uniforme: ${first.uniform}.`);
  if (first?.requiredExperience && first.requiredExperience !== "A combinar") lines.push(`Experiência: ${first.requiredExperience}.`);
  return lines;
}

export function ScheduleEventDetail({
  event,
  today,
  companyName,
  disabled,
  onComplete,
  onAbsence,
  onPrint,
  onReceipts
}: {
  event: JobEvent;
  today: string;
  companyName: string;
  disabled?: boolean;
  onComplete: (applicationId: string) => void;
  onAbsence: (applicationId: string) => void;
  onPrint: (jobs: JobEvent["jobs"]) => void;
  onReceipts: (event: JobEvent) => void;
}) {
  const [showAllOthers, setShowAllOthers] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = eventStatus(event, today);
  const duration = durationLabel(event.startsAt, event.endsAt);
  const free = Math.max(0, event.slots - event.confirmed - event.pending);
  const barTotal = Math.max(event.slots, event.confirmed + event.pending, 1);
  const pct = (value: number) => `${(value / barTotal) * 100}%`;
  const missing = Math.max(0, event.slots - event.confirmed);
  const first = event.jobs[0];
  const address = [first?.approximateAddress, first?.neighborhood].filter(Boolean).join(", ");
  const notes = cleanNotes(event);
  const jobById = new Map(event.jobs.map((job) => [job.id, job]));

  const byName = (a: Person, b: Person) => (a.worker?.name ?? "").localeCompare(b.worker?.name ?? "", "pt-BR");
  const confirmedPeople = event.people.filter((person) => person.bucket === "confirmado").sort(byName);
  const others = event.people
    .filter((person) => person.bucket !== "confirmado")
    .sort((a, b) => BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] || byName(a, b));
  const visibleOthers = showAllOthers ? others : others.slice(0, OTHERS_PREVIEW);

  function copySummary() {
    navigator.clipboard
      ?.writeText(summaryText(event))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        // Sem permissão da área de transferência: nada a fazer.
      });
  }

  const actionButton = "secondary min-h-9 px-3 text-xs";

  function renderRow(person: Person, index: number | null) {
    const { application, worker } = person;
    const job = jobById.get(application.jobId);
    const personState = personStatus(person);
    const canAct = application.status === "Aprovada";
    const waiting = person.bucket === "aguardando";
    const firstName = worker?.name.split(" ")[0] ?? "";
    const whatsappText = waiting
      ? `Olá, ${firstName}! Você consegue confirmar presença na escala de ${formatDate(event.date)} (${event.name}) no ${companyName}?`
      : `Olá, ${firstName}. Estou organizando a escala de ${formatDate(event.date)} (${event.name}) no ${companyName}.`;
    const iconButton =
      "grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10";

    return (
      <div key={application.id} className={`grid gap-1.5 border-t border-white/10 px-3 py-2 md:items-center md:gap-3 ${TABLE_COLUMNS}`}>
        <span className="hidden text-xs font-black text-slate-500 md:block">{index ?? ""}</span>
        <div className="flex min-w-0 items-center gap-2.5">
          {worker ? (
            <AvatarButton src={worker.avatarUrl} name={worker.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
          )}
          <div className="min-w-0">
            <strong className="block truncate text-sm text-white">{worker?.name ?? "Profissional"}</strong>
            {worker && (
              <span className="flex items-center gap-1 text-[0.68rem] font-semibold text-slate-400">
                <Star size={10} className="fill-current text-amber-400" /> {worker.rating.toFixed(1)} ({worker.completedJobs})
              </span>
            )}
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-600">{job ? functionLabel(job.function) : "—"}</span>
        <span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-black text-white"
            style={{ borderColor: `${personState.color}66`, background: `${personState.color}1f` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: personState.color }} /> {personState.label}
          </span>
        </span>
        <span className="text-sm font-bold text-slate-300">
          {person.bucket === "confirmado" && job && worker ? getShiftVerificationCode(job.id, worker.id) : "–"}
        </span>
        <div className="flex flex-wrap items-center gap-1 md:justify-end">
          {worker?.phone && (
            <>
              <a
                href={getWhatsAppUrl(worker.phone, whatsappText)}
                target="_blank"
                rel="noreferrer"
                className={iconButton}
                title={waiting ? "Cobrar confirmação no WhatsApp" : "Chamar no WhatsApp"}
                aria-label={waiting ? "Cobrar confirmação no WhatsApp" : "Chamar no WhatsApp"}
              >
                <MessageCircle size={15} />
              </a>
              <a href={`tel:${worker.phone}`} className={iconButton} title={worker.phone} aria-label={`Ligar para ${worker.name}`}>
                <Phone size={15} />
              </a>
            </>
          )}
          <Link to="/app/mensagens" className={iconButton} title="Mensagens" aria-label="Mensagens">
            <MessageSquareText size={15} />
          </Link>
          {canAct && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onComplete(application.id)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-aqua-300/40 bg-aqua-300/10 text-aqua-300 transition hover:bg-aqua-300/20 disabled:opacity-40"
                title="Concluir turno"
                aria-label="Concluir turno"
              >
                <CheckCircle2 size={15} />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAbsence(application.id)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-alert/40 bg-alert/10 text-alert transition hover:bg-alert/20 disabled:opacity-40"
                title="Registrar falta"
                aria-label="Registrar falta"
              >
                <UserX size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const tableHeader = (
    <div className={`hidden gap-3 bg-white/5 px-3 py-1.5 text-[0.66rem] font-black uppercase text-slate-500 md:grid ${TABLE_COLUMNS}`}>
      <span>Nº</span>
      <span>Profissional</span>
      <span>Função</span>
      <span>Status</span>
      <span>Código</span>
      <span className="text-right">Ações</span>
    </div>
  );

  return (
    <div className="grid gap-3">
      {/* Cabeçalho compacto do evento */}
      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-aqua-300 px-2 py-0.5 text-[0.68rem] font-black text-navy-950">{status}</span>
              <h3 className="text-lg font-black text-white">{event.name}</h3>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} /> {longDate(event.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 size={14} /> {event.startsAt} – {event.endsAt}
                {duration ? ` (${duration})` : ""}
              </span>
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {address}
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.functions.map((item) => (
                <span key={item.function} className="rounded-md border border-white/15 bg-black/20 px-2 py-0.5 text-[0.7rem] font-black text-white">
                  {functionLabel(item.function)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={actionButton} onClick={() => onPrint(event.jobs)}>
              <Printer size={14} /> Ver escala
            </button>
            <button type="button" className={actionButton} onClick={() => onReceipts(event)}>
              <Receipt size={14} /> Recibos
            </button>
            <button type="button" className={actionButton} onClick={copySummary}>
              <ClipboardCopy size={14} /> {copied ? "Copiado!" : "Copiar resumo"}
            </button>
            <Link to={`/app/candidatos?vaga=${event.jobs[0].id}`} className="primary min-h-9 px-3 text-xs">
              Gerenciar equipe
            </Link>
          </div>
        </div>

        <div className="grid items-center gap-x-4 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl text-white">
              {event.confirmed}/{event.slots}
            </strong>
            <span className="text-sm font-semibold text-slate-300">profissionais</span>
          </div>
          <div className="grid gap-1.5">
            <div className="flex h-2 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
              <span style={{ width: pct(event.confirmed), background: LIME }} />
              <span style={{ width: pct(event.pending), background: AMBER }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: LIME }} /> {event.confirmed} confirmados
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> {event.pending} pendentes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "#7D8494" }} /> {free} vaga{free === 1 ? "" : "s"}
              </span>
              {event.declined > 0 && <span className="text-alert">{event.declined} recusaram</span>}
              {event.absent > 0 && <span className="text-alert">{event.absent} faltaram</span>}
              {missing > 0 && <span className="text-amber-500">Faltam {missing} para completar</span>}
              {event.candidates > 0 && (
                <Link to={`/app/candidatos?vaga=${event.jobs[0].id}`} className="text-aqua-300">
                  {event.candidates} candidato{event.candidates === 1 ? "" : "s"} aguardando aprovação
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quem confirmou: logo no alto, em quadro com colunas */}
      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <h4 className="flex items-center gap-2 text-base font-black text-white">
            <Users size={16} /> Confirmados <span className="text-sm font-bold text-slate-400">({confirmedPeople.length})</span>
          </h4>
        </div>
        {confirmedPeople.length === 0 ? (
          <p className="border-t border-white/10 px-3 py-4 text-sm font-semibold text-slate-400">
            Ninguém confirmou ainda. Convide profissionais, aprove candidatos ou envie o link de convite.
          </p>
        ) : (
          <div>
            {tableHeader}
            {confirmedPeople.map((person, index) => renderRow(person, index + 1))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <h4 className="text-sm font-black text-white">
              Aguardando resposta, candidatos, recusas e faltas <span className="font-bold text-slate-400">({others.length})</span>
            </h4>
            {others.length > OTHERS_PREVIEW && (
              <button type="button" className="text-xs font-black text-aqua-300" onClick={() => setShowAllOthers((current) => !current)}>
                {showAllOthers ? "Mostrar menos" : `Ver todos (${others.length})`}
              </button>
            )}
          </div>
          {tableHeader}
          {visibleOthers.map((person) => renderRow(person, null))}
        </section>
      )}

      {/* Informações do evento em quadros pequenos */}
      <div className="grid gap-3 md:grid-cols-3">
        <section className="rounded-lg border border-white/10 bg-white/5 p-3">
          <h4 className="mb-2 text-sm font-black text-white">Resumo das funções</h4>
          <div className="grid gap-2">
            {event.functions.map((item) => {
              const complete = item.slots > 0 && item.confirmed >= item.slots;
              const color = complete ? LIME : item.confirmed > 0 ? AMBER : TRACK;
              const width = item.slots > 0 ? Math.min(100, (item.confirmed / item.slots) * 100) : 0;
              return (
                <div key={item.function} className="grid grid-cols-[minmax(0,6.5rem)_1fr_auto] items-center gap-2 text-xs">
                  <span className="font-semibold leading-tight text-slate-600">{functionLabel(item.function)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                  </span>
                  <span className="font-black text-slate-300">
                    {item.confirmed}/{item.slots}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-3">
          <h4 className="mb-2 text-sm font-black text-white">Local do evento</h4>
          <p className="flex items-start gap-2 text-xs font-semibold text-slate-600">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {address || "Local não informado."}
          </p>
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Florianópolis, SC`)}`}
              target="_blank"
              rel="noreferrer"
              className="secondary mt-2 min-h-8 px-3 text-xs"
            >
              Ver no mapa <ExternalLink size={12} />
            </a>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-3">
          <h4 className="mb-2 text-sm font-black text-white">Observações</h4>
          {notes.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">Nenhuma observação para este evento.</p>
          ) : (
            <div className="grid gap-1.5">
              {notes.map((line) => (
                <p key={line} className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
                  <FileText size={13} className="mt-0.5 shrink-0 text-slate-400" /> {line}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
