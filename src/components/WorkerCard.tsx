import { Award, CheckCircle2, Heart, MapPin, Star } from "lucide-react";
import { useAppStore } from "../lib/store";
import { calculateReliability, getCompatibilityLabel, getExperienceLabel, getFunctionExperience } from "../lib/rules";
import type { JobFunction, WorkerProfile } from "../lib/types";

export function WorkerCard({
  worker,
  showActions = true,
  functionFocus
}: {
  worker: WorkerProfile;
  showActions?: boolean;
  functionFocus?: JobFunction;
}) {
  const { state, toggleFavorite, updateApplicationStatus } = useAppStore();
  const favorite = state.favoriteWorkerIds.includes(worker.id);
  const reliability = calculateReliability(worker);
  const pendingApplication = state.applications.find((application) => application.workerId === worker.id && application.status !== "Aprovada");
  const focusedExperience = functionFocus ? getFunctionExperience(worker, functionFocus) : null;
  const visibleExperiences = functionFocus
    ? focusedExperience
      ? [focusedExperience]
      : []
    : worker.functions.map((item) => getFunctionExperience(worker, item)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <article className="card grid gap-4 p-4">
      <div className="flex gap-3">
        <img src={worker.avatarUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-navy-950">{worker.name}</h3>
            {worker.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-aqua-700">
                <CheckCircle2 size={14} /> Verificado
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-600">{worker.functions.join(", ")}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={15} /> {worker.neighborhood} - até {worker.maxDistanceKm} km
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {functionFocus && (
          <span className={`badge ${focusedExperience?.verified ? "bg-aqua-100 text-aqua-700" : ""}`}>
            <Award size={14} /> {getCompatibilityLabel(worker, functionFocus)}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          {visibleExperiences.slice(0, 4).map((experience) => (
            <span key={experience.function} className="badge">
              {experience.function}: {getExperienceLabel(experience.level)}
              {experience.acceptsAssistant ? " + auxiliar" : ""}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">{worker.description}</p>

      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <span className="rounded-lg bg-slate-50 p-2">
          <strong className="block text-navy-950">{worker.rating.toFixed(1)}</strong>
          <span className="flex items-center gap-1 text-slate-500">
            <Star size={14} /> nota
          </span>
        </span>
        <span className="rounded-lg bg-slate-50 p-2">
          <strong className="block text-navy-950">{worker.completedJobs}</strong>
          <span className="text-slate-500">trabalhos</span>
        </span>
        <span className="rounded-lg bg-slate-50 p-2">
          <strong className="block text-navy-950">{worker.attendanceRate}%</strong>
          <span className="text-slate-500">comparecimento</span>
        </span>
        <span className="rounded-lg bg-aqua-100 p-2">
          <strong className="block text-navy-950">{reliability}%</strong>
          <span className="text-slate-600">confiabilidade</span>
        </span>
      </div>

      {showActions && (
        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => alert(`Perfil de ${worker.name} aberto para análise.`)} className="secondary">
            Ver perfil
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingApplication) {
                const result = updateApplicationStatus(pendingApplication.id, "Aprovada");
                alert(result.message);
              } else {
                alert("Este profissional não possui candidatura pendente nesta demonstração.");
              }
            }}
            className="primary"
          >
            Aprovar
          </button>
          <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
            <Heart size={17} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Favorito" : "Favoritar"}
          </button>
        </div>
      )}
    </article>
  );
}
