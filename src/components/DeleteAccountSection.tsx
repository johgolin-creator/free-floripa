import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { useAuth } from "../lib/auth";
import { accountDeletionEnabled, deleteOwnAccount } from "../lib/accountDeletion";

const CONFIRM_WORD = "EXCLUIR";
const SUPPORT_EMAIL = "contato@usepont.com.br";

export function DeleteAccountSection() {
  const { authEnabled } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    if (busy) return;
    setOpen(false);
    setConfirmText("");
    setError("");
  }

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
    setBusy(true);
    setError("");
    try {
      await deleteOwnAccount();
      navigate("/", { replace: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir a conta agora.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
      <div className="flex items-center gap-2 text-alert">
        <AlertTriangle size={18} />
        <strong className="text-sm font-black uppercase tracking-wide">Excluir conta</strong>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
        A exclusão é permanente e remove seu perfil, suas vagas ou candidaturas, mensagens, avaliações e o
        saldo de moedas. Alguns registros podem ser mantidos pelo prazo exigido por lei, conforme a Política
        de Privacidade.
      </p>

      {authEnabled && accountDeletionEnabled ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-black text-alert shadow-sm transition hover:bg-red-100"
        >
          <Trash2 size={17} /> Excluir minha conta
        </button>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          A exclusão pelo aplicativo está disponível apenas no ambiente online. Para pedir a exclusão agora,
          escreva para{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-alert underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      )}

      {open && (
        <Modal title="Confirmar exclusão da conta" onClose={closeModal}>
          <div className="grid gap-4">
            <p className="text-sm font-semibold leading-6 text-slate-300">
              Esta ação não pode ser desfeita. Digite <strong className="text-white">{CONFIRM_WORD}</strong>{" "}
              para confirmar.
            </p>
            <label className="label">
              Confirmação
              <input
                className="input"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoFocus
                autoComplete="off"
                placeholder={CONFIRM_WORD}
                disabled={busy}
              />
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300 bg-alert px-4 text-sm font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={17} /> {busy ? "Excluindo..." : "Excluir permanentemente"}
              </button>
              <button type="button" onClick={closeModal} disabled={busy} className="secondary min-h-11">
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
