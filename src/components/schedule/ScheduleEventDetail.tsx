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
  Star,
  UserX,
  Users
} from "lucide-react";
import { AvatarButton } from "../AvatarButton";
import { formatDate, getWhatsAppUrl } from "../../lib/format";
import { getJobStatus } from "../../lib/rules";
import { getShiftVerificationCode } from "../../lib/shiftVerification";
import { parseISODate, type Bucket, type JobEvent, type Person } from "../../lib/scheduleEvents";

const LIME = "#C8FF38";
const AMBER = "#F4B740";
const TRACK = "#3A3F4A";

const BUCKET_ORDER: Record<Bucket, number> = { confirmado: 0, aguardando: 1, candidato: 2, recusou: 3, faltou: 4 };
const TEAM_PREVIEW = 6;

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
  coverUrl,
  disabled,
  onComplete,
  onAbsence,
  onPrint
}: {
  event: JobEvent;
  today: string;
  companyName: string;
  coverUrl?: string;
  disabled?: boolean;
  onComplete: (applicationId: string) => void;
  onAbsence: (applicationId: string) => void;
  onPrint: (jobs: JobEvent["jobs"]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
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

  const team = [...event.people].sort(
    (a, b) =>
      BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] || (a.worker?.name ?? "").localeCompare(b.worker?.name ?? "")
  );
  const visibleTeam = showAll ? team : team.slice(0, TEAM_PREVIEW);
  const jobById = new Map(event.jobs.map((job) => [job.id, job]));

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

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 content-start gap-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <article
            className="relative flex min-h-64 flex-col justify-end overflow-hidden rounded-lg border border-white/10 p-5 shadow-soft"
            style={{
              backgroundImage: coverUrl
                ? `linear-gradient(180deg, rgba(17,19,24,0.25) 0%, rgba(17,19,24,0.92) 78%), url(${coverUrl})`
                : "linear-gradient(135deg, #2E3A20 0%, #1B1E24 60%, #111318 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            <span className="absolute left-5 top-5 rounded-lg bg-aqua-300 px-3 py-1 text-xs font-black text-navy-950">{status}</span>
            <h3 className="text-2xl font-black text-white">{event.name}</h3>
            <div className="mt-3 grid gap-1.5 text-sm font-semibold text-slate-200">
              <span className="flex items-center gap-2">
                <CalendarDays size={16} /> {longDate(event.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={16} /> {event.startsAt} – {event.endsAt}
                {duration ? ` (${duration})` : ""}
              </span>
              {address && (
                <span className="flex items-center gap-2">
                  <MapPin size={16} /> {address}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {event.functions.map((item) => (
                <span key={item.function} className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-black text-white">
                  {item.function}
                </span>
              ))}
            </div>
          </article>

          <article className="grid content-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div>
              <div className="flex items-baseline gap-2">
                <strong className="text-3xl text-white">
                  {event.confirmed}/{event.slots}
                </strong>
                <span className="text-sm font-semibold text-slate-300">profissionais</span>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
                <span style={{ width: pct(event.confirmed), background: LIME }} />
                <span style={{ width: pct(event.pending), background: AMBER }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: LIME }} /> {event.confirmed} confirmados
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: AMBER }} /> {event.pending} pendentes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: "#7D8494" }} /> {free} vaga{free === 1 ? "" : "s"}
                </span>
              </div>
              {(event.declined > 0 || event.absent > 0) && (
                <p className="mt-2 text-xs font-bold text-alert">
                  {event.declined > 0 ? `${event.declined} recusaram` : ""}
                  {event.declined > 0 && event.absent > 0 ? " · " : ""}
                  {event.absent > 0 ? `${event.absent} faltaram` : ""}
                </p>
              )}
              {missing > 0 && <p className="mt-2 text-xs font-bold text-amber-500">Faltam {missing} para completar a escala.</p>}
            </div>

            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="secondary min-h-10 px-3 text-sm" onClick={() => onPrint(event.jobs)}>
                  <Printer size={16} /> Ver escala
                </button>
                <Link
                  to={`/app/candidatos?vaga=${event.jobs[0].id}`}
                  className="primary min-h-10 px-3 text-sm"
                >
                  Gerenciar equipe
                </Link>
              </div>
              <button type="button" className="secondary min-h-9 px-3 text-xs" onClick={copySummary}>
                <ClipboardCopy size={15} /> {copied ? "Copiado!" : "Copiar resumo para o WhatsApp"}
              </button>
              {event.candidates > 0 && (
                <Link to={`/app/candidatos?vaga=${event.jobs[0].id}`} className="text-center text-xs font-black text-aqua-300">
                  {event.candidates} candidato{event.candidates === 1 ? "" : "s"} aguardando sua aprovação
                </Link>
              )}
            </div>
          </article>
        </div>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h4 className="flex items-center gap-2 text-base font-black text-white">
              <Users size={17} /> Equipe do evento
            </h4>
            {team.length > TEAM_PREVIEW && (
              <button type="button" className="text-xs font-black text-aqua-300" onClick={() => setShowAll((current) => !current)}>
                {showAll ? "Mostrar menos" : `Ver todos (${team.length})`}
              </button>
            )}
          </div>

          {team.length === 0 ? (
            <p className="px-4 py-6 text-sm font-semibold text-slate-400">
              Ninguém na equipe ainda. Convide profissionais ou aprove candidatos para preencher esta escala.
            </p>
          ) : (
            <div>
              <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_0.8fr_auto] gap-3 px-4 py-2 text-[0.68rem] font-black uppercase text-slate-500 md:grid">
                <span>Profissional</span>
                <span>Função</span>
                <span>Status</span>
                <span>Código</span>
                <span>Ações</span>
              </div>
              {visibleTeam.map((person) => {
                const { application, worker } = person;
                const job = jobById.get(application.jobId);
                const status = personStatus(person);
                const canAct = application.status === "Aprovada";
                const waiting = person.bucket === "aguardando";
                const whatsappText = waiting
                  ? `Olá, ${worker?.name.split(" ")[0] ?? ""}! Você consegue confirmar presença na escala de ${formatDate(event.date)} (${event.name}) no ${companyName}?`
                  : `Olá, ${worker?.name.split(" ")[0] ?? ""}. Estou organizando a escala de ${formatDate(event.date)} (${event.name}) no ${companyName}.`;

                return (
                  <div
                    key={application.id}
                    className="grid gap-2 border-t border-white/10 px-4 py-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_0.8fr_auto] md:items-center md:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {worker ? (
                        <AvatarButton src={worker.avatarUrl} name={worker.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
                      )}
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-white">{worker?.name ?? "Profissional"}</strong>
                        {worker && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <Star size={11} className="fill-current text-amber-400" /> {worker.rating.toFixed(1)} ({worker.completedJobs})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{job?.function ?? "—"}</span>
                    <span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black text-white"
                        style={{ borderColor: `${status.color}66`, background: `${status.color}1f` }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: status.color }} /> {status.label}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      {person.bucket === "confirmado" && job && worker ? getShiftVerificationCode(job.id, worker.id) : "–"}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {worker?.phone && (
                        <>
                          <a
                            href={getWhatsAppUrl(worker.phone, whatsappText)}
                            target="_blank"
                            rel="noreferrer"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                            title={waiting ? "Cobrar confirmação no WhatsApp" : "Chamar no WhatsApp"}
                            aria-label={waiting ? "Cobrar confirmação no WhatsApp" : "Chamar no WhatsApp"}
                          >
                            <MessageCircle size={16} />
                          </a>
                          <a
                            href={`tel:${worker.phone}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                            title={worker.phone}
                            aria-label={`Ligar para ${worker.name}`}
                          >
                            <Phone size={16} />
                          </a>
                        </>
                      )}
                      <Link
                        to="/app/mensagens"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                        title="Mensagens"
                        aria-label="Mensagens"
                      >
                        <MessageSquareText size={16} />
                      </Link>
                      {canAct && (
                        <>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onComplete(application.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-aqua-300/40 bg-aqua-300/10 text-aqua-300 transition hover:bg-aqua-300/20 disabled:opacity-40"
                            title="Concluir turno"
                            aria-label="Concluir turno"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onAbsence(application.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-alert/40 bg-alert/10 text-alert transition hover:bg-alert/20 disabled:opacity-40"
                            title="Registrar falta"
                            aria-label="Registrar falta"
                          >
                            <UserX size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="mb-3 text-base font-black text-white">Resumo das funções</h4>
          <div className="grid gap-3">
            {event.functions.map((item) => {
              const complete = item.slots > 0 && item.confirmed >= item.slots;
              const color = complete ? LIME : item.confirmed > 0 ? AMBER : TRACK;
              const width = item.slots > 0 ? Math.min(100, (item.confirmed / item.slots) * 100) : 0;
              return (
                <div key={item.function} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate font-semibold text-slate-200">{item.function}</span>
                  <span className="h-2 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${width}%`, background: color }} />
                  </span>
                  <span className="text-xs font-black text-slate-300">
                    {item.confirmed}/{item.slots}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="mb-3 text-base font-black text-white">Local do evento</h4>
          <p className="flex items-start gap-2 text-sm font-semibold text-slate-200">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {address || "Local não informado."}
          </p>
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Florianópolis, SC`)}`}
              target="_blank"
              rel="noreferrer"
              className="secondary mt-3 min-h-10 w-full px-3 text-sm"
            >
              Ver no mapa <ExternalLink size={14} />
            </a>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="mb-3 text-base font-black text-white">Observações</h4>
          {notes.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">Nenhuma observação para este evento.</p>
          ) : (
            <div className="grid gap-2">
              {notes.map((line) => (
                <p key={line} className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-200">
                  <FileText size={15} className="mt-1 shrink-0 text-slate-400" /> {line}
                </p>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
