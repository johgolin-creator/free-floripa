import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Filter, Heart, MapPin, Search, Star, UserCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { functions, neighborhoods } from "../data/demoData";
import { formatCurrency, formatDate } from "../lib/format";
import { useAppStore } from "../lib/store";
import { calculateReliability, getFunctionExperience, getOpenSlots, isJobOpenForApplications } from "../lib/rules";
import type { Job, JobFunction, Neighborhood, WorkerProfile } from "../lib/types";

const demoWorkerIds = new Set(["worker-1", "worker-2", "worker-3", "worker-4"]);
const ratingOptions = [4.8, 4.5, 4, 3.5];
const WORKERS_PAGE_SIZE = 20;

export function ProfessionalBankPage() {
  const { state, currentCompany, toggleFavorite, inviteWorkerToJob } = useAppStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [functionFilter, setFunctionFilter] = useState<JobFunction | "Todas">("Todas");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<Neighborhood | "Todos">("Todos");
  const [minRating, setMinRating] = useState("Todas");
  const [workerToInvite, setWorkerToInvite] = useState<WorkerProfile | null>(null);
  const [visibleCount, setVisibleCount] = useState(WORKERS_PAGE_SIZE);
  const [message, setMessage] = useState("");

  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const blockedWorkerCount = state.workers.filter(
    (worker) => !demoWorkerIds.has(worker.id) && state.adminModeration.blockedWorkerIds.includes(worker.id)
  ).length;
  const realWorkers = useMemo(
    () => state.workers.filter((worker) => !demoWorkerIds.has(worker.id) && !state.adminModeration.blockedWorkerIds.includes(worker.id)),
    [state.adminModeration.blockedWorkerIds, state.workers]
  );
  const openJobs = state.jobs.filter((job) => job.companyId === currentCompany.id && isJobOpenForApplications(job));
  const favoriteCount = realWorkers.filter((worker) => state.favoriteWorkerIds.includes(worker.id)).length;
  const verifiedCount = realWorkers.filter((worker) => worker.verified).length;

  const filteredWorkers = realWorkers.filter((worker) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      worker.name.toLowerCase().includes(search) ||
      worker.functions.some((item) => item.toLowerCase().includes(search));
    const matchesFunction = functionFilter === "Todas" || Boolean(getFunctionExperience(worker, functionFilter));
    const matchesNeighborhood = neighborhoodFilter === "Todos" || worker.neighborhood === neighborhoodFilter;
    const matchesRating = minRating === "Todas" || worker.rating >= Number(minRating);

    return matchesSearch && matchesFunction && matchesNeighborhood && matchesRating;
  });
  const visibleWorkers = filteredWorkers.slice(0, visibleCount);
  const hasMoreWorkers = visibleCount < filteredWorkers.length;

  useEffect(() => {
    setVisibleCount(WORKERS_PAGE_SIZE);
  }, [searchTerm, functionFilter, neighborhoodFilter, minRating]);

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Banco de profissionais"
        title="Encontre freelancers reais"
        description="Busque por função, bairro e avaliação para salvar bons perfis e convidar para vagas abertas."
        action={
          <Link to="/app/minhas-vagas" className="primary min-h-11 px-4">
            <BriefcaseBusiness size={17} /> Criar vaga
          </Link>
        }
      />

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <SafetyNotice title="Banco protegido" tone={companyBlocked ? "warning" : "info"}>
        {companyBlocked
          ? "Sua empresa está em revisão pela administração. Convites ficam pausados até a liberação."
          : blockedWorkerCount > 0
            ? `${blockedWorkerCount} perfil em revisão foi removido da busca para proteger suas contratações.`
            : "Perfis em revisão ficam fora da busca e convites são bloqueados quando houver risco de segurança."}
      </SafetyNotice>

      <section className="grid gap-3 md:grid-cols-3">
        <Metric icon={<UsersRound size={21} />} label="Profissionais disponíveis" value={realWorkers.length} />
        <Metric icon={<UserCheck size={21} />} label="Perfis verificados" value={verifiedCount} />
        <Metric icon={<Heart size={21} />} label="Favoritos salvos" value={favoriteCount} />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-navy-950">
          <Filter size={17} /> Filtros de busca
        </div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
          <label className="label">
            Buscar
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input pl-10"
                placeholder="Nome, e-mail ou função"
              />
            </span>
          </label>
          <label className="label">
            Função
            <select value={functionFilter} onChange={(event) => setFunctionFilter(event.target.value as JobFunction | "Todas")} className="input">
              <option>Todas</option>
              {functions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Bairro
            <select value={neighborhoodFilter} onChange={(event) => setNeighborhoodFilter(event.target.value as Neighborhood | "Todos")} className="input">
              <option>Todos</option>
              {neighborhoods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Nota mínima
            <select value={minRating} onChange={(event) => setMinRating(event.target.value)} className="input">
              <option>Todas</option>
              {ratingOptions.map((rating) => (
                <option key={rating} value={rating}>
                  {rating.toFixed(1)}+
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {realWorkers.length === 0 ? (
        <EmptyState
          title="Nenhum profissional real cadastrado"
          text="Quando trabalhadores criarem conta e completarem o perfil, eles aparecerão aqui para a empresa filtrar, favoritar e convidar."
        />
      ) : filteredWorkers.length === 0 ? (
        <EmptyState title="Nenhum profissional encontrado" text="Ajuste os filtros para ampliar a busca no banco de profissionais." />
      ) : (
        <div className="grid gap-4">
          <section className="grid gap-4 xl:grid-cols-2">
            {visibleWorkers.map((worker) => {
              const favorite = state.favoriteWorkerIds.includes(worker.id);
              return (
                <div key={worker.id} className="grid gap-2">
                  <WorkerCard worker={worker} showActions={false} functionFocus={functionFilter === "Todas" ? undefined : functionFilter} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
                      <Heart size={17} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Remover favorito" : "Salvar favorito"}
                    </button>
                    <button type="button" onClick={() => setWorkerToInvite(worker)} disabled={openJobs.length === 0 || companyBlocked} className="primary">
                      <UserCheck size={17} /> Convidar para vaga
                    </button>
                  </div>
                  {openJobs.length === 0 && (
                    <p className="text-xs font-semibold text-slate-500">Crie uma vaga publicada com saldo disponível para convidar profissionais.</p>
                  )}
                </div>
              );
            })}
          </section>
          {hasMoreWorkers && (
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => Math.min(current + WORKERS_PAGE_SIZE, filteredWorkers.length))}
                className="secondary min-h-11 px-5"
              >
                Carregar mais profissionais
              </button>
              <span className="text-xs font-bold text-slate-500">
                Mostrando {visibleWorkers.length} de {filteredWorkers.length} profissionais encontrados.
              </span>
            </div>
          )}
        </div>
      )}

      {workerToInvite && (
        <Modal title={`Convidar ${workerToInvite.name}`} onClose={() => setWorkerToInvite(null)}>
          <InviteForm
            jobs={openJobs}
            worker={workerToInvite}
            onSubmit={(jobId) => {
              const result = inviteWorkerToJob(workerToInvite.id, jobId);
              if (result.ok) setWorkerToInvite(null);
              setMessage(result.message);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return (
    <article className="card p-4">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <strong className="block text-2xl font-black text-navy-950">{value}</strong>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
    </article>
  );
}

function InviteForm({ jobs, worker, onSubmit }: { jobs: Job[]; worker: WorkerProfile; onSubmit: (jobId: string) => void }) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? "");
  const [error, setError] = useState("");
  const selectedJob = jobs.find((job) => job.id === selectedJobId);
  const reliability = calculateReliability(worker);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selectedJobId) {
          setError("Selecione uma vaga aberta para enviar o convite.");
          return;
        }
        setError("");
        onSubmit(selectedJobId);
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="grid gap-3 rounded-lg border border-aqua-100 bg-aqua-50 p-3 md:grid-cols-[auto_1fr]">
        <img src={worker.avatarUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
        <div>
          <strong className="block text-navy-950">{worker.name}</strong>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <MapPin size={15} /> {worker.neighborhood} - {worker.functions.join(", ")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <Star size={15} /> {worker.rating.toFixed(1)} de nota - {reliability}% de confiabilidade
          </p>
        </div>
      </div>

      <label className="label">
        Vaga aberta
        <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)} className="input" required>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} - {formatDate(job.date)} - {getOpenSlots(job)} vaga{getOpenSlots(job) > 1 ? "s" : ""} - {formatCurrency(job.dailyValue)}
            </option>
          ))}
        </select>
      </label>

      {selectedJob && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
          <strong className="block text-navy-950">{selectedJob.function}</strong>
          {selectedJob.neighborhood} - {selectedJob.startsAt} às {selectedJob.endsAt}. O convite confirma o profissional nesta vaga e cria o turno.
        </div>
      )}

      <button type="submit" className="primary">
        <UserCheck size={17} /> Confirmar convite
      </button>
    </form>
  );
}
