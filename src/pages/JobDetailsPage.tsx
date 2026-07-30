import { useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
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
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, getWhatsAppUrl } from "../lib/format";
import { getCompatibilityLabel, getExperienceLabel, getFunctionExperience, getJobStatus, getOpenSlots, isJobOpenForApplications } from "../lib/rules";

export function JobDetailsPage() {
  const { id } = useParams();
  const { state, currentWorker, applyToJob, subscribeProfessional } = useAppStore();
  const [message, setMessage] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const job = state.jobs.find((item) => item.id === id);

  if (!job) return <Navigate to="/app/vagas" replace />;

  const currentJob = job;
  const company = state.companies.find((item) => item.id === currentJob.companyId);
  const application = state.applications.find((item) => item.jobId === currentJob.id && item.workerId === state.selectedWorkerId);
  const confirmed = application?.status === "Aprovada" || application?.status === "Trabalho concluído";
  const workerExperience = getFunctionExperience(currentWorker, currentJob.function);
  const jobStatus = getJobStatus(currentJob);
  const hasFullAccess = state.subscription.plan !== "Gratuito";
  const canViewFullJob = hasFullAccess || confirmed;
  const unlockItems = ["Descrição completa", "Requisitos e benefícios", "Candidatura liberada", "Dados protegidos no momento certo"];

  function handleApply() {
    if (!hasFullAccess) {
      setMessage("Assine o plano profissional para ver a vaga completa e enviar candidatura.");
      setShowPlans(true);
      return;
    }

    const result = applyToJob(currentJob.id);
    setMessage(result.message);
    if (result.requiresPlan) setShowPlans(true);
  }

  const plansModal = showPlans ? (
    <Modal title="Liberar vaga completa" onClose={() => setShowPlans(false)}>
      <div className="job-plan-modal">
        <div>
          <span className="badge bg-aqua-50 text-aqua-700">
            <CreditCard size={15} /> Profissional
          </span>
          <h3>Desbloqueie esta vaga</h3>
          <p>Veja todos os detalhes antes de se candidatar e libere candidaturas sem limite.</p>
        </div>
        <button
          type="button"
          className="job-plan-option"
          onClick={() => {
            subscribeProfessional();
            setShowPlans(false);
            setMessage("Plano profissional ativado. Vaga completa e candidaturas liberadas.");
          }}
        >
          <span>
            <strong>R$ 19,90</strong>
            <small>/mês</small>
          </span>
          <em>Ativar plano agora</em>
        </button>
        <Link to="/app/planos" onClick={() => setShowPlans(false)} className="secondary">
          Comparar planos <ArrowRight size={17} />
        </Link>
      </div>
    </Modal>
  ) : null;

  if (!canViewFullJob) {
    return (
      <div className="grid gap-5">
        <SectionHeader
          eyebrow="Vaga bloqueada"
          title={currentJob.function}
          description="Você está vendo apenas uma prévia. Assine para liberar a vaga completa."
        />

        {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

        <section className="job-preview-card">
          <div className="job-preview-main">
            <div className="mb-3 flex flex-wrap gap-2">
              {currentJob.urgent && <span className="badge urgent"><AlertTriangle size={14} /> URGENTE</span>}
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>
            <h2>{currentJob.title}</h2>
            <p>Você está vendo uma prévia. Assine para liberar descrição completa, requisitos, benefícios e candidatura.</p>

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
            <p>O plano profissional libera os detalhes que ajudam você a decidir com segurança.</p>
            <div className="job-unlock-list">
              {unlockItems.map((item) => (
                <span key={item}>
                  <CheckCircle2 size={16} /> {item}
                </span>
              ))}
            </div>
            <Link to="/app/planos" className="primary">
              <Lock size={17} /> Ver planos
            </Link>
            <button type="button" onClick={() => setShowPlans(true)} className="secondary">
              Liberar agora <Zap size={17} />
            </button>
          </aside>
        </section>

        {plansModal}
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

      <section className="job-detail-card">
        <div className="job-detail-grid">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {currentJob.urgent && <span className="badge urgent"><AlertTriangle size={14} /> URGENTE</span>}
              <span className="badge">{jobStatus}</span>
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
                <strong className="block text-navy-950">{company?.establishmentName}</strong>
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
                <strong className="text-sm text-navy-950">Contato liberado</strong>
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
              <strong className="mt-1 block text-sm text-navy-950">
                {workerExperience ? getExperienceLabel(workerExperience.level) : "Função não declarada"}
              </strong>
              <p className="mt-1 text-xs font-semibold text-slate-500">{getCompatibilityLabel(currentWorker, currentJob.function)}</p>
            </div>
            <button type="button" onClick={handleApply} disabled={Boolean(application) || !isJobOpenForApplications(currentJob)} className="primary">
              {application ? `Status: ${application.status}` : isJobOpenForApplications(currentJob) ? "Candidatar-se" : `Vaga ${jobStatus}`}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Cadastro gratuito com prévia das vagas. A vaga completa e as candidaturas ficam no plano profissional.
            </p>
          </aside>
        </div>
      </section>

      {plansModal}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="job-info-tile">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
