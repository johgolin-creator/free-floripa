import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthGrid, parseISODate } from "../../lib/scheduleEvents";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function longDate(date: string) {
  const label = parseISODate(date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Calendário do mês inteiro, com todos os dias à vista: a pessoa toca no dia.
 *  Guarda o valor num <input type="hidden" name=...> para funcionar dentro de <form>.
 *  markedDates: dias que já têm evento (aparece um ponto no dia). */
export function MonthDatePicker({
  name,
  value,
  onChange,
  markedDates,
  today
}: {
  name: string;
  value: string;
  onChange: (date: string) => void;
  markedDates?: ReadonlySet<string>;
  today: string;
}) {
  const [month, setMonth] = useState(value || today);
  const visibleMonth = parseISODate(month).getMonth();
  const monthLabel = parseISODate(month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={17} />
        </button>
        <strong className="text-sm font-black capitalize text-white">{monthLabel}</strong>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          aria-label="Próximo mês"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-[0.68rem] font-black text-slate-400">
            {day}
          </span>
        ))}
        {monthGrid(month).map((date) => {
          const inMonth = parseISODate(date).getMonth() === visibleMonth;
          const selected = date === value;
          const isToday = date === today;
          const marked = markedDates?.has(date) ?? false;
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                onChange(date);
                if (!inMonth) setMonth(date);
              }}
              aria-pressed={selected}
              aria-label={longDate(date)}
              className={`relative grid h-10 place-items-center rounded-lg text-sm font-black transition ${
                selected
                  ? "bg-aqua-300 text-navy-950"
                  : `${inMonth ? "text-white" : "text-slate-500"} hover:bg-white/10 ${isToday ? "ring-1 ring-aqua-300/70" : ""}`
              }`}
            >
              {parseISODate(date).getDate()}
              {marked && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? "bg-navy-950" : "bg-amber-400"}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className={value ? "text-slate-200" : "text-slate-400"}>{value ? longDate(value) : "Toque em um dia para escolher a data."}</span>
        <button
          type="button"
          className="text-aqua-300"
          onClick={() => {
            onChange(today);
            setMonth(today);
          }}
        >
          Hoje
        </button>
      </div>
    </div>
  );
}

