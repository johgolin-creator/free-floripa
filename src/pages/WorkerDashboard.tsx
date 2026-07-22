import { useState } from "react";
import { BadgeCheck, CalendarCheck, ClipboardList, CreditCard, Star, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { JobCard } from "../components/JobCard";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { calculateReliability } from "../lib/rules";
import { formatDate } from "../lib/format";

export function WorkerDashboard() {
  const { state, currentWorker, subscribeProfessional, buyCredits } = useAppStore();
  const [message, setMessage] = useState("");
  const reliability = calculateReliability(currentWorker);
  const applications = state.applications.filter((application) => application.workerId === currentWorker.id);
  const urgentJobs = state.jobs.filter((job) => job.urgent).slice(0, 2);
  const nearbyJobs = state.jobs.filter((job) => job.distanceKm <= currentWorker.maxDistanceKm).slice(0, 3);

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Início"
        title={`Olá, ${currentWorker.name.split(" ")[0]}`}
        description="Veja vagas recomendadas, candidaturas e seus próximos turnos em Florianópolis."
        action={<Link to="/app/vagas" className="primary">Buscar vagas</Link>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={<ClipboardList />} label="Candidaturas restantes" value={state.subscription.plan === "Profissional" ? "Ilimitadas" : state.subscription.creditsRemaining} />
        <Metric icon={<CreditCard />} label="Plano atual" value={state.subscription.plan} />
        <Metric icon={<Star />} label="Avaliação" value={currentWorker.rating.toFixed(1)} />
        <Metric icon={<BadgeCheck />} label="Índice de confiabilidade" value={`${reliability}%`} />
      </div>

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="card grid gap-4 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <h3 className="font-black text-navy-950">Candidaturas e plano</h3>
          <p className="text-sm text-slate-600">
            Renovação em {formatDate(state.subscription.renewalDate)}. O plano gratuito inclui 5 candidaturas por mês.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            subscribeProfessional();
            setMessage("Plano profissional ativado. Candidaturas ilimitadas liberadas.");
          }}
          className="primary"
        >
          Assinar plano profissional
        </button>
        <button
          type="button"
          onClick={() => {
            buyCredits();
            setMessage("Mais 5 candidaturas foram adicionadas ao seu saldo.");
          }}
          className="secondary"
        >
          Comprar candidaturas
        </button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <SectionHeader eyebrow="Recomendadas" title="Vagas próximas" />
          <div className="grid gap-3">
            {nearbyJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div>
            <SectionHeader eyebrow="Agora" title="Vagas urgentes" />
            <div className="grid gap-3">
              {urgentJobs.map((job) => (
                <JobCard key={job.id} job={job} compact />
              ))}
            </div>
          </div>

          <section className="card p-4">
            <h3 className="mb-3 font-black text-navy-950">Resumo</h3>
            <div className="grid gap-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><ClipboardList size={16} /> {applications.length} candidaturas enviadas</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} /> {applications.filter((item) => item.status === "Aprovada").length} aceitas</span>
              <span className="flex items-center gap-2"><CalendarCheck size={16} /> {state.shifts.filter((shift) => shift.workerId === currentWorker.id).length} próximos trabalhos</span>
              <span className="flex items-center gap-2"><Zap size={16} /> {urgentJobs.length} vagas urgentes abertas</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="card p-4">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <strong className="block text-2xl font-black text-navy-950">{value}</strong>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
    </article>
  );
}
