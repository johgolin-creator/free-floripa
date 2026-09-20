import type { ReactNode } from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";

export interface PanelTab {
  id: string;
  label: string;
}

/** Casca do painel do evento selecionado: título e situação, data/horário/local,
 *  ações rápidas, abas, conteúdo e rodapé com os botões principais. */
export function PanelShell({
  title,
  statusLabel,
  statusColor = "#C8FF38",
  date,
  time,
  place,
  quickActions,
  tabs,
  activeTab,
  onTab,
  children,
  footer
}: {
  title: string;
  statusLabel: string;
  statusColor?: string;
  date: string;
  time: string;
  place?: string;
  quickActions?: ReactNode;
  tabs: PanelTab[];
  activeTab: string;
  onTab: (id: string) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <aside className="grid min-w-0 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-20">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-2xl font-black leading-tight text-white">{title}</h3>
        <span
          className="shrink-0 rounded-lg border px-3 py-1 text-xs font-black"
          style={{ color: statusColor, borderColor: `${statusColor}66`, background: `${statusColor}1f` }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-1.5 text-sm font-semibold text-slate-600">
        <span className="flex items-center gap-2.5">
          <CalendarDays size={16} className="shrink-0 text-slate-400" /> {date}
        </span>
        <span className="flex items-center gap-2.5">
          <Clock3 size={16} className="shrink-0 text-slate-400" /> {time}
        </span>
        {place && (
          <span className="flex items-center gap-2.5">
            <MapPin size={16} className="shrink-0 text-slate-400" /> {place}
          </span>
        )}
      </div>

      {quickActions && <div className="flex flex-wrap gap-2">{quickActions}</div>}

      <div role="tablist" className="flex gap-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTab(tab.id)}
            className={`-mb-px border-b-2 px-1 pb-2.5 text-sm font-black transition ${
              activeTab === tab.id ? "border-aqua-300 text-aqua-300" : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-w-0">{children}</div>

      {footer && <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">{footer}</div>}
    </aside>
  );
}
