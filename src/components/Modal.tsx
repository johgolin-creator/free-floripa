import { X } from "lucide-react";
import type { ReactNode } from "react";

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
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-navy-950/55 p-0 md:place-items-center md:p-6">
      <section
        className={`w-full rounded-t-2xl bg-brand-charcoal p-5 shadow-soft md:rounded-lg ${
          size === "lg" ? "max-h-[92vh] max-w-5xl overflow-y-auto" : "max-w-xl"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="secondary min-h-9 px-2">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
