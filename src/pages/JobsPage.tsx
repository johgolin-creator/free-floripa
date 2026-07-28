import { useMemo, useState } from "react";
import { Filter, Lock, RotateCcw } from "lucide-react";
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
  const [experienceFilter, setExperienceFilter] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const canViewFullJobs = state.subscription.plan === "Profissional";

  const filteredJobs = useMemo(() => {
    const experience = normalizeSearch(experienceFilter);

    return state.jobs
      .filter((job) => {
        if (!isJobOpenForApplications(job)) return false;
        const byFunction = functionFilter === "Todas" || job.function === functionFilter;
        const byNeighborhood = neighborhoodFilter === "Todos" || job.neighborhood === neighborhoodFilter;
        const byDate = !dateFilter || job.date === dateFilter;
        const byValue = !minValue || job.dailyValue >= Number(minValue);
        const byExperience = !experience || normalizeSearch(job.requiredExperience).includes(experience);
        const byUrgency = !urgentOnly || job.urgent;
        return byFunction && byNeighborhood && byDate && byValue && byExperience && byUrgency;
      })
      .sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
        return `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`);
      });
  }, [state.jobs, functionFilter, neighborhoodFilter, dateFilter, minValue, experienceFilter, urgentOnly]);

  const activeFilters = [
    functionFilter !== "Todas" && `Função: ${functionFilter}`,
    neighborhoodFilter !== "Todos" && `Bairro: ${neighborhoodFilter}`,
    dateFilter && `Data: ${dateFilter}`,
    minValue && `Mínimo: R$ ${minValue}`,
    experienceFilter.trim() && `Experiência: ${experienceFilter.trim()}`,
    urgentOnly && "Somente urgentes"
  ].filter((item): item is string => Boolean(item));

  function clearFilters() {
    setFunctionFilter("Todas");
    setNeighborhoodFilter("Todos");
    setDateFilter("");
    setMinValue("");
    setExperienceFilter("");
    setUrgentOnly(false);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Vagas"
        title="Turnos e diárias disponíveis"
        description="Filtre por função, bairro, data, urgência, valor mínimo e experiência exigida."
      />

      {!canViewFullJobs && (
        <section className="mb-5 rounded-lg border border-aqua-200 bg-aqua-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-black text-navy-950">
                <Lock size={18} /> Vaga completa liberada para assinantes
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                No plano gratuito você vê uma prévia. Descrição completa, requisitos, benefícios e candidatura ficam disponíveis no plano profissional.
              </p>
            </div>
            <span className="badge bg-white text-aqua-700">Plano atual: {state.subscription.plan}</span>
          </div>
        </section>
      )}

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
        <label className="label md:col-span-2">
          Experiência exigida
          <input
            className="input"
            value={experienceFilter}
            onChange={(event) => setExperienceFilter(event.target.value)}
            placeholder="Ex.: alto fluxo, drinks, limpeza"
          />
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
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 md:col-span-6">
            {activeFilters.map((item) => (
              <span key={item} className="badge bg-aqua-100 text-aqua-700">
                {item}
              </span>
            ))}
          </div>
        )}
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

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
