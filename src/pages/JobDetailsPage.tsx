import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
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
  Zap
} from "lucide-react";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { TermHint } from "../components/TermHint";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getCompatibilityLabel, getExperienceLabel, getFunctionExperience, getJobStatus, getOpenSlots, isJobOpenForApplications } from "../lib/rules";

export function JobDetailsPage() {
  const { id } = useParams();
  const { state, currentWorker, applyToJob, submitTrustReport, unlockJobWithCoins, subscribeProfessional, subscribePlus } = useAppStore();
  const [message, setMessage] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const applyingRef = useRef(false);
  const job = state.jobs.find((item) => item.id === id);

  if (!job) return <Navigate to="/app/vagas" replace />;

  const currentJob = job;
  const company = state.companies.find((item) => item.id === currentJob.companyId);
  const application = state.applications.find((item) => item.jobId === currentJob.id && item.workerId === state.selectedWorkerId);
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
  const hasUnlockedJob = state.subscription.unlockedJobIds.includes(currentJob.id);
  const canViewFullJob = hasUnlockedJob || confirmed;
  const workerBlocked = state.adminModeration.blockedWorkerIds.includes(currentWorker.id);
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentJob.companyId);
  const unlockItems = ["Descrição completa", "Requisitos e benefícios", "Candidatura liberada", "Dados protegidos no momento certo"];

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
    if (!hasUnlockedJob) {
      setMessage("Use 1 moeda para liberar a vaga completa antes de enviar candidatura.");
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

  function handleUnlockJob() {
    const result = unlockJobWithCoins(currentJob.id);
    setMessage(result.message);
    if (!result.ok) setShowPlans(true);
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
          <h3>Escolha um pacote de moedas</h3>
          <p>Use moedas para liberar vagas completas. Depois de liberar, a candidatura naquela vaga não cobra de novo.</p>
        </div>
        <button
          type="button"
          className="job-plan-option"
          onClick={() => {
            subscribeProfessional();
            setShowPlans(false);
            setMessage("Pacote Profissional ativado. 20 moedas foram adicionadas.");
          }}
        >
          <span>
            <strong>R$ 19,90</strong>
            <small>20 moedas</small>
          </span>
          <em>Comprar pacote</em>
        </button>
        <button
          type="button"
          className="job-plan-option"
          onClick={() => {
            subscribePlus();
            setShowPlans(false);
            setMessage("Pacote Plus ativado. 35 moedas foram adicionadas.");
          }}
        >
          <span>
            <strong>R$ 29,90</strong>
            <small>35 moedas</small>
          </span>
          <em>Comprar Plus</em>
        </button>
        <Link to="/app/planos" onClick={() => setShowPlans(false)} className="secondary">
          Ver todos os pacotes <ArrowRight size={17} />
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
            A vaga já está liberada. Depois do envio, a empresa poderá analisar seu perfil e responder pela plataforma sem nova cobrança de moeda.
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

  if (!canViewFullJob) {
    return (
      <div className="grid gap-5">
        <SectionHeader
          eyebrow="Vaga bloqueada"
          title={currentJob.function}
          description="Você está vendo apenas uma prévia. Use moedas para liberar a vaga completa."
        />

        {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
        {(workerBlocked || companyBlocked) && (
          <SafetyNotice title="Ação bloqueada por segurança" tone="warning">
            {workerBlocked
              ? "Seu perfil está em revisão pela administração. Candidaturas ficam pausadas até a liberação."
              : "Esta empresa está em revisão pela administração. Aguarde a liberação antes de usar moedas nesta vaga."}
          </SafetyNotice>
        )}
        {company && (
          <CompanyReputation
            companyName={company.establishmentName}
            rating={company.rating}
            reviews={companyReviews}
            reportCount={companyReportCount}
            compact
          />
        )}

        <section className="job-preview-card">
          <div className="job-preview-main">
            <div className="mb-3 flex flex-wrap gap-2">
              {currentJob.urgent && <UrgentBadge />}
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>
            <h2>{currentJob.title}</h2>
            <p>Você está vendo uma prévia. Use 1 moeda para liberar descrição completa, requisitos, benefícios e candidatura.</p>

            <div className="job-preview-grid">
              <Info label="Empresa" value="Empresa verificada" icon={<Building2 size={17} />} />
              <Info label="Data" value={formatDate(currentJob.date)} icon={<CalendarDays size={17} />} />
              <Info label="Horário" value={`${currentJob.startsAt} às ${currentJob.endsAt}`} icon={<Clock size={17} />} />
              <Info label="Valor" value={formatCurrency(currentJob.dailyValue)} icon={<WalletCards size={17} />} />
              <Info label="Bairro" value={currentJob.neighborhood} icon={<MapPin size={17} />} />
              <Info label="Vagas restantes" value={`${getOpenSlots(currentJob)} disponíveis`} icon={<Users size={17} />} />
            </div>
          </div>

          <aside className="job-lock-panel">
            <span className="job-lock-icon">
              <Lock size={24} />
            </span>
            <h3>Vaga completa bloqueada</h3>
            <p><TermHint term="moedas" role="trabalhador">As moedas</TermHint> liberam os detalhes que ajudam você a decidir com segurança.</p>
            <div className="job-unlock-list">
              {unlockItems.map((item) => (
                <span key={item}>
                  <CheckCircle2 size={16} /> {item}
                </span>
              ))}
            </div>
            <button type="button" onClick={handleUnlockJob} className="primary">
              <Lock size={17} /> Liberar por 1 moeda
            </button>
            <button type="button" onClick={() => setShowPlans(true)} className="secondary">
              Comprar moedas <Zap size={17} />
            </button>
            <button type="button" onClick={() => setShowReport(true)} className="secondary">
              <Flag size={17} /> Relatar problema
            </button>
          </aside>
        </section>

        {plansModal}
        {reportModal}
      </div>
    );
  }

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
              {currentJob.urgent && <UrgentBadge />}
              <StatusBadge type="job" status={jobStatus} />
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>

            <h2>{currentJob.function}</h2>
            <p>{currentJob.description}</p>

            <div className="job-info-grid">
              <Info label="Empresa" value={company?.establishmentName ?? "Empresa"} icon={<Building2 size={17} />} />
              <Info label="Avaliação da empresa" value={`${company?.rating.toFixed(1) ?? "0.0"} estrelas`} icon={<Star size={17} />} />
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
              <img src={company?.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
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
              </div>
            )}
            <button type="button" onClick={handleApply} disabled={Boolean(application) || isApplying || workerBlocked || companyBlocked || !isJobOpenForApplications(currentJob)} className="primary">
              {application ? `Status: ${application.status}` : workerBlocked || companyBlocked ? "Bloqueado por segurança" : isApplying ? "Enviando..." : isJobOpenForApplications(currentJob) ? "Candidatar-se" : `Vaga ${jobStatus}`}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Cadastro gratuito com prévia das vagas. Use moedas para liberar a vaga completa antes de se candidatar.
            </p>
            <button type="button" onClick={() => setShowReport(true)} className="secondary">
              <Flag size={17} /> Relatar problema
            </button>
          </aside>
        </div>
      </section>

      {applyConfirmModal}
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
