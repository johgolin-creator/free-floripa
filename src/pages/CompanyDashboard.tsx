import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
  WalletCards,
  Zap
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { UrgentBadge } from "../components/UrgentBadge";
import { useWizardStep, WizardActions, WizardPanel, WizardProgress, WizardSteps } from "../components/Wizard";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import type { CreateJobInput, UrgentReplacementInput } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { JobFunction, Neighborhood, PaymentMethod } from "../lib/types";

const requiredJobFieldGroups = [
  { title: "Vaga", fields: ["Título", "Função", "Quantidade"] },
  { title: "Turno", fields: ["Data", "Entrada", "Saída", "Valor da diária", "Pagamento"] },
  { title: "Local", fields: ["Bairro", "Endereço aproximado", "Endereço completo"] },
  { title: "Requisitos", fields: ["Uniforme", "Experiência exigida", "Descrição", "Benefícios"] }
];
const jobSteps = ["Vaga", "Turno", "Local", "Requisitos", "Revisão"] as const;

type JobDraft = {
  title: string;
  function: JobFunction;
  quantity: string;
  date: string;
  startsAt: string;
  endsAt: string;
  dailyValue: string;
  paymentMethod: PaymentMethod;
  approximateAddress: string;
  fullAddress: string;
  neighborhood: Neighborhood;
  uniform: string;
  requiredExperience: string;
  description: string;
  benefits: string;
  urgent: boolean;
};

type SubmitResult = { ok: boolean; message?: string };

function normalizeJobKeyValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeJobKeyValue(item));
  if (typeof value === "string") return value.trim().toLocaleLowerCase("pt-BR");
  return value;
}

function createJobInputKey(input: CreateJobInput) {
  return JSON.stringify({
    ...input,
    title: normalizeJobKeyValue(input.title),
    approximateAddress: normalizeJobKeyValue(input.approximateAddress),
    fullAddress: normalizeJobKeyValue(input.fullAddress),
    uniform: normalizeJobKeyValue(input.uniform),
    requiredExperience: normalizeJobKeyValue(input.requiredExperience),
    description: normalizeJobKeyValue(input.description),
    benefits: input.benefits.map((item) => normalizeJobKeyValue(item))
  });
}

function createUrgentReplacementKey(input: UrgentReplacementInput) {
  return JSON.stringify({
    function: input.function,
    quantity: input.quantity,
    startsAt: input.startsAt,
    dailyValue: input.dailyValue,
    neighborhood: input.neighborhood,
    observation: normalizeJobKeyValue(input.observation)
  });
}

export function CompanyDashboard() {
  const { state, currentCompany, createJob, createUrgentReplacement } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showJobForm, setShowJobForm] = useState(false);
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [message, setMessage] = useState("");
  const lastCreatedJobKey = useRef("");
  const lastCreatedUrgentKey = useRef("");
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const companyApplications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
  const openJobs = companyJobs.filter((job) => {
    const status = getJobStatus(job);
    return status === "Publicada" || status === "Urgente" || status === "Em andamento";
  });
  const confirmed = companyApplications.filter((application) => application.status === "Aprovada").length;
  const absences = companyApplications.filter((application) => application.status === "Falta registrada").length;
  const today = new Date().toISOString().slice(0, 10);
  const pendingApplications = companyApplications.filter((application) => application.status === "Enviada" || application.status === "Em análise");
  const todayJobs = companyJobs
    .filter((job) => job.date === today && getJobStatus(job) !== "Cancelada" && getJobStatus(job) !== "Rascunho")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const todaySchedules = (state.companySchedules ?? [])
    .filter((schedule) => schedule.companyId === currentCompany.id && schedule.date === today && schedule.status !== "Cancelada")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const incompleteJobs = openJobs
    .filter((job) => getOpenSlots(job) > 0)
    .sort((a, b) => getOpenSlots(b) - getOpenSlots(a));
  const nextJob = todayJobs[0] ?? [...openJobs].sort((a, b) => `${a.date} ${a.startsAt}`.localeCompare(`${b.date} ${b.startsAt}`))[0];

  useEffect(() => {
    const action = searchParams.get("acao");
    if (action === "criar-vaga") {
      setShowJobForm(true);
      setSearchParams({}, { replace: true });
    }
    if (action === "urgente") {
      setShowUrgentForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Painel da empresa"
        title={currentCompany.establishmentName}
        description="Publique vagas temporárias, acompanhe candidatos e confirme sua equipe."
        action={
          <div className="grid gap-2 sm:flex">
            <button type="button" onClick={() => setShowUrgentForm(true)} disabled={companyBlocked} className="danger">
              <Zap size={17} /> Preciso de reposição urgente
            </button>
            <button type="button" onClick={() => setShowJobForm(true)} disabled={companyBlocked} className="primary">
              <Plus size={17} /> Criar nova vaga
            </button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatTile variant="primary" icon={<BriefcaseBusiness />} label="Vagas abertas" value={openJobs.length} />
        <StatTile icon={<CheckCircle2 />} label="Profissionais confirmados" value={confirmed} />
        <StatTile icon={<ClipboardList />} label="Candidaturas recebidas" value={companyApplications.length} />
        <StatTile tone="alert" icon={<AlertTriangle />} label="Faltas registradas" value={absences} />
      </div>

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      {companyBlocked && (
        <SafetyNotice title="Publicação bloqueada" tone="warning">
          Sua empresa está em revisão pela administração. Criação de vagas, reposição urgente e novas confirmações ficam pausadas até a liberação.
        </SafetyNotice>
      )}

      <section className="smart-dashboard-hero">
        <div>
          <span className="section-eyebrow">Central de hoje</span>
          <h2>{nextJob ? `Próximo foco: ${nextJob.title}` : "Nenhuma operação ativa hoje"}</h2>
          <p>
            {nextJob
              ? `${formatDate(nextJob.date)} - ${nextJob.startsAt} às ${nextJob.endsAt}, ${nextJob.neighborhood}.`
              : "Crie uma vaga ou monte uma escala para começar a organizar a equipe."}
          </p>
          <div className="smart-dashboard-actions">
            <Link to="/app/candidatos" className="company-action company-action-primary"><UsersRound size={17} /> Ver candidatos</Link>
            <Link to="/app/escala" className="company-action"><CalendarCheck size={17} /> Ver escala</Link>
          </div>
        </div>
        <div className="smart-dashboard-metrics">
          <SmartMetric icon={<Bell size={19} />} label="pendentes" value={String(pendingApplications.length)} tone={pendingApplications.length > 0 ? "alert" : "normal"} />
          <SmartMetric icon={<CalendarDays size={19} />} label="vagas hoje" value={String(todayJobs.length)} />
          <SmartMetric icon={<Clock3 size={19} />} label="escalas hoje" value={String(todaySchedules.length)} />
          <SmartMetric icon={<AlertTriangle size={19} />} label="a preencher" value={String(incompleteJobs.reduce((total, job) => total + getOpenSlots(job), 0))} tone={incompleteJobs.length > 0 ? "alert" : "normal"} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-4">
          <h3 className="mb-3 font-black text-white">Vagas abertas</h3>
          {companyJobs.length === 0 ? (
            <EmptyState title="Nenhuma vaga publicada" text="Use os botões acima para criar uma vaga comum ou uma reposição urgente." />
          ) : (
          <div className="grid gap-3">
            {companyJobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {job.urgent ? <UrgentBadge /> : <span className="badge">{job.function}</span>}
                    <h4 className="mt-2 font-black text-white">{job.title}</h4>
                    <p className="text-sm text-slate-600">{job.neighborhood} - {job.startsAt} às {job.endsAt} - {formatCurrency(job.dailyValue)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{job.filled}/{job.quantity} confirmados</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/app/minhas-vagas" className="secondary min-h-10 px-3">Ver vaga</Link>
                  <Link to={`/app/candidatos?vaga=${job.id}`} className="secondary min-h-10 px-3">Candidatos</Link>
                </div>
              </article>
            ))}
          </div>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <section className="smart-panel">
            <div className="smart-panel-head">
              <h3>Pendências rápidas</h3>
              <span>{pendingApplications.length}</span>
            </div>
            <div className="grid gap-2">
              {pendingApplications.slice(0, 3).map((application) => {
                const job = companyJobs.find((item) => item.id === application.jobId);
                return (
                  <Link key={application.id} to={`/app/candidatos?vaga=${application.jobId}`} className="smart-action-item">
                    <ClipboardList size={16} />
                    <span>{job?.title ?? "Vaga"}: {application.status}</span>
                  </Link>
                );
              })}
              {pendingApplications.length === 0 && <p className="smart-empty-text">Nenhum candidato aguardando decisão agora.</p>}
            </div>
          </section>

          <section className="smart-panel">
            <div className="smart-panel-head">
              <h3>Vagas a completar</h3>
              <span>{incompleteJobs.length}</span>
            </div>
            <div className="grid gap-2">
              {incompleteJobs.slice(0, 3).map((job) => (
                <Link key={job.id} to={`/app/candidatos?vaga=${job.id}`} className="smart-action-item">
                  <UsersRound size={16} />
                  <span>{job.title}: faltam {getOpenSlots(job)}</span>
                </Link>
              ))}
              {incompleteJobs.length === 0 && <p className="smart-empty-text">Todas as vagas abertas estão completas ou sem pendência.</p>}
            </div>
          </section>

          <section className="soft-panel p-4">
            <h3 className="mb-3 font-black text-white">Operação</h3>
            <div className="grid gap-2 text-sm font-semibold">
              <Link to="/app/candidatos" className="secondary justify-start"><UsersRound size={17} /> Candidatos recebidos</Link>
              <Link to="/app/eventos" className="secondary justify-start"><CalendarDays size={17} /> Montar evento</Link>
              <Link to="/app/profissionais" className="secondary justify-start"><Search size={17} /> Banco de profissionais</Link>
              <Link to="/app/minhas-vagas" className="secondary justify-start"><BriefcaseBusiness size={17} /> Vagas publicadas</Link>
              <Link to="/app/equipe" className="secondary justify-start"><CheckCircle2 size={17} /> Favoritos e contratados</Link>
              <Link to="/app/equipe" className="secondary justify-start"><ClipboardList size={17} /> Histórico de contratações</Link>
            </div>
          </section>
        </aside>
      </section>

      {showJobForm && (
        <CreateJobModal
          title="Criar nova vaga"
          onClose={() => setShowJobForm(false)}
          onCreate={(input) => {
            if (companyBlocked) {
              return { ok: false, message: "Sua empresa está em revisão pela administração e não pode publicar vagas no momento." };
            }
            const jobKey = createJobInputKey(input);
            if (lastCreatedJobKey.current === jobKey) {
              return { ok: false, message: "Essa vaga já foi criada. Altere algum dado para publicar novamente." };
            }
            createJob(input);
            lastCreatedJobKey.current = jobKey;
            setMessage("Vaga publicada com sucesso. Ela já aparece em Minhas vagas e para os trabalhadores compatíveis.");
            return { ok: true };
          }}
        />
      )}
      {showUrgentForm && (
        <Modal title="Reposição urgente" onClose={() => setShowUrgentForm(false)}>
          <UrgentForm
            onSubmit={(input) => {
              if (companyBlocked) {
                return { ok: false, message: "Sua empresa está em revisão pela administração e não pode publicar vaga urgente no momento." };
              }
              const urgentKey = createUrgentReplacementKey(input);
              if (lastCreatedUrgentKey.current === urgentKey) {
                return { ok: false, message: "Essa vaga urgente já foi criada. Altere algum dado para publicar novamente." };
              }
              createUrgentReplacement(input);
              lastCreatedUrgentKey.current = urgentKey;
              setShowUrgentForm(false);
              setMessage("Reposição urgente publicada. Ela foi marcada como URGENTE para os trabalhadores.");
              return { ok: true };
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function SmartMetric({
  icon,
  label,
  value,
  tone = "normal"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "alert";
}) {
  return (
    <span className={`smart-dashboard-metric ${tone === "alert" ? "is-alert" : ""}`}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function CreateJobModal({
  title,
  onClose,
  onCreate
}: {
  title: string;
  onClose: () => void;
  onCreate: (input: CreateJobInput) => SubmitResult | void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <CreateJobForm
        onSubmit={(input) => {
          const result = onCreate(input);
          if (result?.ok === false) return result;
          onClose();
          return { ok: true };
        }}
      />
    </Modal>
  );
}

function CreateJobForm({ onSubmit }: { onSubmit: (input: CreateJobInput) => SubmitResult | void }) {
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const isPublishingRef = useRef(false);
  const lastSubmittedKey = useRef("");
  const { step, isFirst, isLast, goTo, goNext: goToNext, goBack } = useWizardStep(jobSteps.length);
  const [draft, setDraft] = useState<JobDraft>({
    title: "",
    function: functions[0],
    quantity: "1",
    date: "",
    startsAt: "",
    endsAt: "",
    dailyValue: "",
    paymentMethod: "Pix",
    approximateAddress: "",
    fullAddress: "",
    neighborhood: "Centro",
    uniform: "",
    requiredExperience: "",
    description: "",
    benefits: "",
    urgent: false
  });

  const benefits = draft.benefits
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const parsed = {
    quantity: Number(draft.quantity),
    dailyValue: Number(draft.dailyValue)
  };
  const requiredFields = [
    draft.title.trim(),
    parsed.quantity > 0,
    draft.date,
    draft.startsAt,
    draft.endsAt,
    parsed.dailyValue > 0,
    draft.approximateAddress.trim(),
    draft.fullAddress.trim(),
    draft.uniform.trim(),
    draft.requiredExperience.trim(),
    draft.description.trim(),
    benefits.length > 0
  ];
  const completedFields = requiredFields.filter(Boolean).length;

  function setField<Key extends keyof JobDraft>(field: Key, value: JobDraft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleNext() {
    const result = validateJobDraft(draft, step);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    goToNext();
  }

  function handleBack() {
    setError("");
    goBack();
  }

  function handleStepSelect(index: number) {
    setError("");
    goTo(index);
  }

  function publish() {
    if (isPublishingRef.current) return;

    const result = validateJobDraft(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const input: CreateJobInput = {
      title: draft.title.trim(),
      function: draft.function,
      quantity: parsed.quantity,
      date: draft.date,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      dailyValue: parsed.dailyValue,
      paymentMethod: draft.paymentMethod,
      approximateAddress: draft.approximateAddress.trim(),
      fullAddress: draft.fullAddress.trim(),
      neighborhood: draft.neighborhood,
      uniform: draft.uniform.trim(),
      requiredExperience: draft.requiredExperience.trim(),
      description: draft.description.trim(),
      benefits,
      urgent: draft.urgent
    };
    const submitKey = createJobInputKey(input);
    if (lastSubmittedKey.current === submitKey) {
      setError("Essa vaga já foi enviada. Altere algum dado para publicar novamente.");
      return;
    }

    setError("");
    isPublishingRef.current = true;
    setIsPublishing(true);
    const submitResult = onSubmit(input);
    if (submitResult?.ok === false) {
      isPublishingRef.current = false;
      setIsPublishing(false);
      setError(submitResult.message ?? "Não foi possível publicar esta vaga.");
      return;
    }
    lastSubmittedKey.current = submitKey;
  }

  return (
    <form
      className="wizard"
      onSubmit={(event) => {
        event.preventDefault();
        publish();
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <RequiredFieldSummary />
      <WizardProgress
        completed={completedFields}
        total={requiredFields.length}
        label={`${completedFields}/${requiredFields.length} itens obrigatórios completos`}
      />
      <WizardSteps steps={jobSteps} current={step} onSelect={handleStepSelect} />

      {step === 0 && (
        <WizardPanel eyebrow="Etapa 1" title="Que vaga você precisa preencher?">
          <label className="label">Título<input value={draft.title} onChange={(event) => setField("title", event.target.value)} className="input" placeholder="Garçom para beach club" /></label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              Função
              <select value={draft.function} onChange={(event) => setField("function", event.target.value as JobFunction)} className="input">
                {functions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="label">Quantidade<input value={draft.quantity} onChange={(event) => setField("quantity", event.target.value)} type="number" min="1" className="input" /></label>
          </div>
          <label className="wizard-toggle-card">
            <input checked={draft.urgent} onChange={(event) => setField("urgent", event.target.checked)} type="checkbox" className="h-5 w-5 accent-alert" /> Marcar como vaga urgente
          </label>
        </WizardPanel>
      )}

      {step === 1 && (
        <WizardPanel eyebrow="Etapa 2" title="Quando será o turno?">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">Data<input value={draft.date} onChange={(event) => setField("date", event.target.value)} type="date" className="input" /></label>
            <label className="label">Valor da diária<input value={draft.dailyValue} onChange={(event) => setField("dailyValue", event.target.value)} type="number" min="1" className="input" placeholder="250" /></label>
            <label className="label">Entrada<input value={draft.startsAt} onChange={(event) => setField("startsAt", event.target.value)} type="time" className="input" /></label>
            <label className="label">Saída<input value={draft.endsAt} onChange={(event) => setField("endsAt", event.target.value)} type="time" className="input" /></label>
            <label className="label md:col-span-2">
              Pagamento
              <select value={draft.paymentMethod} onChange={(event) => setField("paymentMethod", event.target.value as PaymentMethod)} className="input">
                <option>Dinheiro</option>
                <option>Pix</option>
                <option>Transferência</option>
                <option>A combinar</option>
              </select>
            </label>
          </div>
        </WizardPanel>
      )}

      {step === 2 && (
        <WizardPanel eyebrow="Etapa 3" title="Onde a pessoa vai trabalhar?">
          <label className="label">
            Bairro
            <select value={draft.neighborhood} onChange={(event) => setField("neighborhood", event.target.value as Neighborhood)} className="input">
              {neighborhoods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="label">Endereço aproximado<input value={draft.approximateAddress} onChange={(event) => setField("approximateAddress", event.target.value)} className="input" placeholder="Jurerê, próximo à praia" /></label>
          <label className="label">Endereço completo<input value={draft.fullAddress} onChange={(event) => setField("fullAddress", event.target.value)} className="input" placeholder="Rua, número e referência. Só aparece após aprovação." /></label>
          <div className="wizard-note"><MapPin size={17} /> O endereço completo continua protegido até a confirmação do profissional.</div>
        </WizardPanel>
      )}

      {step === 3 && (
        <WizardPanel eyebrow="Etapa 4" title="Quais requisitos a vaga precisa ter?">
          <label className="label">Uniforme<input value={draft.uniform} onChange={(event) => setField("uniform", event.target.value)} className="input" placeholder="Camisa preta e calça preta" /></label>
          <label className="label">Experiência exigida<input value={draft.requiredExperience} onChange={(event) => setField("requiredExperience", event.target.value)} className="input" placeholder="Experiência com atendimento em salão" /></label>
          <label className="label">Descrição<textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} className="input min-h-24 py-3" placeholder="Explique a rotina, ritmo do turno e tarefas principais." /></label>
          <label className="label">Benefícios<input value={draft.benefits} onChange={(event) => setField("benefits", event.target.value)} className="input" placeholder="Alimentação, transporte" /></label>
        </WizardPanel>
      )}

      {step === 4 && (
        <WizardPanel eyebrow="Etapa 5" title="Revise antes de publicar">
          <div className="job-review-card">
            <div>
              {draft.urgent ? <UrgentBadge /> : <span className="badge">{draft.function}</span>}
              <h4>{draft.title || "Título da vaga"}</h4>
              <p>{draft.description || "Descrição da vaga ainda não preenchida."}</p>
            </div>
            <div className="job-review-grid">
              <ReviewItem icon={<BriefcaseBusiness size={16} />} label="Função" value={`${draft.function} - ${draft.quantity || 0} vaga${Number(draft.quantity) === 1 ? "" : "s"}`} />
              <ReviewItem icon={<CalendarDays size={16} />} label="Turno" value={`${draft.date || "sem data"} - ${draft.startsAt || "--:--"} às ${draft.endsAt || "--:--"}`} />
              <ReviewItem icon={<WalletCards size={16} />} label="Diária" value={parsed.dailyValue > 0 ? formatCurrency(parsed.dailyValue) : "sem valor"} />
              <ReviewItem icon={<MapPin size={16} />} label="Local" value={`${draft.neighborhood} - ${draft.approximateAddress || "sem endereço"}`} />
              <ReviewItem icon={<ShieldCheck size={16} />} label="Experiência" value={draft.requiredExperience || "não preenchida"} />
              <ReviewItem icon={<CheckCircle2 size={16} />} label="Benefícios" value={benefits.length > 0 ? benefits.join(", ") : "não preenchido"} />
            </div>
          </div>
          <div className="wizard-note"><ShieldCheck size={17} /> Ao publicar, a vaga aparece para freelancers compatíveis. Contato e endereço completo só liberam após aprovação.</div>
        </WizardPanel>
      )}

      <WizardActions isFirst={isFirst} isLast={isLast} onBack={handleBack} onNext={handleNext} submitLabel="Publicar vaga" pendingLabel="Publicando..." pending={isPublishing} />
    </form>
  );
}

function validateJobDraft(draft: JobDraft, step?: number) {
  const checks = [
    { step: 0, failed: !draft.title.trim(), label: "título" },
    { step: 0, failed: Number(draft.quantity) <= 0, label: "quantidade" },
    { step: 1, failed: !draft.date, label: "data" },
    { step: 1, failed: !draft.startsAt, label: "entrada" },
    { step: 1, failed: !draft.endsAt, label: "saída" },
    { step: 1, failed: Number(draft.dailyValue) <= 0, label: "valor da diária" },
    { step: 2, failed: !draft.approximateAddress.trim(), label: "endereço aproximado" },
    { step: 2, failed: !draft.fullAddress.trim(), label: "endereço completo" },
    { step: 3, failed: !draft.uniform.trim(), label: "uniforme" },
    { step: 3, failed: !draft.requiredExperience.trim(), label: "experiência exigida" },
    { step: 3, failed: !draft.description.trim(), label: "descrição" },
    { step: 3, failed: draft.benefits.split(",").map((item) => item.trim()).filter(Boolean).length === 0, label: "benefícios" }
  ];
  const missing = checks.filter((check) => check.failed && (step === undefined || check.step === step)).map((check) => check.label);

  if (missing.length > 0) {
    return { ok: false, message: `Preencha antes de continuar: ${missing.join(", ")}.` };
  }

  if ((step === undefined || step === 1) && draft.startsAt && draft.endsAt && draft.startsAt === draft.endsAt) {
    return { ok: false, message: "Entrada e saída não podem ser iguais." };
  }

  return { ok: true, message: "" };
}

function ReviewItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="job-review-item">
      <span>{icon} {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RequiredFieldSummary() {
  return (
    <section className="rounded-lg border border-aqua-100 bg-aqua-100 p-3">
      <div className="flex items-center gap-2 text-sm font-black text-white">
        <ClipboardList size={17} /> Campos obrigatórios
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {requiredJobFieldGroups.map((group) => (
          <div key={group.title} className="rounded-lg bg-brand-dark p-3">
            <strong className="text-xs uppercase text-aqua-700">{group.title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{group.fields.join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UrgentForm({ onSubmit }: { onSubmit: (input: UrgentReplacementInput) => SubmitResult | void }) {
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const isPublishingRef = useRef(false);
  const lastSubmittedKey = useRef("");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (isPublishingRef.current) return;
        const form = new FormData(event.currentTarget);
        const quantity = Number(form.get("quantity"));
        const startsAt = String(form.get("startsAt") || "").trim();
        const dailyValue = Number(form.get("dailyValue"));
        if (quantity <= 0 || !startsAt || dailyValue <= 0) {
          setError("Preencha quantidade, horário e valor para criar a reposição urgente.");
          return;
        }
        const input: UrgentReplacementInput = {
          function: form.get("function") as JobFunction,
          quantity,
          startsAt,
          dailyValue,
          neighborhood: form.get("neighborhood") as Neighborhood,
          observation: String(form.get("observation") || "")
        };
        const submitKey = createUrgentReplacementKey(input);
        if (lastSubmittedKey.current === submitKey) {
          setError("Essa vaga urgente já foi enviada. Altere algum dado para publicar novamente.");
          return;
        }
        setError("");
        isPublishingRef.current = true;
        setIsPublishing(true);
        const result = onSubmit(input);
        if (result?.ok === false) {
          isPublishingRef.current = false;
          setIsPublishing(false);
          setError(result.message ?? "Não foi possível publicar a vaga urgente.");
          return;
        }
        lastSubmittedKey.current = submitKey;
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <section className="urgent-form-hero">
        <span><Zap size={19} /></span>
        <div>
          <strong>Reposição para hoje</strong>
          <p>Use quando alguém faltou ou quando precisa preencher um turno rápido. Ela será publicada marcada como urgente.</p>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Função<select name="function" className="input" required>{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" defaultValue="1" className="input" required /></label>
        <label className="label">Horário<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Valor<input name="dailyValue" type="number" min="1" className="input" required placeholder="280" /></label>
        <label className="label md:col-span-2">Bairro<select name="neighborhood" className="input" required>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="label">Observação<textarea name="observation" className="input min-h-24 py-3" placeholder="Cobrir falta no turno da noite" /></label>
      <button type="submit" disabled={isPublishing} className="danger">
        {isPublishing ? "Criando..." : "Criar vaga URGENTE"}
      </button>
    </form>
  );
}
