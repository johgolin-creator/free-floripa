import { useCallback } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardCheck,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { Feed } from "../components/Feed";
import { JobCard } from "../components/JobCard";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { TermHint } from "../components/TermHint";
import { useAppStore } from "../lib/store";
import { calculateReliability, isJobOpenForApplications } from "../lib/rules";
import { buildWorkerFeed, type FeedTab } from "../lib/feed";
import { formatDate } from "../lib/format";

export function WorkerDashboard() {
  const { state, currentWorker } = useAppStore();
  const reliability = calculateReliability(currentWorker);
  const applications = state.applications.filter((application) => application.workerId === currentWorker.id);
  const openJobs = state.jobs.filter(isJobOpenForApplications);
  const urgentJobs = openJobs.filter((job) => job.urgent).slice(0, 2);
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
  const buildItems = useCallback((tab: FeedTab) => buildWorkerFeed(state, currentWorker, tab), [state, currentWorker]);

  return (
    <div className="grid gap-5">
      {/* No celular o cabeçalho do AppLayout já cumprimenta; o feed sobe. */}
      <div className="hidden md:block">
      <SectionHeader
        eyebrow="Início"
        title={`Olá, ${currentWorker.name.split(" ")[0]}`}
        description="Vagas, avaliações e conquistas da galera do PONT em Florianópolis."
        action={<Link to="/app/vagas" className="primary">Buscar vagas</Link>}
      />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          variant="primary"
          icon={<BadgeCheck />}
          label={<TermHint term="confiabilidade">Índice de confiabilidade</TermHint>}
          value={`${reliability}%`}
        />
        <StatTile icon={<Star />} label="Avaliação" value={currentWorker.rating.toFixed(1)} />
      </div>

      <section className={`smart-dashboard-hero ${nextWork ? "" : "hidden md:block"}`}>
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
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Feed
          tabs={["Para você", "Vagas", "Novidades"]}
          buildItems={buildItems}
          emptyText={{
            "Para você": "Ainda não há vagas abertas nem novidades. Volte daqui a pouco!",
            Vagas: "Nenhuma vaga aberta agora. Ative as notificações para saber quando surgir uma.",
            Novidades: "Avaliações e conquistas aparecem aqui conforme os turnos acontecem."
          }}
        />

        <aside className="hidden content-start gap-4 xl:grid">
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
            <div className="stagger-list grid gap-3">
              {urgentJobs.map((job) => (
                <JobCard key={job.id} job={job} compact />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
