import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
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
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { StatusBadge, StatusLegend } from "../components/StatusBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime, getWhatsAppUrl } from "../lib/format";
import type { Application } from "../lib/types";

const cancelableStatuses: Application["status"][] = ["Enviada", "Em análise"];
const filters = ["Todas", "Ativas", "Aprovadas", "Finalizadas"] as const;

export function ApplicationsPage() {
  const { state, currentWorker, updateApplicationStatus, respondToInvite } = useAppStore();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todas");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const applications = state.applications
    .filter((application) => application.workerId === currentWorker.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const filteredApplications = applications.filter((application) => matchesFilter(application, filter));
  const stats = {
    total: applications.length,
    waiting: applications.filter(
      (application) => application.status === "Enviada" || application.status === "Em análise" || application.status === "Convidada"
    ).length,
    approved: applications.filter((application) => application.status === "Aprovada").length,
    completed: applications.filter((application) => application.status === "Trabalho concluído").length,
    unlockedJobs: applications.filter((application) => state.subscription.unlockedJobIds.includes(application.jobId)).length
  };

  function confirmCancelApplication() {
    if (!confirmCancelId) return;
    const result = updateApplicationStatus(confirmCancelId, "Cancelada");
    setMessage(result.message);
    setConfirmCancelId(null);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Candidaturas"
        title="Candidaturas enviadas"
        description="Acompanhe cada vaga, veja próximos passos e acesse o contato quando for aprovado."
      />
      <StatusLegend type="application" />
      {message && <div className="mb-4 mt-3 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {applications.length === 0 ? (
        <EmptyState title="Nenhuma candidatura enviada" text="Busque vagas disponíveis e envie sua primeira candidatura." />
      ) : (
        <div className="grid gap-4">
          <section className="mb-4 grid gap-4 rounded-lg border border-white/10 bg-brand-charcoal p-4 shadow-soft ring-1 ring-white/5">
            <div className="worker-hero-metrics">
              <StatTile variant="primary" icon={<ClipboardCheck size={19} />} label="enviadas" value={stats.total} />
              <StatTile tone={stats.waiting > 0 ? "alert" : "normal"} icon={<Clock3 size={19} />} label="aguardando" value={stats.waiting} />
              <StatTile tone="positive" icon={<UserCheck size={19} />} label="aprovadas" value={stats.approved} />
              <StatTile icon={<CreditCard size={19} />} label="vagas liberadas" value={stats.unlockedJobs} />
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
            const contactUnlocked = application.status === "Aprovada" || application.status === "Trabalho concluído";
            const canCancel = cancelableStatuses.includes(application.status);
            const isPendingInvite = application.status === "Convidada";
            if (!job) return null;

            return (
              <article key={application.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <StatusBadge type="application" status={application.status} />
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm text-slate-600">
                      {company?.establishmentName} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(application.createdAt)}</p>
                  </div>
                  <div className="worker-next-step">
                    <small>Próxima etapa</small>
                    <strong>{getNextStep(application)}</strong>
                    <span>{getStatusDescription(application.status, contactUnlocked)}</span>
                  </div>
                </div>

                {isPendingInvite && (
                  <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50/10 p-3">
                    <p className="text-sm font-semibold text-slate-600">
                      {company?.establishmentName} te convidou diretamente para esta vaga. Aceite para confirmar sua presença ou recuse se não puder.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        className="company-action company-action-danger"
                        onClick={() => setMessage(respondToInvite(application.id, false).message)}
                      >
                        <XCircle size={17} /> Recusar convite
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => setMessage(respondToInvite(application.id, true).message)}
                      >
                        <CheckCircle2 size={17} /> Aceitar convite
                      </button>
                    </div>
                  </div>
                )}

                <div className="worker-info-grid">
                  <Info icon={<CalendarDays size={16} />} label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
                  <Info icon={<MapPin size={16} />} label="Local" value={contactUnlocked ? job.fullAddress : job.approximateAddress} />
                  <Info icon={<BriefcaseBusiness size={16} />} label="Pagamento" value={job.paymentMethod} />
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
                    {!isPendingInvite && (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(application.id)}
                        disabled={!canCancel}
                        className="company-action company-action-danger"
                      >
                        <XCircle size={17} /> {canCancel ? "Cancelar" : "Cancelamento bloqueado"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmCancelId && (
        <Modal title="Cancelar candidatura?" onClose={() => setConfirmCancelId(null)}>
          <p className="text-sm leading-6 text-slate-600">
            Essa ação avisa a empresa e remove você da seleção desta vaga.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" className="secondary" onClick={() => setConfirmCancelId(null)}>
              Voltar
            </button>
            <button type="button" className="danger" onClick={confirmCancelApplication}>
              Cancelar candidatura
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function getNextStep(application: Application) {
  if (application.status === "Enviada") return "Aguardando análise da empresa";
  if (application.status === "Em análise") return "Empresa analisando seu perfil";
  if (application.status === "Convidada") return "Aceite ou recuse o convite da empresa";
  if (application.status === "Convite recusado") return "Você recusou este convite";
  if (application.status === "Aprovada") return "Aprovado: combine detalhes com a empresa";
  if (application.status === "Trabalho concluído") return "Serviço concluído";
  if (application.status === "Falta registrada") return "Falta registrada pela empresa";
  if (application.status === "Cancelada") return "Candidatura cancelada";
  return "Candidatura recusada";
}

function matchesFilter(application: Application, filter: (typeof filters)[number]) {
  if (filter === "Ativas") return application.status === "Enviada" || application.status === "Em análise" || application.status === "Convidada";
  if (filter === "Aprovadas") return application.status === "Aprovada";
  if (filter === "Finalizadas") {
    return ["Trabalho concluído", "Recusada", "Cancelada", "Falta registrada", "Convite recusado"].includes(application.status);
  }
  return true;
}

function getStatusDescription(status: Application["status"], contactUnlocked: boolean) {
  if (status === "Enviada") return "A empresa recebeu sua candidatura e ainda não abriu a decisão.";
  if (status === "Em análise") return "Seu perfil está em avaliação pela empresa.";
  if (status === "Convidada") return "A empresa te convidou diretamente para esta vaga. Aceite ou recuse abaixo.";
  if (status === "Convite recusado") return "Você recusou este convite. A empresa foi avisada.";
  if (status === "Aprovada") return contactUnlocked ? "Contato liberado. Combine os detalhes do turno." : "Aprovação registrada. Aguarde liberação dos dados.";
  if (status === "Trabalho concluído") return "Turno finalizado e salvo no histórico.";
  if (status === "Falta registrada") return "A empresa registrou ausência neste turno.";
  if (status === "Cancelada") return "Esta candidatura foi encerrada e não segue mais na seleção.";
  return "A empresa escolheu seguir com outros profissionais.";
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
