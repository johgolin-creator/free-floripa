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
  Star,
  UserCheck,
  WalletCards
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { ShiftReceipt } from "../components/ShiftReceipt";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime, getWhatsAppUrl } from "../lib/format";
import { getShiftVerificationCode } from "../lib/shiftVerification";
import type { Application, CompanyProfile, Job, WorkShift } from "../lib/types";

const tabs = ["Próximos", "Em andamento", "Concluídos", "Ocorrências"] as const;
const ratingOptions = [5, 4, 3, 2, 1];

type WorkItem = {
  application: Application;
  job: Job;
  shift: WorkShift | undefined;
};

type ReceiptItem = WorkItem & {
  company: CompanyProfile;
};

export function MyJobsPage() {
  const { state, currentWorker, addCompanyReview, checkIn, checkOut } = useAppStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Próximos");
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [receiptItem, setReceiptItem] = useState<ReceiptItem | null>(null);
  const [companyReviewItem, setCompanyReviewItem] = useState<ReceiptItem | null>(null);
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
  const actionItems = workItems
    .filter(
      (item) =>
        item.shift?.status === "Fez check-in" ||
        item.shift?.status === "Finalizou o turno" ||
        (item.application.status === "Aprovada" && item.shift?.status === "Ainda não chegou")
    )
    .sort((a, b) => {
      const priorityA = getActionPriority(a.application, a.shift);
      const priorityB = getActionPriority(b.application, b.shift);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return `${a.job.date} ${a.job.startsAt}`.localeCompare(`${b.job.date} ${b.job.startsAt}`);
    })
    .slice(0, 3);
  const agendaStats = {
    next: workItems.filter((item) => item.application.status === "Aprovada" && item.shift?.status === "Ainda não chegou").length,
    active: workItems.filter((item) => item.shift?.status === "Fez check-in").length,
    done: workItems.filter((item) => item.application.status === "Trabalho concluído" || item.shift?.status === "Finalizou o turno").length,
    issues: workItems.filter((item) => item.application.status === "Cancelada" || item.application.status === "Falta registrada").length
  };

  function doCheckIn(item: WorkItem) {
    if (state.adminModeration.blockedWorkerIds.includes(currentWorker.id) || state.adminModeration.blockedCompanyIds.includes(item.job.companyId)) {
      setMessage("Check-in bloqueado enquanto o perfil passa por revisão de segurança.");
      return;
    }
    checkIn(item.job.id, currentWorker.id);
    setMessage(`Check-in registrado para ${item.job.title}.`);
  }

  function doCheckOut(item: WorkItem) {
    if (state.adminModeration.blockedWorkerIds.includes(currentWorker.id) || state.adminModeration.blockedCompanyIds.includes(item.job.companyId)) {
      setMessage("Check-out bloqueado enquanto o perfil passa por revisão de segurança.");
      return;
    }
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

      <SafetyNotice title="Presença segura">
        Faça check-in somente ao chegar no local combinado e registre o check-out no fim do turno. Use o chat para manter endereço, uniforme e pagamento documentados.
      </SafetyNotice>

      {actionItems.length > 0 && (
        <section className="candidate-selector-panel mb-4 border-aqua-200 bg-aqua-50/70">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Clock size={18} /> Ações rápidas
            </div>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Atalhos para os turnos que precisam de check-in, check-out ou acompanhamento imediato.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {actionItems.map((item) => {
              const { application, job, shift } = item;
              const company = state.companies.find((companyItem) => companyItem.id === job.companyId);
              const checkedIn = shift?.status === "Fez check-in";
              const waiting = application.status === "Aprovada" && shift?.status === "Ainda não chegou";
              const verificationCode = getShiftVerificationCode(job.id, application.workerId);
              const blockedAction =
                state.adminModeration.blockedWorkerIds.includes(currentWorker.id) ||
                state.adminModeration.blockedCompanyIds.includes(job.companyId);

              return (
                <article key={application.id} className="rounded-lg border border-white/10 bg-brand-dark p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{job.title}</strong>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        {company?.establishmentName ?? "Empresa"} - {formatDate(job.date)} - {job.startsAt}
                      </p>
                      <span className={getStatusClass(application, shift)}>{getWorkStatus(application, shift)}</span>
                      <span className="mt-2 inline-flex rounded-full bg-aqua-50 px-2 py-1 text-xs font-black text-aqua-700">
                        Código {verificationCode}
                      </span>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-950 text-aqua-300">
                      {checkedIn ? <LogOut size={17} /> : <LogIn size={17} />}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {waiting && (
                      <button type="button" onClick={() => doCheckIn(item)} disabled={blockedAction} className="primary w-full">
                        <LogIn size={17} /> Fazer check-in
                      </button>
                    )}
                    {checkedIn && (
                      <button type="button" onClick={() => doCheckOut(item)} disabled={blockedAction} className="primary w-full">
                        <LogOut size={17} /> Fazer check-out
                      </button>
                    )}
                    {!waiting && !checkedIn && (
                      <button type="button" onClick={() => setSelectedItem(item)} className="secondary w-full">
                        <Clock size={17} /> Ver detalhes
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

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
            const blockedAction = state.adminModeration.blockedWorkerIds.includes(currentWorker.id) || state.adminModeration.blockedCompanyIds.includes(job.companyId);
            const alreadyReviewedCompany = state.companyReviews.some((review) => review.applicationId === application.id && review.workerId === currentWorker.id);
            const verificationCode = getShiftVerificationCode(job.id, application.workerId);

            return (
              <article key={application.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={getStatusClass(application, shift)}>{getWorkStatus(application, shift)}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatCurrency(job.dailyValue)}</span>
                      <span className="badge bg-aqua-50 text-aqua-700">Código {verificationCode}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {company?.establishmentName ?? "Empresa"} - {job.neighborhood} - {formatDate(job.date)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{getGuidance(application, shift)}</p>
                  </div>
                  <div className="worker-action-row">
                    {waiting && (
                      <button type="button" onClick={() => doCheckIn(item)} disabled={blockedAction} className="company-action company-action-primary">
                        <LogIn size={17} /> Check-in
                      </button>
                    )}
                    {checkedIn && (
                      <button type="button" onClick={() => doCheckOut(item)} disabled={blockedAction} className="company-action company-action-primary">
                        <LogOut size={17} /> Check-out
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedItem(item)} className="company-action">
                      <Clock size={17} /> Detalhes
                    </button>
                    {done && company && (
                      <button type="button" onClick={() => setReceiptItem({ ...item, company })} className="company-action">
                        <ClipboardCheck size={17} /> Comprovante
                      </button>
                    )}
                    {done && company && (
                      <button type="button" onClick={() => setCompanyReviewItem({ ...item, company })} disabled={alreadyReviewedCompany} className="company-action">
                        <Star size={17} /> {alreadyReviewedCompany ? "Empresa avaliada" : "Avaliar empresa"}
                      </button>
                    )}
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
            <Info label="Código de presença" value={getShiftVerificationCode(selectedItem.job.id, selectedItem.application.workerId)} />
            <Info label="Status" value={getWorkStatus(selectedItem.application, selectedItem.shift)} icon={<CheckCircle2 size={16} />} />
          </div>
        </Modal>
      )}

      {receiptItem && (
        <Modal title="Comprovante do turno" onClose={() => setReceiptItem(null)}>
          <ShiftReceipt
            application={receiptItem.application}
            job={receiptItem.job}
            worker={currentWorker}
            company={receiptItem.company}
            shift={receiptItem.shift}
            review={currentWorker.reviews.find(
              (review) => review.jobId === receiptItem.job.id && review.applicationId === receiptItem.application.id
            )}
          />
        </Modal>
      )}

      {companyReviewItem && (
        <Modal title={`Avaliar ${companyReviewItem.company.establishmentName}`} onClose={() => setCompanyReviewItem(null)}>
          <CompanyReviewForm
            onSubmit={(review) => {
              const result = addCompanyReview(companyReviewItem.company.id, {
                workerId: currentWorker.id,
                workerName: currentWorker.name,
                rating: review.rating,
                comment: review.comment,
                jobId: companyReviewItem.job.id,
                applicationId: companyReviewItem.application.id
              });
              setMessage(result.message);
              if (result.ok) setCompanyReviewItem(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CompanyReviewForm({ onSubmit }: { onSubmit: (review: { rating: number; comment: string }) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const rating = Number(form.get("rating"));
        const comment = String(form.get("comment") || "").trim();

        if (!rating || !comment) {
          setError("Informe a nota e um comentário sobre a empresa.");
          return;
        }

        setError("");
        onSubmit({ rating, comment });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-3">
        <div className="flex items-center gap-2 text-sm font-black text-white">
          <Star size={17} /> Avaliação da empresa
        </div>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Avalie comunicação, pagamento combinado, organização do turno, endereço e respeito com a equipe.
        </p>
      </div>
      <label className="label">
        Nota geral
        <select name="rating" className="input" required defaultValue="5">
          {ratingOptions.map((score) => (
            <option key={score} value={score}>
              {score} estrela{score > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="label">
        Comentário
        <textarea name="comment" className="input min-h-24 py-3" required placeholder="Ex.: pagamento conforme combinado, equipe bem organizada e local correto." />
      </label>
      <button type="submit" className="primary">
        <Star size={17} /> Salvar avaliação
      </button>
    </form>
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

function getActionPriority(application: Application, shift: WorkShift | undefined) {
  if (shift?.status === "Fez check-in") return 1;
  if (shift?.status === "Finalizou o turno") return 2;
  if (application.status === "Aprovada") return 3;
  return 4;
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
