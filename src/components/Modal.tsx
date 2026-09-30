import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

// Mesma duração da animação de saída (.modal-backdrop.is-closing no index.css).
const EXIT_MS = 200;

export function Modal({
  title,
  children,
  onClose,
  size = "md"
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  /** "lg" = janela larga (com rolagem), para tabelas e formulários grandes. */
  size?: "md" | "lg";
}) {
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fechar pelo X ou pelo Esc toca a saída antes de desmontar. Quando a tela
  // fecha o modal por conta própria (ex.: depois de salvar), ele some direto.
  const requestClose = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => onCloseRef.current(), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-40 grid place-items-end bg-navy-950/55 p-0 md:place-items-center md:p-6 ${
        closing ? "is-closing pointer-events-none" : ""
      }`}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal-panel w-full rounded-t-2xl bg-brand-charcoal p-5 shadow-soft md:rounded-lg ${
          size === "lg" ? "max-h-[92vh] max-w-5xl overflow-y-auto" : "max-w-xl"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-black text-white">{title}</h2>
          <button type="button" onClick={requestClose} aria-label="Fechar" className="secondary min-h-9 px-2">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
