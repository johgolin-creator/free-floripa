import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shirt,
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

      <section className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
        <Mini label="próximos" value={String(workItems.filter((item) => item.application.status === "Aprovada" && item.shift?.status === "Ainda não chegou").length)} />
        <Mini label="em andamento" value={String(workItems.filter((item) => item.shift?.status === "Fez check-in").length)} />
        <Mini label="concluídos" value={String(workItems.filter((item) => item.application.status === "Trabalho concluído" || item.shift?.status === "Finalizou o turno").length)} />
        <Mini label="ocorrências" value={String(workItems.filter((item) => item.application.status === "Cancelada" || item.application.status === "Falta registrada").length)} />
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2 md:flex">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "primary" : "secondary"}>
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
              <article key={application.id} className="card grid gap-4 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={getStatusClass(application, shift)}>{getWorkStatus(application, shift)}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                    </div>
                    <h3 className="font-black text-navy-950">{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {company?.establishmentName ?? "Empresa"} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{getGuidance(application, shift)}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:flex">
                    {waiting && (
                      <button type="button" onClick={() => doCheckIn(item)} className="primary">
                        <LogIn size={17} /> Check-in
                      </button>
                    )}
                    {checkedIn && (
                      <button type="button" onClick={() => doCheckOut(item)} className="primary">
                        <LogOut size={17} /> Check-out
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedItem(item)} className="secondary">
                      <Clock size={17} /> Detalhes
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <Info icon={<CalendarDays size={16} />} label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
                  <Info icon={<MapPin size={16} />} label="Endereço" value={waiting ? job.approximateAddress : job.fullAddress} />
                  <Info icon={<Shirt size={16} />} label="Uniforme" value={job.uniform} />
                </div>

                {company && application.status !== "Cancelada" && (
                  <div className="grid gap-2 rounded-lg bg-aqua-100 p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5"><Phone size={15} /> {company.phone}</span>
                      <span className="flex items-center gap-1.5"><Mail size={15} /> {company.email}</span>
                    </div>
                    <a
                      className="primary"
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg bg-white p-3">
      <strong className="block text-lg font-black text-navy-950">{value}</strong>
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    </span>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
