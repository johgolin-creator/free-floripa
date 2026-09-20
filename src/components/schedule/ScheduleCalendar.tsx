import { useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, MapPin, Plus, Search, Users } from "lucide-react";
import { KebabMenu, type MenuAction } from "./KebabMenu";
import { functionLabel } from "../../lib/functionInfo";
import {
  addDays,
  addMonths,
  monthGrid,
  parseISODate,
  weekDates,
  type CalendarItem
} from "../../lib/scheduleEvents";

export type CalendarView = "Semana" | "Mês" | "Lista";
export type StatusFilter = "Todos" | "Com vagas" | "Completos" | "Concluídos";

export const calendarViews: CalendarView[] = ["Semana", "Mês", "Lista"];
export const statusFilters: StatusFilter[] = ["Todos", "Com vagas", "Completos", "Concluídos"];

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

// Cor da faixa lateral de cada evento (a mesma para o mesmo nome).
const ACCENTS = ["#F4B740", "#C8FF38", "#4CA8FF", "#FF8A4C", "#A78BFA", "#34D399"];

function accentFor(title: string) {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

const LIME = "#C8FF38";
const AMBER = "#F4B740";
const RED = "#FF5252";
const GRAY = "#7D8494";

/** Cor de quem ainda falta: nada preenchido = vermelho; parte = laranja; completo = verde. */
function fillColor(item: CalendarItem) {
  if (item.filled >= item.slots) return LIME;
  return item.filled === 0 && item.state !== "concluido" ? RED : AMBER;
}

function dayDotColor(items: CalendarItem[]) {
  if (items.some((item) => item.state === "vagas")) return AMBER;
  if (items.every((item) => item.state === "concluido")) return GRAY;
  return LIME;
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

function dayHeading(date: string) {
  return capitalizeFirst(parseISODate(date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
}

function eventsLabel(count: number) {
  return `${count} evento${count === 1 ? "" : "s"}`;
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
  getCardActions,
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
  getCardActions?: (item: CalendarItem) => MenuAction[];
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

  // O que a lista mostra em cada visão.
  const week = weekDates(anchor);
  let listDates: string[];
  if (view === "Semana") listDates = week.filter((date) => itemsByDate.has(date));
  else if (view === "Mês") listDates = itemsByDate.has(selectedDate) ? [selectedDate] : [];
  else listDates = [...itemsByDate.keys()].filter((date) => date >= today).sort();

  return (
    <section className="grid min-w-0 content-start gap-5">
      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => step(-1)}
            disabled={view === "Lista"}
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex min-h-11 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white">
            <CalendarDays size={16} className="text-slate-300" /> {rangeLabel}
          </div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => step(1)}
            disabled={view === "Lista"}
            aria-label="Próximo"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10"
            onClick={() => {
              onAnchorChange(today);
              onSelectDate(today);
            }}
          >
            Hoje
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Buscar e filtrar"
            aria-label="Filtros"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((current) => !current)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-black transition ${
              statusFilter !== "Todos" || search.trim() || showFilters
                ? "border-aqua-300/60 bg-aqua-300/10 text-aqua-300"
                : "border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            <Filter size={15} /> Filtros{statusFilter !== "Todos" || search.trim() ? " •" : ""}
          </button>
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1" role="tablist" aria-label="Visão do calendário">
            {calendarViews.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={view === item}
                onClick={() => onViewChange(item)}
                className={`min-h-9 rounded-lg px-4 text-sm font-black transition ${
                  view === item ? "border border-aqua-300/70 bg-aqua-300/10 text-aqua-300" : "border border-transparent text-slate-300 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
          <label className="relative min-w-52 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !min-h-10 pl-9"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar evento, local ou profissional..."
              aria-label="Buscar evento, local ou profissional"
            />
          </label>
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

      {/* Semana: um quadradinho por dia, com a contagem de eventos */}
      {view === "Semana" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[600px] grid-cols-7 gap-2.5">
            {week.map((date, index) => {
              const dayItems = itemsByDate.get(date) ?? [];
              const isToday = date === today;
              const isSelected = date === selectedDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  aria-label={`Selecionar ${date}`}
                  aria-pressed={isSelected}
                  className={`grid justify-items-center gap-0.5 rounded-xl border px-2 py-3 transition ${
                    isSelected ? "border-aqua-300 bg-aqua-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className={`text-[0.72rem] font-black ${isToday || isSelected ? "text-aqua-300" : "text-slate-400"}`}>{WEEKDAYS[index]}</span>
                  <strong className={`text-2xl leading-tight ${isToday ? "text-aqua-300" : "text-white"}`}>{parseISODate(date).getDate()}</strong>
                  {dayItems.length > 0 ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ background: dayDotColor(dayItems) }} />
                      {eventsLabel(dayItems.length)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">0 eventos</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mês */}
      {view === "Mês" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
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
                  className={`grid min-h-[4.5rem] content-start gap-1 rounded-xl border p-1.5 text-left transition ${
                    isSelected ? "border-aqua-300 bg-aqua-300/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <strong className={`text-sm ${isToday ? "text-aqua-300" : "text-white"}`}>{parseISODate(date).getDate()}</strong>
                  {dayItems.slice(0, 2).map((item) => (
                    <span
                      key={item.key}
                      className="truncate rounded border-l-[3px] bg-black/20 px-1.5 py-0.5 text-[0.66rem] font-bold text-slate-300"
                      style={{ borderLeftColor: accentFor(item.title) }}
                    >
                      {item.title}
                    </span>
                  ))}
                  {dayItems.length > 2 && <span className="text-[0.66rem] font-black text-slate-400">+{dayItems.length - 2} mais</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de eventos, agrupada por dia */}
      {listDates.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-2xl border border-dashed border-white/15 p-6">
          <div>
            <strong className="text-base text-white">{view === "Lista" ? "Nenhum evento à frente" : "Nenhum evento neste período"}</strong>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {search.trim() || statusFilter !== "Todos"
                ? "Nada corresponde à busca ou ao filtro. Limpe-os para ver todos os eventos."
                : "Escolha outro dia ou crie uma escala."}
            </p>
          </div>
          <button type="button" className="primary" disabled={disabled} onClick={() => onAddOnDate(selectedDate)}>
            <Plus size={17} /> Criar escala neste dia
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {listDates.map((date) => {
            const dayItems = itemsByDate.get(date) ?? [];
            return (
              <div key={date} className="grid gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xl font-black text-white">{dayHeading(date)}</h3>
                  <span className="text-sm font-semibold text-slate-400">{eventsLabel(dayItems.length)}</span>
                </div>
                {dayItems.map((item) => (
                  <EventCard
                    key={item.key}
                    item={item}
                    selected={item.key === selectedItemKey}
                    onSelect={() => pick(item)}
                    actions={getCardActions?.(item) ?? []}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Chip({ children, color, strong }: { children: ReactNode; color?: string; strong?: boolean }) {
  return (
    <span
      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-black"
      style={
        color
          ? { color, borderColor: `${color}55`, background: `${color}1f` }
          : { color: strong ? "#F5F6F8" : "#CBD0D9", borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }
      }
    >
      {children}
    </span>
  );
}

function EventCard({
  item,
  selected,
  onSelect,
  actions
}: {
  item: CalendarItem;
  selected: boolean;
  onSelect: () => void;
  actions: MenuAction[];
}) {
  const color = fillColor(item);
  const missing = Math.max(0, item.slots - item.filled);
  const statusText = item.state === "concluido" ? "Concluído" : missing > 0 ? `${missing} vaga${missing === 1 ? "" : "s"}` : "Completo";
  const statusColor = item.state === "concluido" ? undefined : color;

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={onKey}
      className={`relative grid cursor-pointer grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border bg-white/[0.04] py-4 pl-6 pr-4 text-left transition hover:bg-white/[0.07] ${
        selected ? "border-aqua-300/70 ring-1 ring-aqua-300/40" : "border-white/10"
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl" style={{ background: accentFor(item.title) }} aria-hidden="true" />
      <div className="border-r border-white/10 pr-4 text-center leading-tight">
        <strong className="block text-xl text-white">{item.startsAt}</strong>
        <span className="text-lg font-semibold text-slate-500">{item.endsAt}</span>
      </div>
      <div className="min-w-0">
        <strong className="block truncate text-lg text-white">{item.title}</strong>
        {item.place && (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-slate-400">
            <MapPin size={14} className="shrink-0" /> <span className="truncate">{item.place}</span>
          </span>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip color={color}>
            <Users size={14} /> {item.filled}/{item.slots}
          </Chip>
          <Chip color={statusColor} strong>
            {statusText}
          </Chip>
          {item.functions.map((fn) => (
            <Chip key={fn.function}>
              {functionLabel(fn.function)} <span className="text-slate-400">{fn.slots}</span>
            </Chip>
          ))}
        </div>
      </div>
      <KebabMenu actions={actions} label={`Ações de ${item.title}`} />
    </div>
  );
}
