import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { KeyRound, MessageSquare, Smartphone } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";
import { formatBrPhone, isValidBrMobile, onlyDigits, toPhoneE164 } from "../lib/validation";

export function PhoneVerifyPage() {
  const { user, phoneVerified, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const { state, currentWorker, currentCompany } = useAppStore();
  const navigate = useNavigate();

  const storedPhone = useMemo(() => {
    const fromProfile = state.activeRole === "empresa" ? currentCompany?.phone : currentWorker?.phone;
    const fromMetadata = typeof user?.user_metadata?.phone === "string" ? user.user_metadata.phone : "";
    return formatBrPhone(fromProfile || fromMetadata || "");
  }, [state.activeRole, currentCompany?.phone, currentWorker?.phone, user]);

  const [phone, setPhone] = useState(storedPhone);
  const [editingPhone, setEditingPhone] = useState(!storedPhone);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const landingPath = state.activeRole === "empresa" ? "/app/empresa" : "/app/trabalhador";

  if (phoneVerified) {
    return <Navigate to={landingPath} replace />;
  }

  async function handleSend() {
    if (!isValidBrMobile(phone)) {
      setError("Informe um celular válido com DDD, no formato (48) 9XXXX-XXXX.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    try {
      await sendPhoneOtp(toPhoneE164(phone));
      setSent(true);
      setEditingPhone(false);
      setMessage(`Enviamos um código por SMS para ${formatBrPhone(phone)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerify() {
    if (onlyDigits(code).length < 4) {
      setError("Digite o código recebido por SMS.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await verifyPhoneOtp(toPhoneE164(phone), onlyDigits(code));
      navigate(landingPath, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <SectionHeader
        eyebrow="Segurança"
        title="Confirme seu telefone"
        description="Enviamos um código por SMS para garantir que o número é seu. Isso é necessário uma única vez."
      />

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      {message && <div className="rounded-lg bg-aqua-50 p-3 text-sm font-bold text-aqua-800">{message}</div>}

      <section className="card grid gap-4 p-5">
        <label className="label">
          <span className="flex items-center gap-2"><Smartphone size={16} /> Celular</span>
          <input
            className="input"
            inputMode="tel"
            placeholder="(48) 99999-9999"
            value={phone}
            disabled={!editingPhone && sent}
            onChange={(event) => setPhone(formatBrPhone(event.target.value))}
          />
        </label>

        {!sent ? (
          <button type="button" className="primary" disabled={pending} onClick={handleSend}>
            <MessageSquare size={17} /> {pending ? "Enviando..." : "Enviar código por SMS"}
          </button>
        ) : (
          <>
            <label className="label">
              <span className="flex items-center gap-2"><KeyRound size={16} /> Código recebido</span>
              <input
                className="input tracking-widest"
                inputMode="numeric"
                maxLength={8}
                placeholder="______"
                value={code}
                onChange={(event) => setCode(onlyDigits(event.target.value))}
              />
            </label>
            <button type="button" className="primary" disabled={pending} onClick={handleVerify}>
              {pending ? "Confirmando..." : "Confirmar telefone"}
            </button>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="secondary" disabled={pending} onClick={handleSend}>
                Reenviar código
              </button>
              <button
                type="button"
                className="secondary"
                disabled={pending}
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setEditingPhone(true);
                  setMessage("");
                }}
              >
                Trocar número
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
