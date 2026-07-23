import { useState } from "react";
import { BriefcaseBusiness, MessageSquareText, RotateCcw, Star } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getOpenSlots } from "../lib/rules";
import type { Job, WorkerProfile } from "../lib/types";

const scoreOptions = [5, 4, 3, 2, 1];
const attendanceOptions = ["Compareceu no horário", "Compareceu com atraso", "Faltou sem aviso", "Cancelou com antecedência"];
const qualityOptions = ["Excelente", "Boa", "Regular", "Abaixo do esperado"];

export function TeamPage() {
  const { state, currentCompany, addReview, inviteWorkerToJob } = useAppStore();
  const [workerToReview, setWorkerToReview] = useState<WorkerProfile | null>(null);
  const [workerToInvite, setWorkerToInvite] = useState<WorkerProfile | null>(null);
  const [message, setMessage] = useState("");
  const favorites = state.workers.filter((worker) => state.favoriteWorkerIds.includes(worker.id));
  const hiredIds = state.applications
    .filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído")
    .map((application) => application.workerId);
  const hired = state.workers.filter((worker) => hiredIds.includes(worker.id));
  const team = [...new Map([...favorites, ...hired].map((worker) => [worker.id, worker])).values()];
  const openJobs = state.jobs.filter((job) => job.companyId === currentCompany.id && getOpenSlots(job) > 0);

  return (
    <div>
      <SectionHeader
        eyebrow="Minha equipe"
        title="Favoritos e contratados"
        description="Convide novamente profissionais salvos e avalie colaboradores depois do turno."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {team.length === 0 ? (
        <EmptyState title="Nenhum profissional salvo" text="Favorite candidatos para montar sua base de confiança." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {team.map((worker) => {
            const wasHired = hiredIds.includes(worker.id);
            return (
              <div key={worker.id} className="grid gap-2">
                <WorkerCard worker={worker} showActions={false} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => setWorkerToInvite(worker)} disabled={openJobs.length === 0} className="primary">
                    <RotateCcw size={17} /> Convidar novamente
                  </button>
                  <button type="button" onClick={() => setWorkerToReview(worker)} disabled={!wasHired} className="secondary">
                    <MessageSquareText size={17} /> Avaliar colaborador
                  </button>
                </div>
                {openJobs.length === 0 && <p className="text-xs font-semibold text-slate-500">Crie uma vaga com saldo disponível para convidar profissionais.</p>}
                {!wasHired && <p className="text-xs font-semibold text-slate-500">A avaliação fica disponível após aprovar o profissional em uma vaga.</p>}
              </div>
            );
          })}
        </div>
      )}

      {workerToReview && (
        <Modal title={`Avaliar ${workerToReview.name}`} onClose={() => setWorkerToReview(null)}>
          <ReviewForm
            onSubmit={(review) => {
              addReview(workerToReview.id, {
                authorName: currentCompany.establishmentName,
                rating: review.rating,
                comment: review.comment
              });
              setWorkerToReview(null);
              setMessage("Avaliação registrada no histórico do colaborador.");
            }}
          />
        </Modal>
      )}

      {workerToInvite && (
        <Modal title={`Convidar ${workerToInvite.name}`} onClose={() => setWorkerToInvite(null)}>
          <InviteForm
            jobs={openJobs}
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

function InviteForm({ jobs, onSubmit }: { jobs: Job[]; onSubmit: (jobId: string) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const jobId = String(form.get("jobId") || "");
        if (!jobId) {
          setError("Selecione uma vaga aberta para enviar o convite.");
          return;
        }
        setError("");
        onSubmit(jobId);
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-sm font-black text-navy-950">
          <BriefcaseBusiness size={17} /> Vaga para confirmação
        </div>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          O profissional será confirmado na vaga escolhida e receberá uma notificação.
        </p>
      </div>
      <label className="label">
        Vaga aberta
        <select name="jobId" className="input" required>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} - {formatDate(job.date)} - {getOpenSlots(job)} vaga{getOpenSlots(job) > 1 ? "s" : ""} - {formatCurrency(job.dailyValue)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="primary">
        <RotateCcw size={17} /> Confirmar convite
      </button>
    </form>
  );
}

function ReviewForm({ onSubmit }: { onSubmit: (review: { rating: number; comment: string }) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid max-h-[72vh] gap-3 overflow-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const rating = Number(form.get("rating"));
        const attendance = String(form.get("attendance") || "").trim();
        const punctuality = String(form.get("punctuality") || "").trim();
        const quality = String(form.get("quality") || "").trim();
        const comment = String(form.get("comment") || "").trim();
        const wouldHireAgain = form.get("wouldHireAgain") === "on";

        if (!rating || !attendance || !punctuality || !quality || !comment) {
          setError("Preencha nota, presença, pontualidade, qualidade e comentário.");
          return;
        }

        setError("");
        onSubmit({
          rating,
          comment: `${comment} Presença: ${attendance}. Pontualidade: ${punctuality}. Qualidade: ${quality}. ${
            wouldHireAgain ? "Contrataria novamente." : "Não contrataria novamente neste momento."
          }`
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-sm font-black text-navy-950">
          <Star size={17} /> Itens obrigatórios da avaliação
        </div>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Nota geral, presença, pontualidade, qualidade do serviço e comentário sobre o turno.
        </p>
      </div>
      <label className="label">
        Nota geral
        <select name="rating" className="input" required defaultValue="5">
          {scoreOptions.map((score) => (
            <option key={score} value={score}>
              {score} estrela{score > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">
          Presença
          <select name="attendance" className="input" required>
            {attendanceOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Pontualidade
          <select name="punctuality" className="input" required>
            <option>No horário</option>
            <option>Atraso leve</option>
            <option>Atraso relevante</option>
            <option>Não cumpriu o horário</option>
          </select>
        </label>
      </div>
      <label className="label">
        Qualidade do serviço
        <select name="quality" className="input" required>
          {qualityOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label className="label">
        Comentário
        <textarea name="comment" className="input min-h-24 py-3" required placeholder="Ex.: atendeu bem os clientes e manteve a praça organizada." />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <input name="wouldHireAgain" type="checkbox" defaultChecked className="h-5 w-5 accent-aqua-500" />
        Contrataria novamente
      </label>
      <button type="submit" className="primary">
        <Star size={17} /> Salvar avaliação
      </button>
    </form>
  );
}
