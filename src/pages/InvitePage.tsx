import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, UserRound, XCircle } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { fetchPublicInvite, respondToInvite, type InviteStatus, type PublicInvite, type RespondError } from "../lib/scheduleInvites";
import { formatCPF, formatPhoneInput, isValidCPF, isValidPhone } from "../lib/validation";

const CONTACT_KEY = "pont:invite-contact";

type Answer = "confirmo" | "recuso";

const ERROR_TEXT: Record<RespondError, string> = {
  invite_not_found: "Este convite não existe mais.",
  closed: "Este convite já foi encerrado.",
  name: "Informe seu nome completo.",
  phone: "Informe um celular válido, com DDD.",
  cpf: "Informe um CPF válido.",
  cpf_in_use: "Este CPF já respondeu por outro celular. Use o mesmo celular da primeira resposta ou fale com quem organiza a escala.",
  answer: "Escolha uma das opções.",
  full: "Este convite atingiu o limite de respostas. Fale com quem organiza a escala.",
  unavailable: "Não foi possível enviar sua resposta agora. Tente de novo em instantes."
};

function loadContact(): { name: string; phone: string } {
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (!raw) return { name: "", phone: "" };
    const parsed = JSON.parse(raw) as { name?: string; phone?: string };
    return { name: parsed.name ?? "", phone: parsed.phone ?? "" };
  } catch {
    return { name: "", phone: "" };
  }
}

function saveContact(name: string, phone: string) {
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, phone }));
  } catch {
    // Sem armazenamento local (aba anônima): só não lembra do contato na próxima vez.
  }
}

function longDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(parsed.getTime())) return date;
  const label = parsed.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function InvitePage() {
  const { code = "" } = useParams();
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState(() => loadContact().name);
  const [phone, setPhone] = useState(() => loadContact().phone);
  // O CPF não é guardado no aparelho: só o nome e o celular são lembrados.
  const [cpf, setCpf] = useState("");
  const [pending, setPending] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: InviteStatus } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    fetchPublicInvite(code)
      .then((data) => {
        if (active) setInvite(data);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : "Não foi possível abrir este convite.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  async function answer(choice: Answer) {
    if (pending) return;
    if (name.trim().length < 3) {
      setError(ERROR_TEXT.name);
      return;
    }
    if (!isValidPhone(phone)) {
      setError(ERROR_TEXT.phone);
      return;
    }
    if (!isValidCPF(cpf)) {
      setError(ERROR_TEXT.cpf);
      return;
    }
    setError("");
    setPending(choice);
    const response = await respondToInvite(code, name.trim(), phone, cpf, choice);
    setPending(null);
    if (!response.ok) {
      setError(ERROR_TEXT[response.error]);
      return;
    }
    saveContact(name.trim(), phone);
    setResult({ status: response.status });
    // Atualiza o contador de vagas mostrado na página.
    fetchPublicInvite(code)
      .then((data) => data && setInvite(data))
      .catch(() => {
        // O contador só não atualiza; a resposta já foi registrada.
      });
  }

  const remaining = invite ? Math.max(0, invite.quantity - invite.confirmed) : 0;
  const place = invite ? [invite.place, invite.neighborhood].filter(Boolean).join(" - ") : "";

  return (
    <div className="min-h-screen bg-ice px-4 py-6">
      <div className="mx-auto grid w-full max-w-md gap-4">
        <div className="flex justify-center">
          <BrandLogo />
        </div>

        {loading ? (
          <div className="card grid place-items-center gap-2 p-8 text-center">
            <Loader2 className="animate-spin text-aqua-300" size={26} />
            <span className="text-sm font-bold text-slate-300">Abrindo convite...</span>
          </div>
        ) : loadError ? (
          <div className="card p-6 text-center">
            <strong className="text-lg text-white">Convite indisponível</strong>
            <p className="mt-2 text-sm font-semibold text-slate-300">{loadError}</p>
          </div>
        ) : !invite || !invite.active ? (
          <div className="card p-6 text-center">
            <strong className="text-lg text-white">Convite não encontrado</strong>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {invite && !invite.active
                ? "Esta escala foi cancelada ou encerrada."
                : "Confira se o link está completo ou peça um novo a quem organiza a escala."}
            </p>
          </div>
        ) : (
          <>
            <article className="card grid gap-3 p-5">
              {invite.companyName && <span className="text-xs font-black uppercase text-aqua-300">{invite.companyName}</span>}
              <h1 className="text-2xl font-black leading-tight text-white">{invite.title}</h1>
              <div className="grid gap-2 text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} className="shrink-0" /> {longDate(invite.date)}
                </span>
                <span className="flex items-center gap-2">
                  <Clock3 size={16} className="shrink-0" /> {invite.startsAt} – {invite.endsAt}
                </span>
                {place && (
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="shrink-0" /> {place}
                  </span>
                )}
                {invite.functionName && (
                  <span className="flex items-center gap-2">
                    <UserRound size={16} className="shrink-0" /> {invite.functionName}
                  </span>
                )}
              </div>
              {invite.notes && <p className="rounded-lg bg-white/5 p-3 text-sm font-semibold leading-6 text-slate-300">{invite.notes}</p>}
              <span className={`text-xs font-black ${remaining > 0 ? "text-aqua-300" : "text-amber-500"}`}>
                {remaining > 0
                  ? `${remaining} vaga${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"} de ${invite.quantity}`
                  : "Vagas preenchidas: novas confirmações entram na lista de espera"}
              </span>
            </article>

            {result ? (
              <article className="card grid gap-3 p-5 text-center">
                {result.status === "confirmado" && (
                  <>
                    <CheckCircle2 className="mx-auto text-aqua-300" size={36} />
                    <strong className="text-xl text-white">Presença confirmada!</strong>
                    <p className="text-sm font-semibold text-slate-300">Sua confirmação já chegou a quem organiza a escala. Até lá!</p>
                  </>
                )}
                {result.status === "lista_espera" && (
                  <>
                    <Clock3 className="mx-auto text-amber-500" size={36} />
                    <strong className="text-xl text-white">Você está na lista de espera</strong>
                    <p className="text-sm font-semibold text-slate-300">
                      As vagas já foram preenchidas. Se alguém desistir, você sobe automaticamente e o organizador entra em contato.
                    </p>
                  </>
                )}
                {result.status === "recusado" && (
                  <>
                    <XCircle className="mx-auto text-slate-400" size={36} />
                    <strong className="text-xl text-white">Obrigado por avisar</strong>
                    <p className="text-sm font-semibold text-slate-300">Sua resposta foi registrada. A vaga fica livre para outra pessoa.</p>
                  </>
                )}
                <button type="button" className="secondary" onClick={() => setResult(null)}>
                  Mudar minha resposta
                </button>
                <Link to="/cadastro-trabalhador" className="text-sm font-black text-aqua-300">
                  Quer receber mais vagas? Crie seu perfil no PONT
                </Link>
              </article>
            ) : (
              <form
                className="card grid gap-3 p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <label className="label">
                  Seu nome completo
                  <input
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Maria da Silva"
                    maxLength={80}
                  />
                </label>
                <label className="label">
                  Seu celular (WhatsApp)
                  <input
                    className="input"
                    value={phone}
                    onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="(48) 99999-9999"
                  />
                </label>
                <label className="label">
                  Seu CPF
                  <input
                    className="input"
                    value={cpf}
                    onChange={(event) => setCpf(formatCPF(event.target.value))}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    aria-invalid={cpf.length > 0 && !isValidCPF(cpf)}
                  />
                </label>
                {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
                <button type="button" className="primary min-h-12 w-full text-base" disabled={pending !== null} onClick={() => answer("confirmo")}>
                  {pending === "confirmo" ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Confirmo presença
                </button>
                <button type="button" className="secondary min-h-12 w-full text-base" disabled={pending !== null} onClick={() => answer("recuso")}>
                  {pending === "recuso" ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />} Não posso
                </button>
                <p className="text-center text-xs font-semibold text-slate-400">
                  Usamos seu nome, celular e CPF só para a lista de presença e o recibo desta escala. Não precisa de cadastro.
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
