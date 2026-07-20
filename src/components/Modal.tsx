import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-navy-950/55 p-0 md:place-items-center md:p-6">
      <section className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-soft md:rounded-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-navy-950">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="secondary min-h-9 px-2">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
