import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Printer,
  Receipt,
  Send,
  UserPlus,
  UserX
} from "lucide-react";
import { AvatarButton } from "../AvatarButton";
import { KebabMenu, type MenuAction } from "./KebabMenu";
import { PanelShell } from "./PanelShell";
import { formatDate, getWhatsAppUrl } from "../../lib/format";
import { functionLabel } from "../../lib/functionInfo";
import { getJobStatus } from "../../lib/rules";
import { getShiftVerificationCode } from "../../lib/shiftVerification";
import { parseISODate, type Bucket, type JobEvent, type Person } from "../../lib/scheduleEvents";

const LIME = "#C8FF38";
const AMBER = "#F4B740";
const RED = "#FF5252";
const GRAY = "#7D8494";
const TRACK = "#3A3F4A";

const BUCKET_ORDER: Record<Bucket, number> = { confirmado: 0, aguardando: 1, candidato: 2, recusou: 3, faltou: 4 };
const OTHERS_PREVIEW = 5;

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

function eventStatus(event: JobEvent, today: string): { label: string; color: string } {
  if (event.concluded) return { label: "Concluído", color: GRAY };
  if (event.jobs.some((job) => getJobStatus(job) === "Em andamento")) return { label: "Em andamento", color: LIME };
  if (event.date === today) return { label: "Hoje", color: LIME };
  return event.jobs.some((job) => getJobStatus(job) === "Urgente") ? { label: "Urgente", color: RED } : { label: "Publicada", color: LIME };
}

function personStatus(person: Person): { label: string; color: string } {
  if (person.application.status === "Trabalho concluído") return { label: "Concluído", color: LIME };
  if (person.bucket === "confirmado") return { label: "Confirmado", color: LIME };
  if (person.bucket === "aguardando") return { label: "Aguardando", color: AMBER };
  if (person.bucket === "candidato") return { label: "Candidato", color: GRAY };
  if (person.bucket === "faltou") return { label: "Faltou", color: RED };
  return { label: "Recusou", color: RED };
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

const quickButton = "secondary min-h-9 px-3 text-xs";

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
  const [tab, setTab] = useState("equipe");
  const [showAllOthers, setShowAllOthers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(() => summaryText(event));

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
  const manageLink = `/app/candidatos?vaga=${first.id}`;

  const byName = (a: Person, b: Person) => (a.worker?.name ?? "").localeCompare(b.worker?.name ?? "", "pt-BR");
  const confirmedPeople = event.people.filter((person) => person.bucket === "confirmado").sort(byName);
  const others = event.people
    .filter((person) => person.bucket !== "confirmado")
    .sort((a, b) => BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] || byName(a, b));
  const visibleOthers = showAllOthers ? others : others.slice(0, OTHERS_PREVIEW);
  const waiting = event.people.filter((person) => person.bucket === "aguardando");

  function copy(text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {
        // Sem permissão da área de transferência: o texto continua na caixa.
      });
  }

  function personActions(person: Person): MenuAction[] {
    const { application, worker } = person;
    const isWaiting = person.bucket === "aguardando";
    const firstName = worker?.name.split(" ")[0] ?? "";
    const whatsappText = isWaiting
      ? `Olá, ${firstName}! Você consegue confirmar presença na escala de ${formatDate(event.date)} (${event.name}) no ${companyName}?`
      : `Olá, ${firstName}. Estou organizando a escala de ${formatDate(event.date)} (${event.name}) no ${companyName}.`;
    const actions: MenuAction[] = [];
    if (worker?.phone) {
      actions.push({
        label: isWaiting ? "Cobrar confirmação no WhatsApp" : "Chamar no WhatsApp",
        icon: <MessageCircle size={15} />,
        href: getWhatsAppUrl(worker.phone, whatsappText)
      });
      actions.push({ label: `Ligar (${worker.phone})`, icon: <Phone size={15} />, href: `tel:${worker.phone}` });
    }
    actions.push({ label: "Mensagens do PONT", icon: <MessageSquareText size={15} />, to: "/app/mensagens" });
    if (application.status === "Aprovada") {
      actions.push({ label: "Concluir turno", icon: <CheckCircle2 size={15} />, disabled, onClick: () => onComplete(application.id) });
      actions.push({ label: "Registrar falta", icon: <UserX size={15} />, danger: true, disabled, onClick: () => onAbsence(application.id) });
    }
    return actions;
  }

  function renderPerson(person: Person) {
    const { worker, application } = person;
    const job = jobById.get(application.jobId);
    const state = personStatus(person);
    const code = person.bucket === "confirmado" && job && worker ? getShiftVerificationCode(job.id, worker.id) : "";
    return (
      <li key={application.id} className="flex items-center gap-3 px-3 py-2.5">
        {worker ? (
          <AvatarButton src={worker.avatarUrl} name={worker.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        )}
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm text-white">{worker?.name ?? "Profissional"}</strong>
          <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
            {job ? functionLabel(job.function) : "—"}
            {code && <span className="text-slate-500">· Cód. {code}</span>}
          </span>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black text-white"
          style={{ borderColor: `${state.color}66`, background: `${state.color}1f` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: state.color }} /> {state.label}
        </span>
        <KebabMenu actions={personActions(person)} label={`Ações de ${worker?.name ?? "profissional"}`} vertical />
      </li>
    );
  }

  const teamTab = (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-black text-white">
          Equipe ({event.confirmed}/{event.slots})
        </h4>
        <Link to={manageLink} className="secondary min-h-10 px-3 text-sm">
          <UserPlus size={16} /> Adicionar profissional
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        {confirmedPeople.length === 0 ? (
          <p className="px-3 py-4 text-sm font-semibold text-slate-400">
            Ninguém confirmou ainda. Convide profissionais, aprove candidatos ou envie o link de convite.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {confirmedPeople.map(renderPerson)}
          </ul>
        )}
        {missing > 0 && (
          <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dashed border-white/20 text-slate-400">
              <UserPlus size={16} />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-400">
              {missing} vaga{missing === 1 ? "" : "s"} em aberto
            </span>
            <Link to="/app/profissionais" className="secondary min-h-9 px-3 text-xs">
              Convidar
            </Link>
          </div>
        )}
      </div>

      {others.length > 0 && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-sm font-black text-slate-600">
              Aguardando, candidatos, recusas e faltas <span className="text-slate-400">({others.length})</span>
            </h5>
            {others.length > OTHERS_PREVIEW && (
              <button type="button" className="text-xs font-black text-aqua-300" onClick={() => setShowAllOthers((current) => !current)}>
                {showAllOthers ? "Mostrar menos" : `Ver todos (${others.length})`}
              </button>
            )}
          </div>
          <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
            {visibleOthers.map(renderPerson)}
          </ul>
        </div>
      )}
    </div>
  );

  const detailsTab = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-baseline gap-2">
          <strong className="text-2xl text-white">
            {event.confirmed}/{event.slots}
          </strong>
          <span className="text-sm font-semibold text-slate-300">profissionais</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
          <span style={{ width: pct(event.confirmed), background: LIME }} />
          <span style={{ width: pct(event.pending), background: AMBER }} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: LIME }} /> {event.confirmed} confirmados
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> {event.pending} pendentes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: GRAY }} /> {free} vaga{free === 1 ? "" : "s"}
          </span>
          {event.declined > 0 && <span className="text-alert">{event.declined} recusaram</span>}
          {event.absent > 0 && <span className="text-alert">{event.absent} faltaram</span>}
          {event.candidates > 0 && (
            <Link to={manageLink} className="text-aqua-300">
              {event.candidates} candidato{event.candidates === 1 ? "" : "s"} aguardando aprovação
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-black text-white">Resumo das funções</h5>
        <div className="grid gap-2">
          {event.functions.map((item) => {
            const complete = item.slots > 0 && item.confirmed >= item.slots;
            const color = complete ? LIME : item.confirmed > 0 ? AMBER : TRACK;
            const width = item.slots > 0 ? Math.min(100, (item.confirmed / item.slots) * 100) : 0;
            return (
              <div key={item.function} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs">
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

      <section className="rounded-xl border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-black text-white">Local do evento</h5>
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

      <section className="rounded-xl border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-black text-white">Observações</h5>
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
  );

  const messagesTab = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="label text-xs">
          Mensagem para a equipe
          <textarea className="input min-h-28 py-3 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={quickButton} onClick={() => copy(draft)}>
            <ClipboardCopy size={14} /> {copied ? "Copiado!" : "Copiar resumo"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(draft)}`}
            target="_blank"
            rel="noreferrer"
            className="primary min-h-9 px-3 text-xs"
          >
            <MessageCircle size={14} /> Enviar no WhatsApp
          </a>
          <Link to="/app/mensagens" className={quickButton}>
            <MessageSquareText size={14} /> Mensagens do PONT
          </Link>
        </div>
      </div>

      <section className="grid gap-2">
        <h5 className="text-sm font-black text-white">
          Quem ainda não respondeu <span className="text-slate-400">({waiting.length})</span>
        </h5>
        {waiting.length === 0 ? (
          <p className="text-xs font-semibold text-slate-400">Ninguém pendente.</p>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
            {waiting.map((person) => (
              <li key={person.application.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-sm font-bold text-white">{person.worker?.name ?? "Profissional"}</span>
                {person.worker?.phone && (
                  <a
                    href={getWhatsAppUrl(
                      person.worker.phone,
                      `Olá, ${person.worker.name.split(" ")[0]}! Você consegue confirmar presença na escala de ${formatDate(event.date)} (${event.name}) no ${companyName}?`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-aqua-300"
                  >
                    <MessageCircle size={14} /> Cobrar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  return (
    <PanelShell
      title={event.name}
      statusLabel={status.label}
      statusColor={status.color}
      date={longDate(event.date)}
      time={`${event.startsAt} – ${event.endsAt}${duration ? ` (${duration})` : ""}`}
      place={address}
      quickActions={
        <>
          <button type="button" className={quickButton} onClick={() => onPrint(event.jobs)}>
            <Printer size={14} /> Ver escala
          </button>
          <button type="button" className={quickButton} onClick={() => onReceipts(event)}>
            <Receipt size={14} /> Recibos
          </button>
        </>
      }
      tabs={[
        { id: "equipe", label: "Equipe" },
        { id: "detalhes", label: "Detalhes" },
        { id: "mensagens", label: "Mensagens" }
      ]}
      activeTab={tab}
      onTab={setTab}
      footer={
        <>
          <Link to="/app/minhas-vagas" className="secondary min-h-11 justify-center">
            Editar escala
          </Link>
          <button type="button" className="primary min-h-11 justify-center" onClick={() => setTab("mensagens")}>
            <Send size={16} /> Enviar mensagem
          </button>
        </>
      }
    >
      {tab === "equipe" ? teamTab : tab === "detalhes" ? detailsTab : messagesTab}
    </PanelShell>
  );
}
