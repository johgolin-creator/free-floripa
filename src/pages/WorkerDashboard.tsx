import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  MapPin,
  Star,
  WalletCards,
  Zap
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { JobCard } from "../components/JobCard";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { TermHint } from "../components/TermHint";
import { useAppStore } from "../lib/store";
import { calculateReliability, getFunctionExperience, isJobOpenForApplications } from "../lib/rules";
import { formatCurrency, formatDate } from "../lib/format";

export function WorkerDashboard() {
  const { state, currentWorker } = useAppStore();
  const reliability = calculateReliability(currentWorker);
  const applications = state.applications.filter((application) => application.workerId === currentWorker.id);
  const openJobs = state.jobs.filter(isJobOpenForApplications);
  const urgentJobs = openJobs.filter((job) => job.urgent).slice(0, 2);
  const nearbyJobs = openJobs.filter((job) => job.distanceKm <= currentWorker.maxDistanceKm).slice(0, 3);
  const pendingApplications = applications.filter(
    (application) => application.status === "Enviada" || application.status === "Em análise" || application.status === "Convidada"
  );
  const approvedApplications = applications.filter((application) => application.status === "Aprovada");
  const nextWork = approvedApplications
    .map((application) => {
      const job = state.jobs.find((item) => item.id === application.jobId);
      const company = state.companies.find((item) => item.id === job?.companyId);
      return job ? { application, job, company } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => `${a.job.date} ${a.job.startsAt}`.localeCompare(`${b.job.date} ${b.job.startsAt}`))[0];
  const bestMatches = openJobs
    .map((job) => ({ job, score: getWorkerJobScore(job, currentWorker) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Início"
        title={`Olá, ${currentWorker.name.split(" ")[0]}`}
        description="Veja vagas recomendadas, candidaturas e seus próximos turnos em Florianópolis."
        action={<Link to="/app/vagas" className="primary">Buscar vagas</Link>}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatTile
          variant="primary"
          icon={<BadgeCheck />}
          label={<TermHint term="confiabilidade">Índice de confiabilidade</TermHint>}
          value={`${reliability}%`}
        />
        <StatTile icon={<Star />} label="Avaliação" value={currentWorker.rating.toFixed(1)} />
        <StatTile
          icon={<CreditCard />}
          label={<TermHint term="moedas" role="trabalhador">Moedas</TermHint>}
          value={state.subscription.creditsRemaining}
        />
        <StatTile icon={<ClipboardList />} label="Acesso a vagas" value={state.subscription.creditsRemaining > 0 ? "Com moedas" : "Prévia"} />
      </div>

      <section className="smart-dashboard-hero">
        <div>
          <span className="section-eyebrow">Seu próximo passo</span>
          <h2>{nextWork ? `Próximo turno: ${nextWork.job.title}` : "Nenhum turno confirmado agora"}</h2>
          <p>
            {nextWork
              ? `${nextWork.company?.establishmentName ?? "Empresa"} - ${formatDate(nextWork.job.date)} - ${nextWork.job.startsAt} às ${nextWork.job.endsAt}, ${nextWork.job.neighborhood}.`
              : "Busque vagas compatíveis e acompanhe suas candidaturas para receber confirmações."}
          </p>
          <div className="smart-dashboard-actions">
            <Link to="/app/trabalhos" className="company-action company-action-primary"><CalendarCheck size={17} /> Meus turnos</Link>
            <Link to="/app/vagas" className="company-action"><BriefcaseBusiness size={17} /> Buscar vagas</Link>
          </div>
        </div>
        <div className="smart-dashboard-metrics">
          <SmartMetric icon={<Clock3 size={19} />} label="aguardando" value={String(pendingApplications.length)} tone={pendingApplications.length > 0 ? "alert" : "normal"} />
          <SmartMetric icon={<CalendarDays size={19} />} label="confirmados" value={String(approvedApplications.length)} />
          <SmartMetric icon={<Zap size={19} />} label="urgentes" value={String(urgentJobs.length)} />
          <SmartMetric icon={<WalletCards size={19} />} label="melhor diária" value={bestMatches[0] ? formatCurrency(bestMatches[0].job.dailyValue) : "R$ 0"} />
        </div>
      </section>

      <section className="soft-panel grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h3 className="font-black text-white">Acesso profissional</h3>
          <p className="text-sm text-slate-600">
            Saldo atual: {state.subscription.creditsRemaining} moeda(s). O gratuito mostra prévias; a moeda libera a vaga completa antes da candidatura.
          </p>
        </div>
        <Link to="/app/planos" className="primary">Comprar moedas</Link>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <SectionHeader eyebrow="Recomendadas" title="Boas vagas para você" />
          <div className="grid gap-3">
            {bestMatches.map(({ job, score }) => (
              <JobCard key={job.id} job={job} matchLabel={score >= 75 ? "Ótima combinação" : score >= 55 ? "Boa combinação" : "Compatível"} matchScore={score} />
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <section className="smart-panel">
            <div className="smart-panel-head">
              <h3>Candidaturas aguardando</h3>
              <span>{pendingApplications.length}</span>
            </div>
            <div className="grid gap-2">
              {pendingApplications.slice(0, 3).map((application) => {
                const job = state.jobs.find((item) => item.id === application.jobId);
                return (
                  <Link key={application.id} to="/app/candidaturas" className="smart-action-item">
                    <ClipboardCheck size={16} />
                    <span>{job?.title ?? "Vaga"}: {application.status}</span>
                  </Link>
                );
              })}
              {pendingApplications.length === 0 && <p className="smart-empty-text">Nenhuma candidatura esperando resposta agora.</p>}
            </div>
          </section>

          <div>
            <SectionHeader eyebrow="Agora" title="Vagas urgentes" />
            <div className="grid gap-3">
              {urgentJobs.map((job) => (
                <JobCard key={job.id} job={job} compact />
              ))}
            </div>
          </div>

          <section className="card p-4">
            <h3 className="mb-3 font-black text-white">Resumo</h3>
            <div className="grid gap-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><ClipboardList size={16} /> {applications.length} candidaturas enviadas</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} /> {applications.filter((item) => item.status === "Aprovada").length} aceitas</span>
              <span className="flex items-center gap-2"><CalendarCheck size={16} /> {approvedApplications.length} próximos trabalhos</span>
              <span className="flex items-center gap-2"><Zap size={16} /> {urgentJobs.length} vagas urgentes abertas</span>
              <span className="flex items-center gap-2"><MapPin size={16} /> {nearbyJobs.length} vagas dentro da distância</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SmartMetric({
  icon,
  label,
  value,
  tone = "normal"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "alert";
}) {
  return (
    <span className={`smart-dashboard-metric ${tone === "alert" ? "is-alert" : ""}`}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function getWorkerJobScore(job: { function: Parameters<typeof getFunctionExperience>[1]; neighborhood: string; distanceKm: number; urgent: boolean; dailyValue: number }, worker: Parameters<typeof getFunctionExperience>[0]) {
  const experience = getFunctionExperience(worker, job.function);
  return (
    (experience ? 45 : 0) +
    (job.neighborhood === worker.neighborhood ? 18 : job.distanceKm <= worker.maxDistanceKm ? 10 : 0) +
    (job.urgent ? 10 : 0) +
    (job.dailyValue >= 250 ? 10 : 0) +
    (experience?.verified ? 10 : 0) +
    (experience && experience.level !== "Iniciante" ? 7 : 0)
  );
}
