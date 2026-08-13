import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  UserCheck,
  XCircle
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime, getWhatsAppUrl } from "../lib/format";
import type { Application, Job, WorkShift } from "../lib/types";

const cancelableStatuses: Application["status"][] = ["Enviada", "Em análise"];
const filters = ["Todas", "Ativas", "Aprovadas", "Finalizadas"] as const;

export function ApplicationsPage() {
  const { state, currentWorker, updateApplicationStatus } = useAppStore();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todas");
  const applications = state.applications
    .filter((application) => application.workerId === currentWorker.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const filteredApplications = applications.filter((application) => matchesFilter(application, filter));
  const stats = {
    total: applications.length,
    waiting: applications.filter((application) => application.status === "Enviada" || application.status === "Em análise").length,
    approved: applications.filter((application) => application.status === "Aprovada").length,
    completed: applications.filter((application) => application.status === "Trabalho concluído").length,
    unlockedJobs: applications.filter((application) => state.subscription.unlockedJobIds.includes(application.jobId)).length
  };

  function cancelApplication(application: Application) {
    if (!window.confirm("Cancelar esta candidatura? Essa ação avisa a empresa e remove você da seleção desta vaga.")) return;
    const result = updateApplicationStatus(application.id, "Cancelada");
    setMessage(result.message);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Candidaturas"
        title="Candidaturas enviadas"
        description="Acompanhe cada vaga, veja próximos passos e acesse o contato quando for aprovado."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {applications.length === 0 ? (
        <EmptyState title="Nenhuma candidatura enviada" text="Busque vagas disponíveis e envie sua primeira candidatura." />
      ) : (
        <div className="grid gap-4">
          <section className="worker-hero">
            <div>
              <span className="section-eyebrow">Sua busca por trabalho</span>
              <h2>Cada candidatura com status e próximo passo claro</h2>
              <p>
                Veja quais empresas ainda estão analisando, quais turnos foram aprovados e onde o contato já está liberado.
              </p>
            </div>
            <div className="worker-hero-metrics">
              <HeroMetric icon={<ClipboardCheck size={19} />} label="enviadas" value={String(stats.total)} />
              <HeroMetric icon={<Clock3 size={19} />} label="aguardando" value={String(stats.waiting)} />
              <HeroMetric icon={<UserCheck size={19} />} label="aprovadas" value={String(stats.approved)} />
              <HeroMetric icon={<CreditCard size={19} />} label="vagas liberadas" value={String(stats.unlockedJobs)} />
            </div>
          </section>

          <section className="worker-filter-panel">
            <div className="worker-filter-summary">
              <div>
                <strong>Saldo atual: {state.subscription.creditsRemaining} moeda(s)</strong>
                <span>A moeda libera a vaga completa. Depois disso, a candidatura naquela vaga não cobra de novo.</span>
              </div>
              <Link to="/app/planos" className="secondary min-h-10">
                Comprar moedas
              </Link>
            </div>
            <div className="worker-filter-buttons">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`worker-filter-button ${filter === item ? "is-active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {filteredApplications.length === 0 ? (
            <EmptyState title="Nada neste filtro" text="Troque o filtro para acompanhar outras candidaturas." />
          ) : filteredApplications.map((application) => {
            const job = state.jobs.find((item) => item.id === application.jobId);
            const company = state.companies.find((item) => item.id === job?.companyId);
            const shift = state.shifts.find((item) => item.jobId === job?.id && item.workerId === currentWorker.id);
            const contactUnlocked = application.status === "Aprovada" || application.status === "Trabalho concluído";
            const canCancel = cancelableStatuses.includes(application.status);
            if (!job) return null;

            return (
              <article key={application.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={getStatusClass(application.status)}>{application.status}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                      <span className="badge bg-aqua-50 text-aqua-700"><CreditCard size={14} /> Vaga liberada</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm text-slate-600">
                      {company?.establishmentName} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(application.createdAt)}</p>
                  </div>
                  <div className="worker-next-step">
                    <small>Próxima etapa</small>
                    <strong>{getNextStep(application, shift)}</strong>
                    <span>{getStatusDescription(application.status, contactUnlocked)}</span>
                  </div>
                </div>

                <ApplicationFlow application={application} shift={shift} />

                <div className="worker-info-grid">
                  <Info icon={<CalendarDays size={16} />} label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
                  <Info icon={<MapPin size={16} />} label="Local" value={contactUnlocked ? job.fullAddress : job.approximateAddress} />
                  <Info icon={<BriefcaseBusiness size={16} />} label="Pagamento" value={job.paymentMethod} />
                  <Info icon={<CreditCard size={16} />} label="Acesso" value="Vaga liberada" />
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                  {contactUnlocked && company ? (
                    <div className="worker-contact-panel">
                      <span className="flex items-center gap-1.5"><Phone size={15} /> {company.phone}</span>
                      <a
                        className="inline-flex items-center gap-1.5 font-black text-aqua-700"
                        href={getWhatsAppUrl(company.phone, `Olá, sou ${currentWorker.name}. Minha candidatura para ${job.title} foi aprovada.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={15} /> WhatsApp
                      </a>
                    </div>
                  ) : (
                    <div className="worker-locked-note">
                      <Lock size={16} /> Contato liberado após aprovação.
                    </div>
                  )}
                  <div className="worker-action-row">
                    <Link to={`/app/vagas/${job.id}`} className="company-action">
                      Ver detalhes
                    </Link>
                    <button
                      type="button"
                      onClick={() => cancelApplication(application)}
                      disabled={!canCancel}
                      className="company-action company-action-danger"
                    >
                      <XCircle size={17} /> {canCancel ? "Cancelar" : "Cancelamento bloqueado"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApplicationFlow({ application, shift }: { application: Application; shift?: WorkShift }) {
  const steps = getApplicationSteps(application, shift);

  return (
    <div className="worker-flow">
      <div className="worker-step-grid">
        {steps.map((step) => (
          <span key={step.label} className={`worker-step ${getStepClass(step.state)}`}>
            <span className="block text-[0.65rem] uppercase text-slate-500">{step.kicker}</span>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type StepState = "done" | "current" | "pending" | "blocked";
type ApplicationStep = { kicker: string; label: string; state: StepState };

function getApplicationSteps(application: Application, shift: WorkShift | undefined): ApplicationStep[] {
  const approved = application.status === "Aprovada" || application.status === "Trabalho concluído";
  const completed = application.status === "Trabalho concluído";
  const rejected = application.status === "Recusada" || application.status === "Cancelada";
  const absence = application.status === "Falta registrada";
  const checkedIn = shift?.status === "Fez check-in" || shift?.status === "Finalizou o turno" || completed;

  return [
    { kicker: "1", label: "Candidatura enviada", state: "done" },
    {
      kicker: "2",
      label: approved ? "Aprovado" : rejected ? "Encerrada" : "Aguardando resposta",
      state: approved ? "done" : rejected ? "blocked" : "current"
    },
    {
      kicker: "3",
      label: checkedIn ? "Presença registrada" : absence ? "Falta registrada" : "Check-in no dia",
      state: checkedIn ? "done" : absence ? "blocked" : approved ? "current" : "pending"
    },
    {
      kicker: "4",
      label: completed ? "Serviço concluído" : "Finalizar turno",
      state: completed ? "done" : checkedIn ? "current" : "pending"
    },
    {
      kicker: "5",
      label: completed ? "Aguardar avaliação" : "Histórico",
      state: completed ? "current" : "pending"
    }
  ];
}

function getNextStep(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Enviada") return "Aguardando análise da empresa";
  if (application.status === "Em análise") return "Empresa analisando seu perfil";
  if (application.status === "Aprovada") {
    if (shift?.status === "Fez check-in") return "Trabalhando: finalize no fim do turno";
    return "Aprovado: combine detalhes com a empresa";
  }
  if (application.status === "Trabalho concluído") return "Serviço concluído";
  if (application.status === "Falta registrada") return "Falta registrada pela empresa";
  if (application.status === "Cancelada") return "Candidatura cancelada";
  return "Candidatura recusada";
}

function matchesFilter(application: Application, filter: (typeof filters)[number]) {
  if (filter === "Ativas") return application.status === "Enviada" || application.status === "Em análise";
  if (filter === "Aprovadas") return application.status === "Aprovada";
  if (filter === "Finalizadas") {
    return ["Trabalho concluído", "Recusada", "Cancelada", "Falta registrada"].includes(application.status);
  }
  return true;
}

function getStatusDescription(status: Application["status"], contactUnlocked: boolean) {
  if (status === "Enviada") return "A empresa recebeu sua candidatura e ainda não abriu a decisão.";
  if (status === "Em análise") return "Seu perfil está em avaliação pela empresa.";
  if (status === "Aprovada") return contactUnlocked ? "Contato liberado. Combine os detalhes do turno." : "Aprovação registrada. Aguarde liberação dos dados.";
  if (status === "Trabalho concluído") return "Turno finalizado e salvo no histórico.";
  if (status === "Falta registrada") return "A empresa registrou ausência neste turno.";
  if (status === "Cancelada") return "Esta candidatura foi encerrada e não segue mais na seleção.";
  return "A empresa escolheu seguir com outros profissionais.";
}

function getStatusClass(status: Application["status"]) {
  if (status === "Aprovada" || status === "Trabalho concluído") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Recusada" || status === "Cancelada" || status === "Falta registrada") return "badge bg-red-50 text-alert";
  return "badge";
}

function getStepClass(state: StepState) {
  if (state === "done") return "border-aqua-200 bg-aqua-100 text-aqua-700";
  if (state === "current") return "border-navy-200 bg-white text-navy-950";
  if (state === "blocked") return "border-red-100 bg-red-50 text-alert";
  return "border-slate-200 bg-brand-charcoal text-slate-500";
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="worker-info-tile">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-white">{value}</strong>
    </div>
  );
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="worker-hero-metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}
