import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  Flag,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Users,
  WalletCards,
  XCircle
} from "lucide-react";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { supportEmailUrl, supportWhatsappUrl } from "../lib/support";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getCompatibilityLabel, getExperienceLabel, getFunctionExperience, getJobStatus, getOpenSlots, isJobOpenForApplications } from "../lib/rules";

export function JobDetailsPage() {
  const { id } = useParams();
  const { state, currentWorker, applyToJob, updateApplicationStatus, submitTrustReport } = useAppStore();
  const { email } = useAuth();
  const [message, setMessage] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [showCancelApply, setShowCancelApply] = useState(false);
  const applyingRef = useRef(false);
  const job = state.jobs.find((item) => item.id === id);

  if (!job) return <Navigate to="/app/vagas" replace />;

  const currentJob = job;
  const company = state.companies.find((item) => item.id === currentJob.companyId);
  const application = state.applications.find(
    (item) => item.jobId === currentJob.id && item.workerId === state.selectedWorkerId && item.status !== "Cancelada"
  );
  const companyReviews = state.companyReviews.filter((review) => review.companyId === currentJob.companyId);
  const companyReportCount = state.trustReports.filter(
    (report) =>
      report.status === "Aberto" &&
      ((report.targetType === "company" && report.targetId === currentJob.companyId) ||
        (report.targetType === "job" && report.targetId === currentJob.id))
  ).length;
  const confirmed = application?.status === "Aprovada" || application?.status === "Trabalho concluído";
  const workerExperience = getFunctionExperience(currentWorker, currentJob.function);
  const jobStatus = getJobStatus(currentJob);
  const workerBlocked = state.adminModeration.blockedWorkerIds.includes(currentWorker.id);
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentJob.companyId);
  const canCancelApplication = Boolean(application) && (application?.status === "Enviada" || application?.status === "Em análise");

  function handleApply() {
    if (workerBlocked || companyBlocked) {
      setMessage(workerBlocked ? "Seu perfil está em revisão e não pode enviar candidaturas agora." : "Esta empresa está em revisão e não recebe candidaturas agora.");
      return;
    }
    if (application) {
      setMessage(`Você já se candidatou para esta vaga. Status atual: ${application.status}.`);
      return;
    }
    if (!isJobOpenForApplications(currentJob)) {
      setMessage("Esta vaga não está mais aberta para candidatura.");
      return;
    }
    if (state.subscription.creditsRemaining <= 0) {
      setMessage("Use 1 moeda para se candidatar a esta vaga.");
      setShowPlans(true);
      return;
    }
    setShowApplyConfirm(true);
  }

  function confirmApply() {
    if (applyingRef.current) return;
    applyingRef.current = true;
    setIsApplying(true);
    setShowApplyConfirm(false);

    const result = applyToJob(currentJob.id);
    setMessage(result.message);
    if (result.requiresPlan) setShowPlans(true);
    applyingRef.current = false;
    setIsApplying(false);
  }

  function confirmCancelApplication() {
    if (!application) return;
    const result = updateApplicationStatus(application.id, "Cancelada");
    setMessage(result.message);
    setShowCancelApply(false);
  }

  function submitJobReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = submitTrustReport({
      targetType: "job",
      targetId: currentJob.id,
      targetName: currentJob.title,
      reason: reportReason
    });
    setMessage(result.message);
    if (result.ok) {
      setReportReason("");
      setShowReport(false);
    }
  }

  const plansModal = showPlans ? (
    <Modal title="Comprar moedas" onClose={() => setShowPlans(false)}>
      <div className="job-plan-modal">
        <div>
          <span className="badge bg-aqua-50 text-aqua-700">
            <CreditCard size={15} /> Saldo: {state.subscription.creditsRemaining} moeda(s)
          </span>
          <h3>Você está sem moedas</h3>
          <p>
            Cada candidatura usa 1 moeda. A recarga é feita pelo suporte: combine o pagamento no WhatsApp e a
            equipe do PONT credita as moedas na sua conta.
          </p>
        </div>
        <button
          type="button"
          className="primary w-full"
          onClick={() => {
            const text = `Olá! Quero comprar moedas do PONT.\nConta: ${email || "(informe seu e-mail)"} (trabalhador).`;
            const whatsapp = supportWhatsappUrl(text);
            if (whatsapp) window.open(whatsapp, "_blank", "noopener");
            else window.location.href = supportEmailUrl("Compra de moedas PONT", text);
            setShowPlans(false);
            setMessage("Abrimos o suporte com sua solicitação. As moedas são liberadas após a confirmação do pagamento.");
          }}
        >
          <MessageCircle size={17} /> Comprar pelo WhatsApp
        </button>
        <Link to="/app/planos" onClick={() => setShowPlans(false)} className="secondary">
          Ver os pacotes <ArrowRight size={17} />
        </Link>
      </div>
    </Modal>
  ) : null;
  const applyConfirmModal = showApplyConfirm ? (
    <Modal title="Confirmar candidatura" onClose={() => setShowApplyConfirm(false)}>
      <div className="grid gap-4">
        <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-4">
          <span className="badge bg-aqua-50 text-aqua-700">
            <CreditCard size={15} /> Saldo: {state.subscription.creditsRemaining} moeda(s)
          </span>
          <h3 className="mt-3 text-xl font-black text-white">Enviar candidatura para esta vaga?</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            O envio usa 1 moeda. Depois disso, a empresa poderá analisar seu perfil e responder pela plataforma.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setShowApplyConfirm(false)} className="secondary">Cancelar</button>
          <button type="button" onClick={confirmApply} disabled={isApplying} className="primary">
            {isApplying ? "Enviando..." : "Enviar candidatura"}
          </button>
        </div>
      </div>
    </Modal>
  ) : null;
  const cancelApplyModal = showCancelApply ? (
    <Modal title="Cancelar candidatura?" onClose={() => setShowCancelApply(false)}>
      <p className="text-sm leading-6 text-slate-600">
        Isso avisa a empresa e remove você da seleção desta vaga. Você pode se candidatar de novo depois, se ainda houver vagas abertas.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setShowCancelApply(false)} className="secondary">Voltar</button>
        <button type="button" onClick={confirmCancelApplication} className="danger">
          <XCircle size={17} /> Cancelar candidatura
        </button>
      </div>
    </Modal>
  ) : null;
  const reportModal = showReport ? (
    <Modal title="Relatar problema na vaga" onClose={() => setShowReport(false)}>
      <form className="grid gap-3" onSubmit={submitJobReport}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900">
          Use este relato para vaga suspeita, cobrança fora da plataforma, dados incorretos, pagamento duvidoso ou conduta inadequada.
        </div>
        <label className="label">
          O que aconteceu?
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            className="input min-h-28 py-3"
            required
            placeholder="Descreva o problema para a administração revisar."
          />
        </label>
        <button type="submit" className="danger">
          <Flag size={17} /> Enviar relato
        </button>
      </form>
    </Modal>
  ) : null;

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Detalhes da vaga"
        title={currentJob.title}
        description="Telefone e endereço completo ficam protegidos até a contratação ser confirmada."
      />

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      <SafetyNotice title="Contratação protegida">
        Confirme dados, horário, uniforme e pagamento dentro do PONT antes de combinar detalhes externos. O contato completo só deve ser usado após aprovação.
      </SafetyNotice>
      {(workerBlocked || companyBlocked) && (
        <SafetyNotice title="Ação bloqueada por segurança" tone="warning">
          {workerBlocked
            ? "Seu perfil está em revisão pela administração. Candidaturas ficam pausadas até a liberação."
            : "Esta empresa está em revisão pela administração. A candidatura está bloqueada por segurança."}
        </SafetyNotice>
      )}
      {company && (
        <CompanyReputation
          companyName={company.establishmentName}
          rating={company.rating}
          reviews={companyReviews}
          reportCount={companyReportCount}
        />
      )}

      <section className="job-detail-card">
        <div className="job-detail-grid">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {jobStatus === "Urgente" ? <UrgentBadge /> : <StatusBadge type="job" status={jobStatus} />}
              {currentJob.urgent && jobStatus !== "Urgente" && <UrgentBadge />}
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>

            <h2>{currentJob.function}</h2>
            <p>{currentJob.description}</p>

            <div className="job-info-grid">
              <Info label="Quantidade" value={`${currentJob.quantity} profissionais`} icon={<Users size={17} />} />
              <Info label="Vagas restantes" value={`${getOpenSlots(currentJob)} disponíveis`} icon={<BadgeCheck size={17} />} />
              <Info label="Data" value={formatDate(currentJob.date)} icon={<CalendarDays size={17} />} />
              <Info label="Horário" value={`${currentJob.startsAt} às ${currentJob.endsAt}`} icon={<Clock size={17} />} />
              <Info label="Valor" value={formatCurrency(currentJob.dailyValue)} icon={<WalletCards size={17} />} />
              <Info label="Forma de pagamento" value={currentJob.paymentMethod} icon={<CreditCard size={17} />} />
              <Info label="Bairro" value={currentJob.neighborhood} icon={<MapPin size={17} />} />
              <Info label="Distância aproximada" value={`${currentJob.distanceKm} km`} icon={<MapPin size={17} />} />
            </div>

            <div className="job-requirements">
              <Info label="Endereço aproximado" value={currentJob.approximateAddress} icon={<MapPin size={17} />} />
              <Info label="Endereço completo" value={confirmed ? currentJob.fullAddress : "Liberado somente após confirmação"} icon={<Lock size={17} />} />
              <Info label="Requisitos" value={currentJob.requiredExperience} />
              <Info label="Uniforme" value={currentJob.uniform} />
              <Info label="Benefícios" value={currentJob.benefits.join(", ")} />
            </div>
          </div>

          <aside className="job-action-panel">
            <div className="flex items-center gap-3">
              <img src={company?.logoUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" />
              <div>
                <strong className="block text-white">{company?.establishmentName}</strong>
                <span className="flex items-center gap-1 text-sm text-slate-600"><Star size={15} /> {company?.rating.toFixed(1)} de avaliação</span>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><Users size={17} /> {currentJob.candidates} candidatos</span>
              <span className="flex items-center gap-2"><Building2 size={17} /> {company?.category}</span>
              <span className="flex items-center gap-2"><ShieldCheck size={17} /> Contato após confirmação</span>
            </div>
            {confirmed && company ? (
              <div className="contact-card">
                <strong className="text-sm text-white">Contato liberado</strong>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Phone size={16} /> {company.phone}</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Mail size={16} /> {company.email}</span>
                <a
                  href={getWhatsAppUrl(company.phone, `Olá, sou ${currentWorker.name}. Fui aprovado para a vaga ${currentJob.title}.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="primary"
                >
                  <MessageCircle size={17} /> Chamar no WhatsApp
                </a>
              </div>
            ) : (
              <div className="contact-locked">
                <Lock size={16} /> Contato protegido até aprovação.
              </div>
            )}
            <div className="worker-match-card">
              <span className="text-xs font-black uppercase text-slate-500">Seu nível nesta função</span>
              <strong className="mt-1 block text-sm text-white">
                {workerExperience ? getExperienceLabel(workerExperience.level) : "Função não declarada"}
              </strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">{getCompatibilityLabel(currentWorker, currentJob.function)}</p>
            </div>
            {application && (
              <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-3">
                <strong className="block text-sm text-white">Candidatura enviada</strong>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Status atual: {application.status}. Acompanhe a resposta da empresa em Minhas candidaturas.</p>
                <Link to="/app/candidaturas" className="secondary mt-3 w-full">
                  Ver minhas candidaturas <ArrowRight size={17} />
                </Link>
                {canCancelApplication && (
                  <button type="button" onClick={() => setShowCancelApply(true)} className="danger mt-2 w-full">
                    <XCircle size={17} /> Cancelar candidatura
                  </button>
                )}
              </div>
            )}
            <button type="button" onClick={handleApply} disabled={Boolean(application) || isApplying || workerBlocked || companyBlocked || !isJobOpenForApplications(currentJob)} className="primary">
              {application ? `Status: ${application.status}` : workerBlocked || companyBlocked ? "Bloqueado por segurança" : isApplying ? "Enviando..." : isJobOpenForApplications(currentJob) ? "Candidatar-se" : `Vaga ${jobStatus}`}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Cadastro gratuito. Cada candidatura enviada usa 1 moeda.
            </p>
            <button type="button" onClick={() => setShowReport(true)} className="secondary">
              <Flag size={17} /> Relatar problema
            </button>
          </aside>
        </div>
      </section>

      {applyConfirmModal}
      {cancelApplyModal}
      {plansModal}
      {reportModal}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="job-info-tile">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-white">{value}</strong>
    </div>
  );
}

function CompanyReputation({
  companyName,
  rating,
  reviews,
  reportCount,
  compact = false
}: {
  companyName: string;
  rating: number;
  reviews: Array<{ id: string; rating: number; workerName: string; comment: string }>;
  reportCount: number;
  compact?: boolean;
}) {
  const ratingTone = rating >= 4.5 ? "text-aqua-700" : rating >= 4 ? "text-white" : "text-amber-700";

  return (
    <section className={`rounded-lg border border-slate-200 bg-brand-charcoal p-4 shadow-sm ${compact ? "" : "grid gap-3"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="section-eyebrow">Reputação da empresa</span>
          <h3 className="mt-1 font-black text-white">{companyName}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Avaliações feitas por trabalhadores depois de turnos concluídos.
          </p>
        </div>
        <div className="rounded-lg bg-aqua-50 px-3 py-2 text-right">
          <strong className={`flex items-center gap-1 text-lg ${ratingTone}`}>
            <Star size={17} /> {rating.toFixed(1)}
          </strong>
          <span className="block text-xs font-black uppercase text-slate-500">
            {reviews.length} avaliação{reviews.length === 1 ? "" : "ões"}
          </span>
        </div>
      </div>

      {reportCount > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-5 text-amber-900">
          Esta empresa ou vaga possui {reportCount} relato{reportCount === 1 ? "" : "s"} aberto{reportCount === 1 ? "" : "s"} em revisão administrativa.
        </div>
      )}

      {!compact && (
        <div className="grid gap-2">
          {reviews.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
              Ainda não há avaliações registradas por trabalhadores para esta empresa.
            </p>
          ) : (
            reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <strong className="flex items-center gap-1 text-sm text-white">
                  <Star size={15} /> {review.rating} estrelas - {review.workerName}
                </strong>
                <p className="mt-1 text-sm leading-6 text-slate-600">{review.comment}</p>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
