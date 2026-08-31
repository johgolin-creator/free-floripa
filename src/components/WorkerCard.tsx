import { useState } from "react";
import { AlertTriangle, Award, CheckCircle2, Flag, Heart, MapPin, Star } from "lucide-react";
import { AvatarButton } from "./AvatarButton";
import { Modal } from "./Modal";
import { TermHint } from "./TermHint";
import { useAppStore } from "../lib/store";
import { calculateReliability, getCompatibilityLabel, getExperienceLabel, getFunctionExperience } from "../lib/rules";
import { getTrustBadges } from "../lib/trust";
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
  const { state, submitTrustReport, toggleFavorite, updateApplicationStatus } = useAppStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [message, setMessage] = useState("");
  const favorite = state.favoriteWorkerIds.includes(worker.id);
  const blocked = state.adminModeration.blockedWorkerIds.includes(worker.id);
  const reliability = calculateReliability(worker);
  const trustBadges = getTrustBadges(worker);
  const pendingApplication = state.applications.find((application) => application.workerId === worker.id && application.status !== "Aprovada");
  const focusedExperience = functionFocus ? getFunctionExperience(worker, functionFocus) : null;
  const visibleExperiences = functionFocus
    ? focusedExperience
      ? [focusedExperience]
      : []
    : worker.functions.map((item) => getFunctionExperience(worker, item)).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <article className="card grid gap-4 p-4 hover:border-aqua-200 hover:shadow-lift">
      <div className="flex items-start gap-3">
        <AvatarButton
          src={worker.avatarUrl}
          name={worker.name}
          className="h-16 w-16 rounded-lg object-cover"
          ringClassName="ring-4 ring-aqua-50"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-black text-white">{worker.name}</h3>
            {worker.verified && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-aqua-700">
                <CheckCircle2 size={14} /> Verificado
              </span>
            )}
            {blocked && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-alert">
                <AlertTriangle size={14} /> Em revisão
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
            </span>
          ))}
        </div>
        {trustBadges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
              <span key={badge.label} className={`badge ${badge.tone}`}>
                <Award size={14} /> {badge.label}
              </span>
            ))}
          </div>
        )}
        {(blocked || worker.cancellations >= 3 || worker.attendanceRate < 85) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
            {blocked
              ? "Perfil bloqueado pela administração. Evite aprovar ou convidar até a revisão terminar."
              : "Atenção ao histórico: confirme disponibilidade, horário e chegada antes de aprovar."}
          </div>
        )}
      </div>

      <p className="text-sm leading-6 text-slate-600">{worker.description}</p>

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <span className="metric-tile">
          <strong className="block text-white">{worker.rating.toFixed(1)}</strong>
          <span className="flex items-center gap-1 text-slate-500">
            <Star size={14} /> nota
          </span>
        </span>
        <span className="metric-tile">
          <strong className="block text-white">{worker.completedJobs}</strong>
          <span className="text-slate-500">trabalhos</span>
        </span>
        <span className="metric-tile">
          <strong className="block text-white">{worker.attendanceRate}%</strong>
          <span className="text-slate-500">comparecimento</span>
        </span>
        <span className="metric-tile bg-aqua-50">
          <strong className="block text-white">{reliability}%</strong>
          <span className="text-slate-600"><TermHint term="confiabilidade">confiabilidade</TermHint></span>
        </span>
      </div>

      {showActions && (
        <div className="grid gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => setShowProfile(true)} className="secondary">
            <Award size={17} />
            Ver perfil
          </button>
          <button
            type="button"
            onClick={() => {
              if (pendingApplication) {
                const result = updateApplicationStatus(pendingApplication.id, "Aprovada");
                setMessage(result.message);
              } else {
                setMessage("Este profissional não possui candidatura pendente nesta vaga.");
              }
            }}
            disabled={blocked}
            className="primary"
          >
            <CheckCircle2 size={17} />
            Aprovar
          </button>
          <button type="button" onClick={() => toggleFavorite(worker.id)} className="secondary">
            <Heart size={17} fill={favorite ? "currentColor" : "none"} />
            {favorite ? "Favorito" : "Favoritar"}
          </button>
          <button type="button" onClick={() => setShowReport(true)} className="secondary">
            <Flag size={17} />
            Relatar
          </button>
        </div>
      )}
      {!showActions && (
        <button type="button" onClick={() => setShowReport(true)} className="secondary min-h-10 justify-self-start px-3 text-xs">
          <Flag size={15} /> Relatar profissional
        </button>
      )}

      {showProfile && (
        <Modal title={worker.name} onClose={() => setShowProfile(false)}>
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-slate-600">{worker.experience}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <Info label="Disponibilidade" value={worker.availability} />
              <Info label="Bairro" value={worker.neighborhood} />
              <Info label="Distância" value={`até ${worker.maxDistanceKm} km`} />
              <Info label="Transporte" value={worker.hasTransport ? "Sim" : "Não"} />
              <Info label="Comparecimento" value={`${worker.attendanceRate}%`} />
              <Info label="Pontualidade" value={`${worker.punctualityRate}%`} />
            </div>
            <div className="grid gap-2">
              {worker.reviews.map((review) => (
                <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                  <strong className="text-sm text-white">{review.rating} estrelas - {review.authorName}</strong>
                  <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {showReport && (
        <Modal title={`Relatar ${worker.name}`} onClose={() => setShowReport(false)}>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const result = submitTrustReport({
                targetType: "worker",
                targetId: worker.id,
                targetName: worker.name,
                reason: reportReason
              });
              setMessage(result.message);
              if (result.ok) {
                setReportReason("");
                setShowReport(false);
              }
            }}
          >
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900">
              Use este relato para falta de conduta, dados falsos, ausência combinada ou outro risco para a operação.
            </div>
            <label className="label">
              O que aconteceu?
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="input min-h-28 py-3"
                required
                placeholder="Descreva o problema para a administração revisar."
              />
            </label>
            <button type="submit" className="danger">
              <Flag size={17} /> Enviar relato
            </button>
          </form>
        </Modal>
      )}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-white">{value}</strong>
    </div>
  );
}
