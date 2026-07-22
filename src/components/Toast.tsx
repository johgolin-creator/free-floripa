import { X } from "lucide-react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-lg bg-navy-950 p-4 text-sm font-semibold text-white shadow-soft md:bottom-6 md:left-auto md:w-96">
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button type="button" onClick={onClose} aria-label="Fechar mensagem" className="text-white">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
