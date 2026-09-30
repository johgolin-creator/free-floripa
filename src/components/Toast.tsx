import { X } from "lucide-react";
import { useEffect, useState } from "react";

// Mesma duração de .toast.is-leaving no index.css.
const EXIT_MS = 150;

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setLeaving(false);
      onClose();
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      className={`toast fixed bottom-20 left-4 right-4 z-50 rounded-lg border border-white/10 bg-navy-950 p-4 text-sm font-semibold text-white shadow-lift md:bottom-6 md:left-auto md:w-96 ${
        leaving ? "is-leaving" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          aria-label="Fechar mensagem"
          className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
