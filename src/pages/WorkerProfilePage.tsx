import { BadgeCheck, Edit3, Star } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { calculateReliability, getExperienceLabel, getFunctionExperience } from "../lib/rules";

export function WorkerProfilePage() {
  const { currentWorker } = useAppStore();
  const reliability = calculateReliability(currentWorker);
  const functionExperiences = currentWorker.functions
    .map((item) => getFunctionExperience(currentWorker, item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div>
      <SectionHeader eyebrow="Perfil" title="Perfil do trabalhador" action={<button type="button" onClick={() => alert("Edição simulada do perfil aberta.")} className="primary"><Edit3 size={17} /> Editar perfil</button>} />
      <section className="card overflow-hidden">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="p-5">
          <div className="-mt-16 flex flex-col gap-4 md:flex-row md:items-end">
            <img src={currentWorker.avatarUrl} alt="" className="h-28 w-28 rounded-lg border-4 border-white object-cover shadow-soft" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-navy-950">{currentWorker.name}</h2>
                {currentWorker.verified && <span className="badge bg-aqua-100 text-aqua-700"><BadgeCheck size={15} /> Perfil verificado</span>}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{currentWorker.functions.join(", ")}</p>
            </div>
            <div className="rounded-lg bg-aqua-100 p-4 text-center">
              <strong className="block text-3xl font-black text-navy-950">{reliability}%</strong>
              <span className="text-sm font-bold text-slate-600">Índice de Confiabilidade</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Info label="Bairro" value={currentWorker.neighborhood} />
            <Info label="Distância" value={`até ${currentWorker.maxDistanceKm} km`} />
            <Info label="Nota" value={`${currentWorker.rating.toFixed(1)} estrelas`} />
            <Info label="Trabalhos concluídos" value={String(currentWorker.completedJobs)} />
            <Info label="Comparecimento" value={`${currentWorker.attendanceRate}%`} />
            <Info label="Pontualidade" value={`${currentWorker.punctualityRate}%`} />
            <Info label="Cancelamentos" value={String(currentWorker.cancellations)} />
            <Info label="Transporte próprio" value={currentWorker.hasTransport ? "Sim" : "Não"} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="font-black text-navy-950">Descrição</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{currentWorker.description}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Disponibilidade: {currentWorker.availability}</p>
              <h3 className="mt-5 font-black text-navy-950">Nível por profissão</h3>
              <div className="mt-2 grid gap-2">
                {functionExperiences.map((experience) => (
                  <div key={experience.function} className="rounded-lg bg-slate-50 p-3">
                    <span className="text-xs font-black uppercase text-slate-500">{experience.function}</span>
                    <strong className="mt-1 block text-sm text-navy-950">{getExperienceLabel(experience.level)}</strong>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {experience.months} meses informados
                      {experience.acceptsAssistant ? " - aceita auxiliar" : ""}
                      {experience.verified ? " - verificado" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-black text-navy-950">Avaliações recebidas</h3>
              <div className="mt-2 grid gap-2">
                {currentWorker.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                    <span className="flex items-center gap-1 text-sm font-bold text-navy-950"><Star size={15} /> {review.rating} - {review.authorName}</span>
                    <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
