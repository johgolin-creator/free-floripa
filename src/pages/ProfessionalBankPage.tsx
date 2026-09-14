import { BriefcaseBusiness, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { useAppStore } from "../lib/store";
import { isWorkerVerified } from "../lib/rules";

const demoWorkerIds = new Set(["worker-1", "worker-2", "worker-3", "worker-4"]);

export function ProfessionalBankPage() {
  const { state } = useAppStore();

  const realWorkers = state.workers.filter(
    (worker) => !demoWorkerIds.has(worker.id) && !state.adminModeration.blockedWorkerIds.includes(worker.id)
  );
  const verifiedCount = realWorkers.filter(isWorkerVerified).length;

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Banco de profissionais"
        title="Quantos freelancers estão disponíveis"
        description="Os perfis completos (nome, contato, avaliações) só aparecem depois que o profissional se candidata a uma vaga sua."
        action={
          <Link to="/app/minhas-vagas" className="primary min-h-11 px-4">
            <BriefcaseBusiness size={17} /> Criar vaga
          </Link>
        }
      />

      <section className="grid gap-3 md:grid-cols-2">
        <StatTile variant="primary" icon={<UsersRound size={21} />} label="Profissionais disponíveis" value={realWorkers.length} />
        <StatTile icon={<UserCheck size={21} />} label="Perfis verificados" value={verifiedCount} />
      </section>

      <section className="card grid gap-2 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <ShieldCheck size={18} /> Como conhecer esses profissionais
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Para proteger os dados dos freelancers, a lista completa (nome, foto, contato) não fica aberta para
          navegação. Publique uma vaga e os profissionais compatíveis vão poder se candidatar — aí sim você vê o
          perfil completo de cada um em Candidatos, e pode favoritar ou convidar de novo em Minha equipe.
        </p>
      </section>
    </div>
  );
}
