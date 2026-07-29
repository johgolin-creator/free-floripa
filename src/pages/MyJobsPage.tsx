import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shirt,
  UserCheck,
  WalletCards
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime, getWhatsAppUrl } from "../lib/format";
import type { Application, Job, WorkShift } from "../lib/types";

const tabs = ["Próximos", "Em andamento", "Concluídos", "Ocorrências"] as const;

type WorkItem = {
  application: Application;
  job: Job;
  shift: WorkShift | undefined;
};

export function MyJobsPage() {
  const { state, currentWorker, checkIn, checkOut } = useAppStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Próximos");
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [message, setMessage] = useState("");

  const workItems = useMemo(
    () =>
      state.applications
        .filter((application) =>
          application.workerId === currentWorker.id &&
          ["Aprovada", "Trabalho concluído", "Falta registrada", "Cancelada"].includes(application.status)
        )
        .map((application) => {
          const job = state.jobs.find((item) => item.id === application.jobId);
          if (!job) return null;
          const shift = state.shifts.find((item) => item.jobId === job.id && item.workerId === currentWorker.id);
          return { application, job, shift };
        })
        .filter((item): item is WorkItem => Boolean(item))
        .sort((a, b) => `${a.job.date} ${a.job.startsAt}`.localeCompare(`${b.job.date} ${b.job.startsAt}`)),
    [currentWorker.id, state.applications, state.jobs, state.shifts]
  );

  const filtered = workItems.filter((item) => {
    if (tab === "Próximos") return item.application.status === "Aprovada" && item.shift?.status === "Ainda não chegou";
    if (tab === "Em andamento") return item.shift?.status === "Fez check-in";
    if (tab === "Concluídos") return item.application.status === "Trabalho concluído" || item.shift?.status === "Finalizou o turno";
    return item.application.status === "Cancelada" || item.application.status === "Falta registrada";
  });
  const agendaStats = {
    next: workItems.filter((item) => item.application.status === "Aprovada" && item.shift?.status === "Ainda não chegou").length,
    active: workItems.filter((item) => item.shift?.status === "Fez check-in").length,
    done: workItems.filter((item) => item.application.status === "Trabalho concluído" || item.shift?.status === "Finalizou o turno").length,
    issues: workItems.filter((item) => item.application.status === "Cancelada" || item.application.status === "Falta registrada").length
  };

  function doCheckIn(item: WorkItem) {
    checkIn(item.job.id, currentWorker.id);
    setMessage(`Check-in registrado para ${item.job.title}.`);
  }

  function doCheckOut(item: WorkItem) {
    checkOut(item.job.id, currentWorker.id);
    setMessage("Check-out registrado. A empresa ainda pode concluir e avaliar o serviço.");
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Meus trabalhos"
        title="Agenda de turnos"
        description="Acompanhe seus turnos confirmados, registre presença e confira os detalhes combinados."
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="worker-hero">
        <div>
          <span className="section-eyebrow">Agenda do freelancer</span>
          <h2>Turnos confirmados com ação rápida no dia do serviço</h2>
          <p>
            Veja próximos trabalhos, faça check-in, registre check-out e consulte endereço, uniforme e contato da empresa.
          </p>
        </div>
        <div className="worker-hero-metrics">
          <HeroMetric icon={<CalendarDays size={19} />} label="próximos" value={String(agendaStats.next)} />
          <HeroMetric icon={<Clock size={19} />} label="em andamento" value={String(agendaStats.active)} />
          <HeroMetric icon={<ClipboardCheck size={19} />} label="concluídos" value={String(agendaStats.done)} />
          <HeroMetric icon={<UserCheck size={19} />} label="ocorrências" value={String(agendaStats.issues)} />
        </div>
      </section>

      <div className="worker-filter-buttons mb-4">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`worker-filter-button ${tab === item ? "is-active" : ""}`}>
            {item}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum trabalho nesta aba" text="Quando houver turnos nesse status, eles aparecerão aqui." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const { application, job, shift } = item;
            const company = state.companies.find((companyItem) => companyItem.id === job.companyId);
            const checkedIn = shift?.status === "Fez check-in";
            const waiting = application.status === "Aprovada" && shift?.status === "Ainda não chegou";
            const done = application.status === "Trabalho concluído" || shift?.status === "Finalizou o turno";

            return (
              <article key={application.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={getStatusClass(application, shift)}>{getWorkStatus(application, shift)}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {company?.establishmentName ?? "Empresa"} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{getGuidance(application, shift)}</p>
                  </div>
                  <div className="worker-action-row">
                    {waiting && (
                      <button type="button" onClick={() => doCheckIn(item)} className="company-action company-action-primary">
                        <LogIn size={17} /> Check-in
                      </button>
                    )}
                    {checkedIn && (
                      <button type="button" onClick={() => doCheckOut(item)} className="company-action company-action-primary">
                        <LogOut size={17} /> Check-out
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedItem(item)} className="company-action">
                      <Clock size={17} /> Detalhes
                    </button>
                  </div>
                </div>

                <div className="worker-info-grid">
                  <Info icon={<CalendarDays size={16} />} label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
                  <Info icon={<MapPin size={16} />} label="Endereço" value={waiting ? job.approximateAddress : job.fullAddress} />
                  <Info icon={<Shirt size={16} />} label="Uniforme" value={job.uniform} />
                </div>

                {company && application.status !== "Cancelada" && (
                  <div className="worker-contact-panel md:grid-cols-[1fr_auto]">
                    <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5"><Phone size={15} /> {company.phone}</span>
                      <span className="flex items-center gap-1.5"><Mail size={15} /> {company.email}</span>
                    </div>
                    <a
                      className="company-action company-action-primary"
                      href={getWhatsAppUrl(company.phone, `Olá, sou ${currentWorker.name}. Estou confirmado no turno ${job.title}.`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={17} /> WhatsApp
                    </a>
                  </div>
                )}

                <div className="grid gap-1 text-xs font-semibold text-slate-500">
                  {shift?.checkinAt && <span>Check-in: {formatDateTime(shift.checkinAt)}</span>}
                  {shift?.checkoutAt && <span>Check-out: {formatDateTime(shift.checkoutAt)}</span>}
                  {done && application.status !== "Trabalho concluído" && <span>Aguardando encerramento final pela empresa.</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedItem && (
        <Modal title={selectedItem.job.title} onClose={() => setSelectedItem(null)}>
          <div className="grid gap-3 text-sm text-slate-600">
            <Info label="Data e horário" value={`${formatDate(selectedItem.job.date)} - ${selectedItem.job.startsAt} às ${selectedItem.job.endsAt}`} />
            <Info label="Valor" value={formatCurrency(selectedItem.job.dailyValue)} icon={<WalletCards size={16} />} />
            <Info label="Endereço aproximado" value={selectedItem.job.approximateAddress} />
            <Info label="Endereço completo" value={selectedItem.job.fullAddress} />
            <Info label="Uniforme" value={selectedItem.job.uniform} />
            <Info label="Benefícios" value={selectedItem.job.benefits.join(", ")} />
            <Info label="Status" value={getWorkStatus(selectedItem.application, selectedItem.shift)} icon={<CheckCircle2 size={16} />} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function getWorkStatus(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Falta registrada") return "Falta registrada";
  if (application.status === "Cancelada") return "Cancelado";
  if (application.status === "Trabalho concluído") return "Concluído";
  if (shift?.status === "Finalizou o turno") return "Check-out feito";
  if (shift?.status === "Fez check-in") return "Em andamento";
  return "Confirmado";
}

function getGuidance(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Falta registrada") return "A empresa registrou falta para este turno.";
  if (application.status === "Cancelada") return "Este compromisso foi cancelado.";
  if (application.status === "Trabalho concluído") return "Serviço concluído e pronto para histórico.";
  if (shift?.status === "Finalizou o turno") return "Check-out feito. Aguarde a conclusão da empresa.";
  if (shift?.status === "Fez check-in") return "Turno em andamento. Faça check-out ao finalizar.";
  return "Turno confirmado. No dia combinado, registre o check-in.";
}

function getStatusClass(application: Application, shift: WorkShift | undefined) {
  if (application.status === "Falta registrada" || application.status === "Cancelada") return "badge bg-red-50 text-alert";
  if (application.status === "Trabalho concluído" || shift?.status === "Finalizou o turno") return "badge bg-aqua-100 text-aqua-700";
  if (shift?.status === "Fez check-in") return "badge bg-navy-950 text-white";
  return "badge";
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="worker-info-tile">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
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
