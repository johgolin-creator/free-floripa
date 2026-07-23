import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ProfileCompletionAlertProps {
  complete: boolean;
  missing: string[];
  onEdit?: () => void;
}

export function ProfileCompletionAlert({ complete, missing, onEdit }: ProfileCompletionAlertProps) {
  if (complete) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-aqua-100 p-3 text-sm font-bold text-navy-950">
        <CheckCircle2 size={18} /> Perfil completo para usar o Free Floripa.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <strong className="flex items-center gap-2 text-sm text-navy-950">
            <AlertCircle size={18} /> Complete seu perfil para liberar o painel
          </strong>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Falta preencher: {missing.join(", ")}.
          </p>
        </div>
        {onEdit && (
          <button type="button" className="primary shrink-0" onClick={onEdit}>
            Completar agora
          </button>
        )}
      </div>
    </div>
  );
}
