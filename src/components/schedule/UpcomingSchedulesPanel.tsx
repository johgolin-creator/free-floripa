import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Check, ClipboardCopy, Loader2, MessageCircle, UsersRound } from "lucide-react";
import { formatDate } from "../../lib/format";
import {
  findScheduleInvite,
  getOrCreateScheduleInvite,
  inviteWhatsappShareUrl,
  scheduleInviteMessage,
  scheduleInviteUrl,
  type ScheduleInvite
} from "../../lib/scheduleInvites";
import { buildTeam } from "../../lib/scheduleTeam";
import type { CompanySchedule } from "../../lib/types";
import { useInviteTeams } from "./useInviteTeams";

const MAX_ITEMS = 5;

/**
 * Bloco do Painel da empresa: atalho para montar escala e, para cada próxima escala,
 * enviar o link de convite (WhatsApp ou copiar) sem precisar abrir o calendário.
 */
export function UpcomingSchedulesPanel({
  schedules,
  companyName,
  today,
  disabled
}: {
  schedules: CompanySchedule[];
  companyName: string;
  today: string;
  disabled?: boolean;
}) {
  const inviteTeams = useInviteTeams();
  const upcoming = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.date >= today && schedule.status !== "Cancelada" && schedule.status !== "Concluída")
        .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt))
        .slice(0, MAX_ITEMS),
    [schedules, today]
  );
  const totalUpcoming = schedules.filter((schedule) => schedule.date >= today && schedule.status !== "Cancelada").length;

  // Links já existentes: buscados ao abrir, para o botão de envio responder na hora.
  const [invites, setInvites] = useState<Record<string, ScheduleInvite | null>>({});
  const idsKey = upcoming.map((schedule) => schedule.id).join(",");
  useEffect(() => {
    let active = true;
    for (const schedule of upcoming) {
      if (schedule.id in invites) continue;
      findScheduleInvite(schedule.id)
        .then((invite) => {
          if (active) setInvites((current) => ({ ...current, [schedule.id]: invite }));
        })
        .catch(() => {
          if (active) setInvites((current) => ({ ...current, [schedule.id]: null }));
        });
    }
    return () => {
      active = false;
    };
    // Recarrega só quando a lista de escalas muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const [busy, setBusy] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function ensureInvite(schedule: CompanySchedule) {
    const existing = invites[schedule.id];
    if (existing) return existing;
    const created = await getOrCreateScheduleInvite(schedule, companyName);
    setInvites((current) => ({ ...current, [schedule.id]: created }));
    return created;
  }

  function flash(key: string) {
    setDone(key);
    window.setTimeout(() => setDone(""), 2000);
  }

  async function send(schedule: CompanySchedule, mode: "whatsapp" | "copy") {
    setError("");
    const key = `${mode}:${schedule.id}`;
    // A janela do WhatsApp abre já no clique (senão o navegador bloqueia o pop-up depois da espera).
    const popup = mode === "whatsapp" && !invites[schedule.id] ? window.open("", "_blank") : null;
    setBusy(key);
    try {
      const invite = await ensureInvite(schedule);
      const url = scheduleInviteUrl(invite.code);
      const message = scheduleInviteMessage(schedule, companyName, url);
      if (mode === "copy") {
        await navigator.clipboard?.writeText(message);
      } else if (popup) {
        popup.location.href = inviteWhatsappShareUrl(message);
      } else {
        window.open(inviteWhatsappShareUrl(message), "_blank", "noopener");
      }
      flash(key);
    } catch (err) {
      popup?.close();
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card grid gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="section-eyebrow">Escalas</span>
          <h2 className="text-lg font-black text-white">Monte a escala e mande o link para a equipe</h2>
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto">
          <Link
            to="/app/escala?nova=1"
            className={`primary min-h-11 justify-center ${disabled ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={disabled}
          >
            <CalendarPlus size={18} /> Montar escala
          </Link>
          <Link to="/app/escala" className="secondary min-h-11 justify-center">
            Ver calendário
          </Link>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 p-2 text-sm font-bold text-red-300">{error}</p>}

      {upcoming.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm font-semibold text-slate-400">
          Nenhuma escala marcada. Toque em <strong className="text-white">Montar escala</strong>, preencha data, horário e quantas pessoas, e
          o PONT gera o link para você mandar na lista de transmissão ou no grupo.
        </p>
      ) : (
        <div className="grid gap-2">
          {upcoming.map((schedule) => {
            const confirmed = buildTeam(schedule, inviteTeams.bySchedule.get(schedule.id) ?? []).length;
            const full = schedule.quantity > 0 && confirmed >= schedule.quantity;
            const hasLink = Boolean(invites[schedule.id]);
            return (
              <article key={schedule.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <Link to={`/app/escala?escala=${schedule.id}`} className="min-w-0">
                  <h3 className="truncate font-black text-white">{schedule.title}</h3>
                  <p className="text-sm font-semibold text-slate-400">
                    {formatDate(schedule.date)} · {schedule.startsAt} às {schedule.endsAt}
                    {schedule.neighborhood ? ` · ${schedule.neighborhood}` : ""}
                  </p>
                  <p className={`mt-1 inline-flex items-center gap-1 text-xs font-black ${full ? "text-emerald-300" : "text-amber-300"}`}>
                    <UsersRound size={13} /> {confirmed}/{schedule.quantity} confirmados
                    {!hasLink && invites[schedule.id] === null ? " · link ainda não enviado" : ""}
                  </p>
                </Link>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    className="primary min-h-10 px-3"
                    disabled={disabled || busy !== ""}
                    onClick={() => void send(schedule, "whatsapp")}
                  >
                    {busy === `whatsapp:${schedule.id}` ? <Loader2 size={16} className="animate-spin" /> : done === `whatsapp:${schedule.id}` ? <Check size={16} /> : <MessageCircle size={16} />}
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="secondary min-h-10 px-3"
                    disabled={disabled || busy !== ""}
                    onClick={() => void send(schedule, "copy")}
                  >
                    {busy === `copy:${schedule.id}` ? <Loader2 size={16} className="animate-spin" /> : done === `copy:${schedule.id}` ? <Check size={16} /> : <ClipboardCopy size={16} />}
                    {done === `copy:${schedule.id}` ? "Copiado" : "Copiar link"}
                  </button>
                </div>
              </article>
            );
          })}
          {totalUpcoming > upcoming.length && (
            <Link to="/app/escala" className="text-sm font-black text-aqua-300 hover:underline">
              Ver todas as {totalUpcoming} escalas
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
