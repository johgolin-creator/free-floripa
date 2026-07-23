import { useMemo, useState } from "react";
import { Filter, RotateCcw } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { JobCard } from "../components/JobCard";
import { SectionHeader } from "../components/SectionHeader";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { isJobOpenForApplications } from "../lib/rules";
import type { JobFunction, Neighborhood } from "../lib/types";

export function JobsPage() {
  const { state } = useAppStore();
  const [functionFilter, setFunctionFilter] = useState<JobFunction | "Todas">("Todas");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<Neighborhood | "Todos">("Todos");
  const [dateFilter, setDateFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);

  const filteredJobs = useMemo(() => {
    return state.jobs.filter((job) => {
      if (!isJobOpenForApplications(job)) return false;
      const byFunction = functionFilter === "Todas" || job.function === functionFilter;
      const byNeighborhood = neighborhoodFilter === "Todos" || job.neighborhood === neighborhoodFilter;
      const byDate = !dateFilter || job.date === dateFilter;
      const byValue = !minValue || job.dailyValue >= Number(minValue);
      const byDistance = !maxDistance || job.distanceKm <= Number(maxDistance);
      const byUrgency = !urgentOnly || job.urgent;
      return byFunction && byNeighborhood && byDate && byValue && byDistance && byUrgency;
    });
  }, [state.jobs, functionFilter, neighborhoodFilter, dateFilter, minValue, maxDistance, urgentOnly]);

  function clearFilters() {
    setFunctionFilter("Todas");
    setNeighborhoodFilter("Todos");
    setDateFilter("");
    setMinValue("");
    setMaxDistance("");
    setUrgentOnly(false);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Vagas"
        title="Turnos e diárias disponíveis"
        description="Filtre por função, bairro, data, valor mínimo, distância e vagas urgentes."
      />

      <section className="card mb-5 grid gap-3 p-4 md:grid-cols-6">
        <label className="label md:col-span-2">
          Função
          <select className="input" value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value as JobFunction | "Todas")}>
            <option>Todas</option>
            {functions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Bairro
          <select className="input" value={neighborhoodFilter} onChange={(event) => setNeighborhoodFilter(event.target.value as Neighborhood | "Todos")}>
            <option>Todos</option>
            {neighborhoods.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Data
          <input className="input" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </label>
        <label className="label">
          Valor mínimo
          <input className="input" type="number" min="0" value={minValue} onChange={(event) => setMinValue(event.target.value)} placeholder="R$" />
        </label>
        <label className="label">
          Distância
          <input className="input" type="number" min="0" value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)} placeholder="km" />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
          <input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} className="h-5 w-5 accent-aqua-500" />
          Mostrar somente vagas urgentes
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4 md:justify-end">
          <button type="button" onClick={clearFilters} className="secondary">
            <RotateCcw size={17} /> Limpar
          </button>
          <span className="badge min-h-11 px-4">
            <Filter size={17} /> {filteredJobs.length} resultados
          </span>
        </div>
      </section>

      {filteredJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga encontrada" text="Ajuste os filtros para visualizar mais oportunidades em Florianópolis." />
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
