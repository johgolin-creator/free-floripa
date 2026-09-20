import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Plus, Search } from "lucide-react";
import { EmptyState } from "../EmptyState";
import {
  addDays,
  addMonths,
  monthGrid,
  parseISODate,
  weekDates,
  type CalendarItem,
  type CalendarState
} from "../../lib/scheduleEvents";

export type CalendarView = "Semana" | "Mês" | "Lista";
export type StatusFilter = "Todos" | "Com vagas" | "Completos" | "Concluídos";

export const calendarViews: CalendarView[] = ["Semana", "Mês", "Lista"];
export const statusFilters: StatusFilter[] = ["Todos", "Com vagas", "Completos", "Concluídos"];

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

// Cor da faixa lateral de cada evento (a mesma para o mesmo nome).
const ACCENTS = ["#F4B740", "#4CA8FF", "#FF8A4C", "#A78BFA", "#34D399", "#F472B6"];

function accentFor(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

const STATE_DOT: Record<CalendarState, string> = {
  completo: "#C8FF38",
  vagas: "#F4B740",
  concluido: "#7D8494"
};

function stateLabel(item: CalendarItem) {
  if (item.state === "concluido") return "Concluído";
  if (item.state === "completo") return "Completo";
  const missing = Math.max(0, item.slots - item.filled);
  return `${missing} vaga${missing === 1 ? "" : "s"}`;
}

export function matchesStatusFilter(item: CalendarItem, filter: StatusFilter) {
  if (filter === "Com vagas") return item.state === "vagas";
  if (filter === "Completos") return item.state === "completo";
  if (filter === "Concluídos") return item.state === "concluido";
  return true;
}

function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMonthYear(date: string) {
  return capitalizeFirst(parseISODate(date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
}

function formatWeekRange(anchor: string) {
  const days = weekDates(anchor);
  const first = parseISODate(days[0]);
  const last = parseISODate(days[6]);
  const sameMonth = first.getMonth() === last.getMonth();
  const start = sameMonth
    ? String(first.getDate())
    : first.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const end = last.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return `${start} – ${end}`;
}

export function ScheduleCalendar({
  items,
  view,
  onViewChange,
  anchor,
  onAnchorChange,
  today,
  selectedDate,
  onSelectDate,
  selectedItemKey,
  onSelectItem,
  onAddOnDate,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  disabled
}: {
  items: CalendarItem[];
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  anchor: string;
  onAnchorChange: (date: string) => void;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedItemKey: string;
  onSelectItem: (key: string) => void;
  onAddOnDate: (date: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  disabled?: boolean;
}) {
  const [showFilters, setShowFilters] = useState(false);

  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const list = itemsByDate.get(item.date);
    if (list) list.push(item);
    else itemsByDate.set(item.date, [item]);
  }

  function step(direction: 1 | -1) {
    if (view === "Semana") onAnchorChange(addDays(anchor, 7 * direction));
    else if (view === "Mês") onAnchorChange(addMonths(anchor, direction));
  }

  function pick(item: CalendarItem) {
    onSelectDate(item.date);
    onSelectItem(item.key);
  }

  const rangeLabel = view === "Semana" ? formatWeekRange(anchor) : view === "Mês" ? formatMonthYear(anchor) : "Próximos eventos";

  return (
    <section className="grid gap-3 rounded-lg border border-white/10 bg-brand-charcoal p-3 shadow-soft ring-1 ring-white/5 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-white/10 bg-white/5" role="tablist" aria-label="Visão do calendário">
          {calendarViews.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={view === item}
              onClick={() => onViewChange(item)}
              className={`min-h-10 px-4 text-sm font-black transition ${
                view === item ? "bg-aqua-300 text-navy-950" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => step(-1)}
            disabled={view === "Lista"}
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-40 px-2 text-center text-sm font-black text-white">{rangeLabel}</span>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => step(1)}
            disabled={view === "Lista"}
            aria-label="Próximo"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button
          type="button"
          className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10"
          onClick={() => {
            onAnchorChange(today);
            onSelectDate(today);
          }}
        >
          Hoje
        </button>

        <label className="relative min-w-52 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input !min-h-10 pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar evento, local ou profissional..."
          />
        </label>

        <button
          type="button"
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition ${
            statusFilter !== "Todos" || showFilters
              ? "border-aqua-300/60 bg-aqua-300/10 text-aqua-300"
              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
          }`}
          onClick={() => setShowFilters((current) => !current)}
          aria-expanded={showFilters}
        >
          <Filter size={16} /> Filtros{statusFilter !== "Todos" ? `: ${statusFilter}` : ""}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          <span className="px-2 text-xs font-black uppercase text-slate-400">Situação</span>
          {statusFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onStatusFilterChange(item)}
              className={`min-h-9 rounded-lg px-3 text-xs font-black transition ${
                statusFilter === item ? "bg-aqua-300 text-navy-950" : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {view === "Semana" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7 gap-1.5">
            {weekDates(anchor).map((date, index) => {
              const dayItems = itemsByDate.get(date) ?? [];
              const isToday = date === today;
              const isSelected = date === selectedDate;
              return (
                <div key={date} className="grid content-start gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    className={`flex items-baseline justify-center gap-1.5 rounded-md border py-1 transition ${
                      isSelected ? "border-aqua-300 bg-aqua-300/10" : "border-transparent hover:bg-white/5"
                    }`}
                    aria-label={`Selecionar ${date}`}
                  >
                    <span className={`text-[0.66rem] font-black ${isToday ? "text-aqua-300" : "text-slate-400"}`}>{WEEKDAYS[index]}</span>
                    <strong className={`text-base ${isToday ? "text-aqua-300" : "text-white"}`}>{parseISODate(date).getDate()}</strong>
                  </button>

                  {dayItems.map((item) => (
                    <WeekCard key={item.key} item={item} selected={item.key === selectedItemKey} onClick={() => pick(item)} />
                  ))}

                  {dayItems.length === 0 && (
                    <button
                      type="button"
                      onClick={() => onAddOnDate(date)}
                      disabled={disabled}
                      title="Adicionar evento neste dia"
                      aria-label="Adicionar evento"
                      className="grid h-7 place-items-center rounded-md border border-dashed border-white/15 text-slate-500 transition hover:border-aqua-300/60 hover:text-aqua-300 disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "Mês" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1 text-center text-[0.7rem] font-black text-slate-400">
                {day}
              </span>
            ))}
            {monthGrid(anchor).map((date) => {
              const dayItems = itemsByDate.get(date) ?? [];
              const inMonth = parseISODate(date).getMonth() === parseISODate(anchor).getMonth();
              const isToday = date === today;
              const isSelected = date === selectedDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    onSelectDate(date);
                    if (dayItems[0]) onSelectItem(dayItems[0].key);
                  }}
                  className={`grid min-h-[4.25rem] content-start gap-0.5 rounded-md border p-1 text-left transition ${
                    isSelected ? "border-aqua-300 bg-aqua-300/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <strong className={`text-sm ${isToday ? "text-aqua-300" : "text-white"}`}>{parseISODate(date).getDate()}</strong>
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.key}
                      className="truncate rounded border-l-4 bg-black/20 px-1.5 py-0.5 text-[0.68rem] font-bold text-slate-600"
                      style={{ borderLeftColor: accentFor(item.title) }}
                    >
                      {item.title}
                    </span>
                  ))}
                  {dayItems.length > 2 && <span className="text-[0.68rem] font-black text-slate-400">+{dayItems.length - 2} mais</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "Lista" && <ListView items={items} today={today} selectedItemKey={selectedItemKey} onPick={pick} />}
    </section>
  );
}

function WeekCard({ item, selected, onClick }: { item: CalendarItem; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${item.title} · ${item.startsAt} – ${item.endsAt}${item.place ? ` · ${item.place}` : ""}`}
      className={`grid gap-0.5 rounded-md border border-l-[3px] bg-white/5 px-2 py-1.5 text-left transition hover:bg-white/10 ${
        selected ? "border-aqua-300 ring-1 ring-aqua-300/60" : "border-white/10"
      }`}
      style={{ borderLeftColor: selected ? undefined : accentFor(item.title) }}
    >
      <strong className="truncate text-xs leading-tight text-white">{item.title}</strong>
      <span className="text-[0.68rem] font-semibold text-slate-400">
        {item.startsAt} – {item.endsAt}
      </span>
      <span className="flex items-center gap-1 text-[0.68rem] font-black text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATE_DOT[item.state] }} />
        {item.filled}/{item.slots} · {stateLabel(item)}
      </span>
    </button>
  );
}

function ListView({
  items,
  today,
  selectedItemKey,
  onPick
}: {
  items: CalendarItem[];
  today: string;
  selectedItemKey: string;
  onPick: (item: CalendarItem) => void;
}) {
  const upcoming = items.filter((item) => item.date >= today);
  if (upcoming.length === 0) {
    return <EmptyState title="Nenhum evento à frente" text="Crie uma escala ou publique uma vaga para vê-la aqui." />;
  }

  return (
    <div className="grid gap-2">
      {upcoming.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onPick(item)}
          className={`grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-lg border border-l-4 bg-white/5 p-3 text-left transition hover:bg-white/10 ${
            item.key === selectedItemKey ? "border-aqua-300" : "border-white/10"
          }`}
          style={{ borderLeftColor: item.key === selectedItemKey ? undefined : accentFor(item.title) }}
        >
          <span className="grid text-center">
            <strong className="text-xl text-white">{parseISODate(item.date).getDate()}</strong>
            <span className="text-[0.7rem] font-black uppercase text-slate-400">
              {parseISODate(item.date).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
            </span>
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm text-white">{item.title}</strong>
            <span className="block truncate text-xs font-semibold text-slate-400">
              {item.startsAt} – {item.endsAt}
              {item.place ? ` · ${item.place}` : ""}
            </span>
          </span>
          <span className="flex flex-col items-end gap-1 text-xs font-black text-slate-600">
            <span>
              {item.filled}/{item.slots}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: STATE_DOT[item.state] }} /> {stateLabel(item)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
