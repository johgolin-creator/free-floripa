import { useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";

const tabs = ["Próximos", "Em andamento", "Concluídos", "Cancelados"] as const;

export function MyJobsPage() {
  const { state, currentWorker, checkIn, checkOut } = useAppStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Próximos");
  const workerShifts = state.shifts.filter((shift) => shift.workerId === currentWorker.id);

  const filtered = workerShifts.filter((shift) => {
    if (tab === "Próximos") return shift.status === "Ainda não chegou";
    if (tab === "Em andamento") return shift.status === "Fez check-in";
    if (tab === "Concluídos") return shift.status === "Finalizou o turno";
    return false;
  });

  return (
    <div>
      <SectionHeader eyebrow="Meus trabalhos" title="Turnos confirmados" description="Faça check-in e check-out no início e fim de cada turno." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "primary" : "secondary"}>
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum trabalho nesta aba" text="Quando houver turnos nesse status, eles aparecerão aqui." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((shift) => {
            const job = state.jobs.find((item) => item.id === shift.jobId);
            const company = state.companies.find((item) => item.id === job?.companyId);
            if (!job) return null;
            return (
              <article key={shift.id} className="card grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <span className="badge">{shift.status}</span>
                  <h3 className="mt-2 font-black text-navy-950">{company?.establishmentName}</h3>
                  <p className="text-sm text-slate-600">
                    {job.function} - {formatDate(job.date)} - {job.startsAt} às {job.endsAt} - {formatCurrency(job.dailyValue)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Endereço: {shift.status === "Ainda não chegou" ? job.approximateAddress : job.fullAddress}</p>
                  <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-500">
                    {shift.checkinAt && <span>Check-in: {formatDateTime(shift.checkinAt)}</span>}
                    {shift.checkoutAt && <span>Check-out: {formatDateTime(shift.checkoutAt)}</span>}
                  </div>
                </div>
                <div className="grid gap-2">
                  {shift.status === "Ainda não chegou" && (
                    <button type="button" onClick={() => checkIn(job.id, currentWorker.id)} className="primary">
                      <LogIn size={17} /> Fazer check-in
                    </button>
                  )}
                  {shift.status === "Fez check-in" && (
                    <button type="button" onClick={() => checkOut(job.id, currentWorker.id)} className="primary">
                      <LogOut size={17} /> Fazer check-out
                    </button>
                  )}
                  <button type="button" onClick={() => alert("Detalhes do turno exibidos nesta demonstração.")} className="secondary">
                    <Clock size={17} /> Detalhes
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
