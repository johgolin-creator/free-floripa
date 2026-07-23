import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ClipboardList, Plus, UsersRound, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import type { CreateJobInput } from "../lib/store";
import { formatCurrency } from "../lib/format";
import { getJobStatus } from "../lib/rules";
import type { JobFunction, Neighborhood, PaymentMethod } from "../lib/types";

const requiredJobFieldGroups = [
  { title: "Vaga", fields: ["Título", "Função", "Quantidade"] },
  { title: "Turno", fields: ["Data", "Entrada", "Saída", "Valor da diária", "Pagamento"] },
  { title: "Local", fields: ["Bairro", "Endereço aproximado", "Endereço completo"] },
  { title: "Requisitos", fields: ["Uniforme", "Experiência exigida", "Descrição", "Benefícios"] }
];

export function CompanyDashboard() {
  const { state, currentCompany, createJob, createUrgentReplacement } = useAppStore();
  const [showJobForm, setShowJobForm] = useState(false);
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [message, setMessage] = useState("");
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const companyApplications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
  const openJobs = companyJobs.filter((job) => {
    const status = getJobStatus(job);
    return status === "Publicada" || status === "Urgente" || status === "Em andamento";
  });
  const confirmed = companyApplications.filter((application) => application.status === "Aprovada").length;
  const absences = companyApplications.filter((application) => application.status === "Falta registrada").length;

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Painel da empresa"
        title={currentCompany.establishmentName}
        description="Publique vagas temporárias, acompanhe candidatos e confirme sua equipe."
        action={
          <div className="grid gap-2 sm:flex">
            <button type="button" onClick={() => setShowUrgentForm(true)} className="danger">
              <Zap size={17} /> Preciso de reposição urgente
            </button>
            <button type="button" onClick={() => setShowJobForm(true)} className="primary">
              <Plus size={17} /> Criar nova vaga
            </button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Metric icon={<BriefcaseBusiness />} label="Vagas abertas" value={openJobs.length} />
        <Metric icon={<CheckCircle2 />} label="Profissionais confirmados" value={confirmed} />
        <Metric icon={<ClipboardList />} label="Candidaturas recebidas" value={companyApplications.length} />
        <Metric icon={<AlertTriangle />} label="Faltas registradas" value={absences} />
      </div>

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-4">
          <h3 className="mb-3 font-black text-navy-950">Vagas abertas</h3>
          {companyJobs.length === 0 ? (
            <EmptyState title="Nenhuma vaga publicada" text="Use os botões acima para criar uma vaga comum ou uma reposição urgente." />
          ) : (
          <div className="grid gap-3">
            {companyJobs.map((job) => (
              <article key={job.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className={job.urgent ? "badge urgent" : "badge"}>{job.urgent ? "URGENTE" : job.function}</span>
                    <h4 className="mt-2 font-black text-navy-950">{job.title}</h4>
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

        <div className="card p-4">
          <h3 className="mb-3 font-black text-navy-950">Operação</h3>
          <div className="grid gap-2 text-sm font-semibold">
            <Link to="/app/candidatos" className="secondary justify-start"><UsersRound size={17} /> Candidatos recebidos</Link>
            <Link to="/app/minhas-vagas" className="secondary justify-start"><BriefcaseBusiness size={17} /> Vagas publicadas</Link>
            <Link to="/app/equipe" className="secondary justify-start"><CheckCircle2 size={17} /> Favoritos e contratados</Link>
            <Link to="/app/equipe" className="secondary justify-start"><ClipboardList size={17} /> Histórico de contratações</Link>
          </div>
        </div>
      </section>

      {showJobForm && (
        <CreateJobModal
          title="Criar nova vaga"
          onClose={() => setShowJobForm(false)}
          onCreate={(input) => {
            createJob(input);
            setMessage("Vaga publicada com sucesso. Ela já aparece em Minhas vagas e para os trabalhadores compatíveis.");
          }}
        />
      )}
      {showUrgentForm && (
        <Modal title="Reposição urgente" onClose={() => setShowUrgentForm(false)}>
          <UrgentForm
            onSubmit={(input) => {
              createUrgentReplacement(input);
              setShowUrgentForm(false);
              setMessage("Reposição urgente publicada. Ela foi marcada como URGENTE para os trabalhadores.");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="card p-4">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <strong className="block text-2xl font-black text-navy-950">{value}</strong>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
    </article>
  );
}

function CreateJobModal({
  title,
  onClose,
  onCreate
}: {
  title: string;
  onClose: () => void;
  onCreate: (input: CreateJobInput) => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <CreateJobForm
        onSubmit={(input) => {
          onCreate(input);
          onClose();
        }}
      />
    </Modal>
  );
}

function CreateJobForm({ onSubmit }: { onSubmit: (input: CreateJobInput) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid max-h-[72vh] gap-3 overflow-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const title = String(form.get("title") || "").trim();
        const description = String(form.get("description") || "").trim();
        const dailyValue = Number(form.get("dailyValue"));
        const quantity = Number(form.get("quantity"));
        const date = String(form.get("date") || "").trim();
        const startsAt = String(form.get("startsAt") || "").trim();
        const endsAt = String(form.get("endsAt") || "").trim();
        const approximateAddress = String(form.get("approximateAddress") || "").trim();
        const fullAddress = String(form.get("fullAddress") || "").trim();
        const uniform = String(form.get("uniform") || "").trim();
        const requiredExperience = String(form.get("requiredExperience") || "").trim();
        const benefits = String(form.get("benefits") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const missingFields = [
          !title && "título",
          quantity <= 0 && "quantidade",
          !date && "data",
          !startsAt && "entrada",
          !endsAt && "saída",
          dailyValue <= 0 && "valor da diária",
          !approximateAddress && "endereço aproximado",
          !fullAddress && "endereço completo",
          !uniform && "uniforme",
          !requiredExperience && "experiência exigida",
          !description && "descrição",
          benefits.length === 0 && "benefícios"
        ].filter(Boolean);
        if (missingFields.length > 0) {
          setError(`Preencha os campos obrigatórios: ${missingFields.join(", ")}.`);
          return;
        }
        setError("");
        onSubmit({
          title,
          function: form.get("function") as JobFunction,
          quantity,
          date,
          startsAt,
          endsAt,
          dailyValue,
          paymentMethod: form.get("paymentMethod") as PaymentMethod,
          approximateAddress,
          fullAddress,
          neighborhood: form.get("neighborhood") as Neighborhood,
          uniform,
          requiredExperience,
          description,
          benefits,
          urgent: form.get("urgent") === "on"
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <RequiredFieldSummary />
      <label className="label">Título<input name="title" className="input" required placeholder="Garçom para beach club" /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Função<select name="function" className="input" required>{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" className="input" defaultValue="1" required /></label>
        <label className="label">Data<input name="date" type="date" className="input" required /></label>
        <label className="label">Valor da diária<input name="dailyValue" type="number" min="1" className="input" required placeholder="250" /></label>
        <label className="label">Entrada<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Saída<input name="endsAt" type="time" className="input" required /></label>
        <label className="label">Pagamento<select name="paymentMethod" className="input" required><option>Dinheiro</option><option>Pix</option><option>Transferência</option><option>A combinar</option></select></label>
        <label className="label">Bairro<select name="neighborhood" className="input" required>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="label">Endereço aproximado<input name="approximateAddress" className="input" required placeholder="Jurerê, próximo à praia" /></label>
      <label className="label">Endereço completo<input name="fullAddress" className="input" required placeholder="Liberado após confirmação" /></label>
      <label className="label">Uniforme<input name="uniform" className="input" required placeholder="Camisa preta e calça preta" /></label>
      <label className="label">Experiência exigida<input name="requiredExperience" className="input" required placeholder="Experiência com atendimento" /></label>
      <label className="label">Descrição<textarea name="description" className="input min-h-24 py-3" required /></label>
      <label className="label">Benefícios<input name="benefits" className="input" required placeholder="Alimentação, transporte" /></label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input name="urgent" type="checkbox" className="h-5 w-5 accent-alert" /> Vaga urgente</label>
      <button type="submit" className="primary">Publicar vaga</button>
    </form>
  );
}

function RequiredFieldSummary() {
  return (
    <section className="rounded-lg border border-aqua-100 bg-aqua-100 p-3">
      <div className="flex items-center gap-2 text-sm font-black text-navy-950">
        <ClipboardList size={17} /> Campos obrigatórios
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {requiredJobFieldGroups.map((group) => (
          <div key={group.title} className="rounded-lg bg-white p-3">
            <strong className="text-xs uppercase text-aqua-700">{group.title}</strong>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{group.fields.join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function UrgentForm({ onSubmit }: { onSubmit: (input: any) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const quantity = Number(form.get("quantity"));
        const startsAt = String(form.get("startsAt") || "").trim();
        const dailyValue = Number(form.get("dailyValue"));
        if (quantity <= 0 || !startsAt || dailyValue <= 0) {
          setError("Preencha quantidade, horário e valor para criar a reposição urgente.");
          return;
        }
        setError("");
        onSubmit({
          function: form.get("function") as JobFunction,
          quantity,
          startsAt,
          dailyValue,
          neighborhood: form.get("neighborhood") as Neighborhood,
          observation: String(form.get("observation") || "")
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Função<select name="function" className="input" required>{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" defaultValue="1" className="input" required /></label>
        <label className="label">Horário<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Valor<input name="dailyValue" type="number" min="1" className="input" required placeholder="280" /></label>
        <label className="label md:col-span-2">Bairro<select name="neighborhood" className="input" required>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="label">Observação<textarea name="observation" className="input min-h-24 py-3" placeholder="Cobrir falta no turno da noite" /></label>
      <button type="submit" className="danger">Criar vaga URGENTE</button>
    </form>
  );
}
