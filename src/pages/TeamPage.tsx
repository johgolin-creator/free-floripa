import { RotateCcw } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { useAppStore } from "../lib/store";

export function TeamPage() {
  const { state } = useAppStore();
  const favorites = state.workers.filter((worker) => state.favoriteWorkerIds.includes(worker.id));
  const hiredIds = state.applications.filter((application) => application.status === "Aprovada").map((application) => application.workerId);
  const hired = state.workers.filter((worker) => hiredIds.includes(worker.id));
  const team = [...new Map([...favorites, ...hired].map((worker) => [worker.id, worker])).values()];

  return (
    <div>
      <SectionHeader eyebrow="Minha equipe" title="Favoritos e contratados" description="Convide novamente profissionais salvos ou já contratados." />
      {team.length === 0 ? (
        <EmptyState title="Nenhum profissional salvo" text="Favorite candidatos para montar sua base de confiança." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {team.map((worker) => (
            <div key={worker.id} className="grid gap-2">
              <WorkerCard worker={worker} showActions={false} />
              <button type="button" onClick={() => alert(`Convite interno criado para ${worker.name}. Escolha uma vaga aberta para enviar.`)} className="primary">
                <RotateCcw size={17} /> Convidar novamente
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
