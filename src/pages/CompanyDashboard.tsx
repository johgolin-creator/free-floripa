import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Plus,
  UsersRound,
  Zap
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { UrgentBadge } from "../components/UrgentBadge";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { functionLabel } from "../lib/functionInfo";
import type { CreateJobInput, UrgentReplacementInput } from "../lib/store";
import { formatCurrency, formatDate, todayLocalISODate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import type { Job, JobFunction, Neighborhood, PaymentMethod } from "../lib/types";

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
  const navigate = useNavigate();
  const { state, currentCompany, createJob, updateJob, createUrgentReplacement } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
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
  // "Profissionais disponíveis": banco de profissionais com uma margem para
  // cima e um "+", como vitrine. Não é uma contagem exata.
  const AVAILABLE_WORKERS_MARGIN = 6;
  const availableWorkers = state.workers.filter(
    (worker) => !state.adminModeration.blockedWorkerIds.includes(worker.id)
  ).length;
  const shownAvailableWorkers = availableWorkers + AVAILABLE_WORKERS_MARGIN;
  const today = todayLocalISODate();
  const pendingApplications = companyApplications.filter((application) => application.status === "Enviada" || application.status === "Em análise");
  const todayJobs = companyJobs
    .filter((job) => job.date === today && getJobStatus(job) !== "Cancelada" && getJobStatus(job) !== "Rascunho")
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
    if (action === "editar-vaga") {
      const jobId = searchParams.get("vaga");
      const job = state.jobs.find((item) => item.id === jobId && item.companyId === currentCompany.id);
      if (job) setEditingJob(job);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, state.jobs, currentCompany.id]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
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

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <StatTile variant="primary" icon={<BriefcaseBusiness />} label="Vagas abertas" value={openJobs.length} onClick={() => navigate("/app/minhas-vagas")} />
        <StatTile
          tone={pendingApplications.length > 0 ? "positive" : "normal"}
          icon={<ClipboardList />}
          label="Aguardando decisão"
          value={pendingApplications.length}
          onClick={() => navigate("/app/candidatos")}
        />
        <StatTile icon={<CheckCircle2 />} label="Profissionais confirmados" value={confirmed} />
        <StatTile icon={<UsersRound />} label="Profissionais disponíveis" value={`${shownAvailableWorkers}+`} onClick={() => navigate("/app/profissionais")} />
        <StatTile tone={absences > 0 ? "alert" : "normal"} icon={<AlertTriangle />} label="Faltas registradas" value={absences} />
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
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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
              {pendingApplications.slice(0, 4).map((application) => {
                const job = companyJobs.find((item) => item.id === application.jobId);
                const worker = state.workers.find((item) => item.id === application.workerId);
                return (
                  <Link key={application.id} to={`/app/candidatos?vaga=${application.jobId}`} className="smart-action-item">
                    <ClipboardList size={16} />
                    <span className="min-w-0">
                      <strong className="block break-words text-white">{worker?.name ?? "Profissional"}</strong>
                      <small className="block break-words text-xs font-semibold text-slate-500">{job?.title ?? "Vaga"} · aguardando decisão</small>
                    </span>
                  </Link>
                );
              })}
              {pendingApplications.length > 4 && (
                <Link to="/app/candidatos" className="text-sm font-black text-aqua-300 hover:underline">
                  Ver todos os {pendingApplications.length} candidatos
                </Link>
              )}
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
      {editingJob && (
        <CreateJobModal
          title="Editar vaga"
          editingJob={editingJob}
          onClose={() => setEditingJob(null)}
          onCreate={(input) => {
            const result = updateJob(editingJob.id, input);
            if (result.ok) setMessage(result.message);
            return result;
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

function CreateJobModal({
  title,
  editingJob,
  onClose,
  onCreate
}: {
  title: string;
  editingJob?: Job;
  onClose: () => void;
  onCreate: (input: CreateJobInput) => SubmitResult | void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <CreateJobForm
        editingJob={editingJob}
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

function jobToDraft(job: Job): JobDraft {
  return {
    title: job.title,
    function: job.function,
    quantity: String(job.quantity),
    date: job.date,
    startsAt: job.startsAt,
    endsAt: job.endsAt,
    dailyValue: String(job.dailyValue),
    paymentMethod: job.paymentMethod,
    approximateAddress: job.approximateAddress,
    fullAddress: job.fullAddress,
    neighborhood: job.neighborhood,
    uniform: job.uniform,
    requiredExperience: job.requiredExperience,
    description: job.description,
    benefits: job.benefits.join(", "),
    urgent: job.urgent
  };
}

function CreateJobForm({ editingJob, onSubmit }: { editingJob?: Job; onSubmit: (input: CreateJobInput) => SubmitResult | void }) {
  const isEditing = Boolean(editingJob);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const isPublishingRef = useRef(false);
  const lastSubmittedKey = useRef("");
  const [draft, setDraft] = useState<JobDraft>(
    editingJob
      ? jobToDraft(editingJob)
      : {
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
        }
  );
  // Na edição, os detalhes já vêm abertos se a vaga tem algum preenchido.
  const [showDetails, setShowDetails] = useState(
    Boolean(editingJob && (editingJob.uniform || editingJob.requiredExperience || editingJob.description || editingJob.benefits.length > 0))
  );

  function setField<Key extends keyof JobDraft>(field: Key, value: JobDraft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function publish() {
    if (isPublishingRef.current) return;

    const result = validateJobDraft(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const input = jobDraftToInput(draft);
    const submitKey = createJobInputKey(input);
    if (!isEditing && lastSubmittedKey.current === submitKey) {
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
      setError(submitResult.message ?? (isEditing ? "Não foi possível salvar as alterações." : "Não foi possível publicar esta vaga."));
      return;
    }
    lastSubmittedKey.current = submitKey;
  }

  return (
    <form
      className="grid max-h-[75vh] gap-3 overflow-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault();
        publish();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <label className="label">
          Função
          <select value={draft.function} onChange={(event) => setField("function", event.target.value as JobFunction)} className="input">
            {functions.map((item) => <option key={item} value={item}>{functionLabel(item)}</option>)}
          </select>
        </label>
        <label className="label">Quantas pessoas<input value={draft.quantity} onChange={(event) => setField("quantity", event.target.value)} type="number" min="1" className="input" /></label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="label col-span-2 sm:col-span-1">Data<input value={draft.date} onChange={(event) => setField("date", event.target.value)} type="date" className="input" /></label>
        <label className="label">Entrada<input value={draft.startsAt} onChange={(event) => setField("startsAt", event.target.value)} type="time" className="input" /></label>
        <label className="label">Saída<input value={draft.endsAt} onChange={(event) => setField("endsAt", event.target.value)} type="time" className="input" /></label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="label">Diária (R$)<input value={draft.dailyValue} onChange={(event) => setField("dailyValue", event.target.value)} type="number" min="1" inputMode="decimal" className="input" placeholder="150" /></label>
        <label className="label">
          Bairro
          <input
            value={draft.neighborhood}
            onChange={(event) => setField("neighborhood", event.target.value as Neighborhood)}
            list="neighborhoods-job"
            className="input"
            placeholder="Digite o bairro"
            autoComplete="off"
          />
          <datalist id="neighborhoods-job">
            {neighborhoods.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 px-3 text-sm font-bold text-white">
        <input checked={draft.urgent} onChange={(event) => setField("urgent", event.target.checked)} type="checkbox" className="h-5 w-5 accent-alert" /> É urgente (destaca a vaga)
      </label>

      <button
        type="button"
        className="flex min-h-11 items-center justify-between rounded-lg border border-dashed border-white/15 px-3 text-sm font-black text-aqua-300"
        onClick={() => setShowDetails((open) => !open)}
        aria-expanded={showDetails}
      >
        <span>Mais detalhes (opcional)</span>
        {showDetails ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {showDetails && (
        <div className="grid gap-3 rounded-lg border border-white/10 p-3">
          <label className="label">Título<input value={draft.title} onChange={(event) => setField("title", event.target.value)} className="input" placeholder={`${functionLabel(draft.function)} - ${draft.neighborhood || "bairro"}`} /></label>
          <label className="label">
            Pagamento
            <select value={draft.paymentMethod} onChange={(event) => setField("paymentMethod", event.target.value as PaymentMethod)} className="input">
              <option>Pix</option>
              <option>Dinheiro</option>
              <option>Transferência</option>
              <option>A combinar</option>
            </select>
          </label>
          <label className="label">Referência do local<input value={draft.approximateAddress} onChange={(event) => setField("approximateAddress", event.target.value)} className="input" placeholder="Jurerê, próximo à praia" /></label>
          <label className="label">Endereço completo<input value={draft.fullAddress} onChange={(event) => setField("fullAddress", event.target.value)} className="input" placeholder="Rua e número. Só aparece para quem for aprovado." /></label>
          <label className="label">Uniforme<input value={draft.uniform} onChange={(event) => setField("uniform", event.target.value)} className="input" placeholder="Camisa preta e calça preta" /></label>
          <label className="label">Experiência<input value={draft.requiredExperience} onChange={(event) => setField("requiredExperience", event.target.value)} className="input" placeholder="Experiência com atendimento em salão" /></label>
          <label className="label">Descrição<textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} className="input min-h-20 py-3" placeholder="Rotina, ritmo do turno, tarefas principais." /></label>
          <label className="label">Benefícios<input value={draft.benefits} onChange={(event) => setField("benefits", event.target.value)} className="input" placeholder="Alimentação, transporte" /></label>
        </div>
      )}

      {isEditing && editingJob && editingJob.filled > 0 && (
        <div className="wizard-note">
          <AlertTriangle size={17} /> {editingJob.filled} profissional(is) já confirmado(s) nesta vaga. Mudanças de data, horário ou valor podem afetá-los — avise-os se precisar.
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}

      <button type="submit" className="primary min-h-12" disabled={isPublishing}>
        {isPublishing ? (isEditing ? "Salvando..." : "Publicando...") : isEditing ? "Salvar alterações" : "Publicar vaga"}
      </button>
      {!isEditing && (
        <p className="text-center text-xs font-semibold text-slate-400">
          A vaga aparece para freelancers dessa função. Contato e endereço completo só liberam após a aprovação.
        </p>
      )}
    </form>
  );
}

/** Converte o rascunho em vaga, preenchendo os opcionais vazios com textos padrão legíveis. */
function jobDraftToInput(draft: JobDraft): CreateJobInput {
  const fn = functionLabel(draft.function);
  const neighborhood = String(draft.neighborhood).trim();
  return {
    title: draft.title.trim() || `${fn} - ${neighborhood}`,
    function: draft.function,
    quantity: Number(draft.quantity),
    date: draft.date,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    dailyValue: Number(draft.dailyValue),
    paymentMethod: draft.paymentMethod,
    approximateAddress: draft.approximateAddress.trim() || neighborhood,
    fullAddress: draft.fullAddress.trim() || "Combinar com a empresa após a confirmação",
    neighborhood: neighborhood as Neighborhood,
    uniform: draft.uniform.trim() || "A combinar",
    requiredExperience: draft.requiredExperience.trim() || "Não exigida",
    description: draft.description.trim() || `${fn} para turno das ${draft.startsAt} às ${draft.endsAt} (${neighborhood}).`,
    benefits: draft.benefits
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    urgent: draft.urgent
  };
}

function validateJobDraft(draft: JobDraft) {
  const checks = [
    { failed: Number(draft.quantity) <= 0, label: "quantidade" },
    { failed: !draft.date, label: "data" },
    { failed: !draft.startsAt, label: "entrada" },
    { failed: !draft.endsAt, label: "saída" },
    { failed: Number(draft.dailyValue) <= 0, label: "valor da diária" },
    { failed: !String(draft.neighborhood).trim(), label: "bairro" }
  ];
  const missing = checks.filter((check) => check.failed).map((check) => check.label);
  if (missing.length > 0) {
    return { ok: false, message: `Preencha: ${missing.join(", ")}.` };
  }
  if (draft.startsAt === draft.endsAt) {
    return { ok: false, message: "Entrada e saída não podem ser iguais." };
  }
  return { ok: true, message: "" };
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
        <label className="label">Função<select name="function" className="input" required>{functions.map((item) => <option key={item} value={item}>{functionLabel(item)}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" defaultValue="1" className="input" required /></label>
        <label className="label">Horário<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Valor<input name="dailyValue" type="number" min="1" className="input" required placeholder="280" /></label>
        <label className="label md:col-span-2">
          Bairro
          <input name="neighborhood" list="neighborhoods-urgent" className="input" required placeholder="Digite o bairro" autoComplete="off" />
          <datalist id="neighborhoods-urgent">
            {neighborhoods.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
      </div>
      <label className="label">Observação<textarea name="observation" className="input min-h-24 py-3" placeholder="Cobrir falta no turno da noite" /></label>
      <button aria-busy={isPublishing} type="submit" disabled={isPublishing} className="danger">
        {isPublishing ? "Criando..." : "Criar vaga URGENTE"}
      </button>
    </form>
  );
}
