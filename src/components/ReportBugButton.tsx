import { useState } from "react";
import { Bug } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Modal } from "./Modal";
import { Toast } from "./Toast";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";
import { submitBugReport } from "../lib/bugReports";

export function ReportBugButton({ compact = false }: { compact?: boolean }) {
  const { user, email } = useAuth();
  const { state, currentWorker, currentCompany } = useAppStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const reporterName =
    (state.activeRole === "trabalhador" ? currentWorker?.name : currentCompany?.establishmentName) || email || "Moderador";

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Relatar bug"
          title="Relatar bug"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
        >
          <Bug size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/10 px-2.5 text-xs font-black text-slate-200 transition hover:bg-white/15 hover:text-white"
        >
          <Bug size={16} />
          Relatar bug
        </button>
      )}

      {open && (
        <Modal title="Relatar bug" onClose={() => setOpen(false)}>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              submitBugReport({
                reporterId: user?.id ?? "",
                reporterEmail: email,
                reporterName,
                title: title.trim(),
                description: description.trim(),
                pagePath: location.pathname
              })
                .then(() => {
                  setMessage("Relato enviado. Obrigado por ajudar a melhorar o PONT.");
                  setTitle("");
                  setDescription("");
                  setOpen(false);
                })
                .catch(() => {
                  setMessage("Não foi possível enviar o relato agora. Tente novamente em instantes.");
                })
                .finally(() => setPending(false));
            }}
          >
            <p className="text-sm leading-6 text-slate-600">
              Descreva o problema encontrado. A página atual ({location.pathname}) é enviada automaticamente junto com o relato.
            </p>
            <label className="label">
              Título
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input"
                required
                placeholder="Resumo curto do problema"
              />
            </label>
            <label className="label">
              Descrição
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="input min-h-28 py-3"
                required
                placeholder="O que aconteceu, o que você esperava e como reproduzir."
              />
            </label>
            <button type="submit" className="primary" disabled={pending}>
              <Bug size={17} /> {pending ? "Enviando..." : "Enviar relato"}
            </button>
          </form>
        </Modal>
      )}

      <Toast message={message} onClose={() => setMessage("")} />
    </>
  );
}
