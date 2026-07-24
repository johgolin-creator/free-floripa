import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, CalendarDays, Lock, MapPin, MessageCircle, Phone, XCircle } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime, getWhatsAppUrl } from "../lib/format";
import type { Application, Job, WorkShift } from "../lib/types";

const cancelableStatuses: Application["status"][] = ["Enviada", "Em análise"];

export function ApplicationsPage() {
  const { state, currentWorker, updateApplicationStatus } = useAppStore();
  const [message, setMessage] = useState("");
  const applications = state.applications.filter((application) => application.workerId === currentWorker.id);

  function cancelApplication(application: Application) {
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
        <div className="grid gap-3">
          {applications.map((application) => {
            const job = state.jobs.find((item) => item.id === application.jobId);
            const company = state.companies.find((item) => item.id === job?.companyId);
            const shift = state.shifts.find((item) => item.jobId === job?.id && item.workerId === currentWorker.id);
            const contactUnlocked = application.status === "Aprovada" || application.status === "Trabalho concluído";
            const canCancel = cancelableStatuses.includes(application.status);
            if (!job) return null;

            return (
              <article key={application.id} className="card grid gap-3 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={getStatusClass(application.status)}>{application.status}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                    </div>
                    <h3 className="font-black text-navy-950">{job.title}</h3>
                    <p className="text-sm text-slate-600">
                      {company?.establishmentName} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Enviada em {formatDateTime(application.createdAt)}</p>
                  </div>
                  <strong className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-navy-950">{getNextStep(application, shift)}</strong>
                </div>

                <ApplicationFlow application={application} shift={shift} />

                <div className="grid gap-2 md:grid-cols-3">
                  <Info icon={<CalendarDays size={16} />} label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
                  <Info icon={<MapPin size={16} />} label="Local" value={contactUnlocked ? job.fullAddress : job.approximateAddress} />
                  <Info icon={<BriefcaseBusiness size={16} />} label="Pagamento" value={job.paymentMethod} />
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                  {contactUnlocked && company ? (
                    <div className="flex flex-wrap gap-3 rounded-lg bg-aqua-100 p-3 text-sm font-semibold text-slate-600">
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
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-500">
                      <Lock size={16} /> Contato liberado após aprovação.
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 md:flex">
                    <Link to={`/app/vagas/${job.id}`} className="secondary">
                      Ver detalhes
                    </Link>
                    <button
                      type="button"
                      onClick={() => cancelApplication(application)}
                      disabled={!canCancel}
                      className="danger"
                    >
                      <XCircle size={17} /> Cancelar
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
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3">
      <div className="grid gap-2 md:grid-cols-5">
        {steps.map((step) => (
          <span key={step.label} className={`rounded-lg border p-2 text-xs font-bold ${getStepClass(step.state)}`}>
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

function getStatusClass(status: Application["status"]) {
  if (status === "Aprovada" || status === "Trabalho concluído") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Recusada" || status === "Cancelada" || status === "Falta registrada") return "badge bg-red-50 text-alert";
  return "badge";
}

function getStepClass(state: StepState) {
  if (state === "done") return "border-aqua-200 bg-aqua-100 text-aqua-700";
  if (state === "current") return "border-navy-200 bg-white text-navy-950";
  if (state === "blocked") return "border-red-100 bg-red-50 text-alert";
  return "border-slate-200 bg-white text-slate-500";
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
