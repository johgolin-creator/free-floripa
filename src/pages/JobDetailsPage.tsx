import { useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AlertTriangle, Building2, CheckCircle2, Lock, Mail, MapPin, MessageCircle, Phone, Star, Users } from "lucide-react";
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
  const isProfessional = state.subscription.plan === "Profissional";
  const canViewFullJob = isProfessional || confirmed;

  function handleApply() {
    if (!isProfessional) {
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
      <div className="grid gap-3">
        <button
          type="button"
          className="card p-4 text-left"
          onClick={() => {
            subscribeProfessional();
            setShowPlans(false);
            setMessage("Plano profissional ativado. Vaga completa e candidaturas liberadas.");
          }}
        >
          <strong className="block text-lg text-navy-950">Plano profissional</strong>
          <span className="mt-1 block text-sm text-slate-600">Libera vagas completas e candidaturas ilimitadas por R$ 14,90 por mês.</span>
        </button>
        <Link to="/app/planos" onClick={() => setShowPlans(false)} className="secondary">
          Comparar planos
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

        <section className="card grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {currentJob.urgent && <span className="badge urgent"><AlertTriangle size={14} /> URGENTE</span>}
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>
            <h2 className="text-2xl font-black text-navy-950">{currentJob.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Descrição completa, requisitos, benefícios, dados da empresa e candidatura ficam disponíveis para assinantes.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Empresa" value="Empresa verificada" />
              <Info label="Data" value={formatDate(currentJob.date)} />
              <Info label="Horário" value={`${currentJob.startsAt} às ${currentJob.endsAt}`} />
              <Info label="Valor" value={formatCurrency(currentJob.dailyValue)} />
              <Info label="Bairro" value={currentJob.neighborhood} />
              <Info label="Vagas restantes" value={`${getOpenSlots(currentJob)} disponíveis`} />
            </div>
          </div>

          <aside className="grid content-start gap-3 rounded-lg bg-slate-50 p-4">
            <div className="rounded-lg border border-aqua-100 bg-white p-4">
              <span className="flex items-center gap-2 text-sm font-black uppercase text-aqua-700">
                <Lock size={17} /> Conteúdo protegido
              </span>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Assine o plano profissional para ver a vaga completa e se candidatar.
              </p>
            </div>
            <Link to="/app/planos" className="primary">
              <Lock size={17} /> Ver planos
            </Link>
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

      <section className="card overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {currentJob.urgent && <span className="badge urgent"><AlertTriangle size={14} /> URGENTE</span>}
              <span className="badge">{jobStatus}</span>
              <span className="badge">{currentJob.function}</span>
              <span className="badge">{currentJob.paymentMethod}</span>
            </div>

            <h2 className="text-2xl font-black text-navy-950">{currentJob.function}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{currentJob.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info label="Empresa" value={company?.establishmentName ?? "Empresa"} />
              <Info label="Avaliação da empresa" value={`${company?.rating.toFixed(1) ?? "0.0"} estrelas`} />
              <Info label="Quantidade" value={`${currentJob.quantity} profissionais`} />
              <Info label="Vagas restantes" value={`${getOpenSlots(currentJob)} disponíveis`} />
              <Info label="Data" value={formatDate(currentJob.date)} />
              <Info label="Horário" value={`${currentJob.startsAt} às ${currentJob.endsAt}`} />
              <Info label="Valor" value={formatCurrency(currentJob.dailyValue)} />
              <Info label="Forma de pagamento" value={currentJob.paymentMethod} />
              <Info label="Bairro" value={currentJob.neighborhood} />
              <Info label="Distância aproximada" value={`${currentJob.distanceKm} km`} />
            </div>

            <div className="mt-5 grid gap-3">
              <Info label="Endereço aproximado" value={currentJob.approximateAddress} icon={<MapPin size={17} />} />
              <Info label="Endereço completo" value={confirmed ? currentJob.fullAddress : "Liberado somente após confirmação"} icon={<Lock size={17} />} />
              <Info label="Requisitos" value={currentJob.requiredExperience} />
              <Info label="Uniforme" value={currentJob.uniform} />
              <Info label="Benefícios" value={currentJob.benefits.join(", ")} />
            </div>
          </div>

          <aside className="grid content-start gap-3 rounded-lg bg-slate-50 p-4">
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
              <span className="flex items-center gap-2"><CheckCircle2 size={17} /> Contato após confirmação</span>
            </div>
            {confirmed && company ? (
              <div className="grid gap-2 rounded-lg border border-aqua-100 bg-white p-3">
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
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-500">
                <Lock size={16} /> Contato protegido até aprovação.
              </div>
            )}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
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
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
