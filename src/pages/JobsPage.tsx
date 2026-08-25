import { useEffect, useMemo, useState } from "react";
import { Filter, Lock, RotateCcw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { JobCard } from "../components/JobCard";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { TermHint } from "../components/TermHint";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { getFunctionExperience, isJobOpenForApplications } from "../lib/rules";
import type { AppState, Job, JobFunction, Neighborhood, WorkerProfile } from "../lib/types";

type SortOption = "Melhor combinação" | "Mais recentes" | "Maior diária" | "Mais próximas" | "Urgentes";

const sortOptions: SortOption[] = ["Melhor combinação", "Mais recentes", "Maior diária", "Mais próximas", "Urgentes"];
const JOBS_PAGE_SIZE = 20;

export function JobsPage() {
  const { state, currentWorker } = useAppStore();
  const [functionFilter, setFunctionFilter] = useState<JobFunction | "Todas">("Todas");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<Neighborhood | "Todos">("Todos");
  const [dateFilter, setDateFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const [trustedCompaniesOnly, setTrustedCompaniesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("Melhor combinação");
  const [visibleCount, setVisibleCount] = useState(JOBS_PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const hasCoins = state.subscription.creditsRemaining > 0;

  const scoredJobs = useMemo(() => {
    const experience = normalizeSearch(experienceFilter);

    return state.jobs
      .map((job) => ({
        job,
        match: getJobMatch(job, currentWorker)
      }))
      .filter((job) => {
        if (!isJobOpenForApplications(job.job)) return false;
        const byFunction = functionFilter === "Todas" || job.job.function === functionFilter;
        const byNeighborhood = neighborhoodFilter === "Todos" || job.job.neighborhood === neighborhoodFilter;
        const byDate = !dateFilter || job.job.date === dateFilter;
        const byValue = !minValue || job.job.dailyValue >= Number(minValue);
        const byExperience = !experience || normalizeSearch(job.job.requiredExperience).includes(experience);
        const byUrgency = !urgentOnly || job.job.urgent;
        const byCompatibility = !compatibleOnly || job.match.compatible;
        const byTrustedCompany = !trustedCompaniesOnly || isTrustedCompanyJob(job.job, state);
        return byFunction && byNeighborhood && byDate && byValue && byExperience && byUrgency && byCompatibility && byTrustedCompany;
      })
      .sort((a, b) => {
        if (sortBy === "Maior diária") return b.job.dailyValue - a.job.dailyValue;
        if (sortBy === "Mais próximas") return a.job.distanceKm - b.job.distanceKm;
        if (sortBy === "Urgentes") {
          if (a.job.urgent !== b.job.urgent) return a.job.urgent ? -1 : 1;
          return `${a.job.date} ${a.job.startsAt}`.localeCompare(`${b.job.date} ${b.job.startsAt}`);
        }
        if (sortBy === "Melhor combinação") {
          if (a.match.score !== b.match.score) return b.match.score - a.match.score;
          if (a.job.urgent !== b.job.urgent) return a.job.urgent ? -1 : 1;
        }
        return `${a.job.date} ${a.job.startsAt}`.localeCompare(`${b.job.date} ${b.job.startsAt}`);
      });
  }, [state, state.jobs, currentWorker, functionFilter, neighborhoodFilter, dateFilter, minValue, experienceFilter, urgentOnly, compatibleOnly, trustedCompaniesOnly, sortBy]);

  const filteredJobs = scoredJobs.map((item) => item.job);
  const visibleScoredJobs = scoredJobs.slice(0, visibleCount);
  const hasMoreJobs = visibleCount < scoredJobs.length;

  const activeFilters = [
    functionFilter !== "Todas" && `Função: ${functionFilter}`,
    neighborhoodFilter !== "Todos" && `Bairro: ${neighborhoodFilter}`,
    dateFilter && `Data: ${dateFilter}`,
    minValue && `Mínimo: R$ ${minValue}`,
    experienceFilter.trim() && `Experiência: ${experienceFilter.trim()}`,
    urgentOnly && "Somente urgentes",
    compatibleOnly && "Boa combinação",
    trustedCompaniesOnly && "Empresas confiáveis",
    sortBy !== "Melhor combinação" && `Ordem: ${sortBy}`
  ].filter((item): item is string => Boolean(item));

  useEffect(() => {
    setVisibleCount(JOBS_PAGE_SIZE);
  }, [functionFilter, neighborhoodFilter, dateFilter, minValue, experienceFilter, urgentOnly, compatibleOnly, trustedCompaniesOnly, sortBy]);

  function clearFilters() {
    setFunctionFilter("Todas");
    setNeighborhoodFilter("Todos");
    setDateFilter("");
    setMinValue("");
    setExperienceFilter("");
    setUrgentOnly(false);
    setCompatibleOnly(false);
    setTrustedCompaniesOnly(false);
    setSortBy("Melhor combinação");
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Vagas"
        title="Turnos e diárias disponíveis"
        description="Filtre por função, bairro, data, urgência, valor mínimo e experiência exigida."
      />

      {!hasCoins && (
        <section className="mb-5 rounded-lg border border-aqua-200 bg-aqua-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-black text-white">
                <Lock size={18} /> Você está sem <TermHint term="moedas" role="trabalhador">moedas</TermHint>
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                Cada candidatura enviada usa 1 moeda. Compre um pacote para continuar se candidatando.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-aqua-50 text-aqua-700">Saldo: {state.subscription.creditsRemaining} moeda(s)</span>
              <Link to="/app/planos" className="primary">Comprar moedas</Link>
            </div>
          </div>
        </section>
      )}

      <section className="jobs-filter-panel">
        <div className="jobs-filter-title">
          <div>
            <h3><Search size={18} /> Buscar oportunidades</h3>
            <p>Use os filtros para encontrar turnos compatíveis e evitar candidaturas fora do seu perfil.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge min-h-11 px-4">
              {filteredJobs.length} resultado{filteredJobs.length === 1 ? "" : "s"}
            </span>
            <button type="button" onClick={() => setShowFilters(true)} className="primary min-h-11 px-4">
              <Filter size={17} /> Filtro
            </button>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="jobs-active-filters">
            {activeFilters.map((item) => (
              <span key={item} className="badge bg-aqua-100 text-aqua-700">
                {item}
              </span>
            ))}
          </div>
        )}
      </section>

      {showFilters && (
        <Modal title="Filtro" onClose={() => setShowFilters(false)}>
          <div className="jobs-filter-grid">
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
            <label className="label">
              Ordenar
              <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                {sortOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
              <input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} className="h-5 w-5 accent-aqua-500" />
              Mostrar somente vagas urgentes
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
              <input type="checkbox" checked={compatibleOnly} onChange={(event) => setCompatibleOnly(event.target.checked)} className="h-5 w-5 accent-aqua-500" />
              Mostrar apenas boa combinação
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 md:col-span-2">
              <input type="checkbox" checked={trustedCompaniesOnly} onChange={(event) => setTrustedCompaniesOnly(event.target.checked)} className="h-5 w-5 accent-aqua-500" />
              Mostrar apenas empresas com boa reputação
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={clearFilters} className="secondary">
              <RotateCcw size={17} /> Limpar
            </button>
            <button type="button" onClick={() => setShowFilters(false)} className="primary">
              Ver {filteredJobs.length} resultado{filteredJobs.length === 1 ? "" : "s"}
            </button>
          </div>
        </Modal>
      )}

      {filteredJobs.length === 0 ? (
        <EmptyState title="Nenhuma vaga encontrada" text="Tente remover um filtro, reduzir o valor mínimo ou desmarcar boa combinação para visualizar mais oportunidades." />
      ) : (
        <div className="grid gap-4">
          {visibleScoredJobs.map(({ job, match }) => (
            <JobCard key={job.id} job={job} matchLabel={match.label} matchScore={match.score} />
          ))}
          {hasMoreJobs && (
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => Math.min(current + JOBS_PAGE_SIZE, scoredJobs.length))}
                className="secondary min-h-11 px-5"
              >
                Carregar mais vagas
              </button>
              <span className="text-xs font-bold text-slate-500">
                Mostrando {visibleScoredJobs.length} de {scoredJobs.length} vagas encontradas.
              </span>
            </div>
          )}
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

function getJobMatch(job: Job, worker: WorkerProfile) {
  const functionExperience = getFunctionExperience(worker, job.function);
  const declaredFunction = Boolean(functionExperience);
  const distanceOk = job.distanceKm <= worker.maxDistanceKm;
  const sameNeighborhood = job.neighborhood === worker.neighborhood;
  const highReliability = worker.attendanceRate >= 90 && worker.punctualityRate >= 90;
  const score =
    (declaredFunction ? 45 : 0) +
    (sameNeighborhood ? 18 : distanceOk ? 10 : 0) +
    (job.urgent ? 8 : 0) +
    (job.dailyValue >= 250 ? 8 : 0) +
    (highReliability ? 6 : 0) +
    (functionExperience?.verified ? 10 : 0) +
    (functionExperience && functionExperience.level !== "Iniciante" ? 5 : 0);

  if (!declaredFunction) return { compatible: false, score, label: "Adicione esta função ao perfil" };
  if (!distanceOk) return { compatible: false, score, label: "Fora da distância definida" };
  if (score >= 80) return { compatible: true, score, label: "Ótima combinação" };
  if (score >= 62) return { compatible: true, score, label: "Boa combinação" };
  return { compatible: true, score, label: "Compatível" };
}

function isTrustedCompanyJob(job: Job, state: AppState) {
  const company = state.companies.find((item) => item.id === job.companyId);
  const hasOpenReport = state.trustReports.some(
    (report) =>
      report.status === "Aberto" &&
      ((report.targetType === "company" && report.targetId === job.companyId) ||
        (report.targetType === "job" && report.targetId === job.id))
  );

  return Boolean(company && company.rating >= 4.5 && !hasOpenReport);
}
