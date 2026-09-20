import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCopy, Link2, Loader2, MessageCircle, Trash2, XCircle } from "lucide-react";
import { getWhatsAppUrl } from "../../lib/format";
import {
  findScheduleInvite,
  getOrCreateScheduleInvite,
  inviteWhatsappShareUrl,
  listInviteResponses,
  removeInviteResponse,
  scheduleInviteMessage,
  scheduleInviteUrl,
  setInviteResponseStatus,
  type InviteResponse,
  type InviteStatus,
  type ScheduleInvite
} from "../../lib/scheduleInvites";
import type { CompanySchedule } from "../../lib/types";

const POLL_MS = 15_000;

function formatPhone(digits: string) {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export function ScheduleInvitePanel({
  schedule,
  companyName,
  disabled,
  autoCreate
}: {
  schedule: CompanySchedule;
  companyName: string;
  disabled?: boolean;
  /** Cria o link assim que o painel abre (usado logo depois de criar a escala). */
  autoCreate?: boolean;
}) {
  const [invite, setInvite] = useState<ScheduleInvite | null>(null);
  const [responses, setResponses] = useState<InviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const createInvite = useCallback(async () => {
    setCreating(true);
    setError("");
    try {
      setInvite(await getOrCreateScheduleInvite(schedule, companyName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setCreating(false);
    }
  }, [schedule, companyName]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setInvite(null);
    setResponses([]);
    setError("");

    (async () => {
      try {
        const existing = await findScheduleInvite(schedule.id);
        if (!active) return;
        if (existing) setInvite(existing);
        else if (autoCreate) await createInvite();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar o link.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // O painel troca de escala pelo id; createInvite muda a cada render da escala editada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.id, autoCreate]);

  const inviteId = invite?.id;
  useEffect(() => {
    if (!inviteId) return;
    let active = true;

    function refresh() {
      if (document.visibilityState === "hidden") return;
      listInviteResponses(inviteId!)
        .then((rows) => {
          if (active) setResponses(rows);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar as respostas.");
        });
    }

    refresh();
    const intervalId = window.setInterval(refresh, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [inviteId]);

  function copy(key: string, text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        window.setTimeout(() => setCopied(""), 1800);
      })
      .catch(() => {
        // Sem permissão da área de transferência: o link continua visível para copiar à mão.
      });
  }

  async function changeStatus(response: InviteResponse, status: InviteStatus) {
    setResponses((current) => current.map((item) => (item.id === response.id ? { ...item, status } : item)));
    try {
      await setInviteResponseStatus(response.id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
      if (invite) listInviteResponses(invite.id).then(setResponses).catch(() => {});
    }
  }

  async function remove(response: InviteResponse) {
    setResponses((current) => current.filter((item) => item.id !== response.id));
    try {
      await removeInviteResponse(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover.");
      if (invite) listInviteResponses(invite.id).then(setResponses).catch(() => {});
    }
  }

  const url = invite ? scheduleInviteUrl(invite.code) : "";
  const message = invite ? scheduleInviteMessage(schedule, companyName, url) : "";
  const confirmed = responses.filter((item) => item.status === "confirmado");
  const waiting = responses.filter((item) => item.status === "lista_espera");
  const declined = responses.filter((item) => item.status === "recusado");

  return (
    <section className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <h4 className="flex items-center gap-2 text-base font-black text-white">
        <Link2 size={17} /> Link de convite
      </h4>

      {loading ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <Loader2 className="animate-spin" size={15} /> Carregando...
        </p>
      ) : !invite ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold text-slate-300">
            Gere um link para colar na lista de transmissão ou no grupo. Quem abrir confirma a presença em segundos, sem precisar de cadastro.
          </p>
          <button type="button" className="primary justify-self-start" disabled={disabled || creating} onClick={createInvite}>
            {creating ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />} Gerar link de convite
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className="input !min-h-10" readOnly value={url} onFocus={(event) => event.currentTarget.select()} aria-label="Link de convite" />
            <button type="button" className="secondary min-h-10 px-4 text-sm" onClick={() => copy("link", url)}>
              <ClipboardCopy size={15} /> {copied === "link" ? "Copiado!" : "Copiar link"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={inviteWhatsappShareUrl(message)} target="_blank" rel="noreferrer" className="primary min-h-10 px-4 text-sm">
              <MessageCircle size={16} /> Enviar no WhatsApp
            </a>
            <button type="button" className="secondary min-h-10 px-4 text-sm" onClick={() => copy("message", message)}>
              <ClipboardCopy size={15} /> {copied === "message" ? "Copiado!" : "Copiar mensagem pronta"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="badge bg-aqua-50 text-aqua-700">
              <CheckCircle2 size={13} /> {confirmed.length}/{schedule.quantity} confirmados
            </span>
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">{waiting.length} na lista de espera</span>
            <span className="badge border-red-100 bg-red-50 text-alert">
              <XCircle size={13} /> {declined.length} recusaram
            </span>
          </div>

          <ResponseList title="Confirmaram" tone="text-aqua-700" rows={confirmed} onRemove={remove} onStatus={changeStatus} disabled={disabled} />
          <ResponseList title="Lista de espera" tone="text-amber-600" rows={waiting} onRemove={remove} onStatus={changeStatus} disabled={disabled} promote />
          <ResponseList title="Recusaram" tone="text-alert" rows={declined} onRemove={remove} onStatus={changeStatus} disabled={disabled} />
          {responses.length === 0 && (
            <p className="text-sm font-semibold text-slate-400">Ninguém respondeu ainda. As respostas aparecem aqui sozinhas.</p>
          )}
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
    </section>
  );
}

function ResponseList({
  title,
  tone,
  rows,
  promote,
  disabled,
  onRemove,
  onStatus
}: {
  title: string;
  tone: string;
  rows: InviteResponse[];
  promote?: boolean;
  disabled?: boolean;
  onRemove: (response: InviteResponse) => void;
  onStatus: (response: InviteResponse, status: InviteStatus) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <strong className={`text-xs font-black uppercase ${tone}`}>
        {title} ({rows.length})
      </strong>
      <ul className="mt-1 grid gap-1">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">{row.name}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                {formatPhone(row.phoneDigits)}
                <span className={row.inPont ? "text-aqua-300" : "text-slate-500"}>{row.inPont ? "Tem conta no PONT" : "Sem cadastro"}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {promote && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onStatus(row, "confirmado")}
                  className="rounded-lg border border-aqua-300/40 bg-aqua-300/10 px-2.5 py-1.5 text-xs font-black text-aqua-300 transition hover:bg-aqua-300/20 disabled:opacity-40"
                >
                  Confirmar
                </button>
              )}
              <a
                href={getWhatsAppUrl(row.phoneDigits)}
                target="_blank"
                rel="noreferrer"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                title="Chamar no WhatsApp"
                aria-label={`Chamar ${row.name} no WhatsApp`}
              >
                <MessageCircle size={15} />
              </a>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(row)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-alert disabled:opacity-40"
                title="Remover"
                aria-label={`Remover ${row.name}`}
              >
                <Trash2 size={15} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
