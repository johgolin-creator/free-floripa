import { useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ClipboardList, Plus, UsersRound, Zap } from "lucide-react";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import type { CreateJobInput } from "../lib/store";
import { formatCurrency } from "../lib/format";
import type { JobFunction, Neighborhood, PaymentMethod } from "../lib/types";

export function CompanyDashboard() {
  const { state, currentCompany, createJob, createUrgentReplacement } = useAppStore();
  const [showJobForm, setShowJobForm] = useState(false);
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
  const companyApplications = state.applications.filter((application) => companyJobs.some((job) => job.id === application.jobId));
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
        <Metric icon={<BriefcaseBusiness />} label="Vagas abertas" value={companyJobs.length} />
        <Metric icon={<CheckCircle2 />} label="Profissionais confirmados" value={confirmed} />
        <Metric icon={<ClipboardList />} label="Candidaturas recebidas" value={companyApplications.length} />
        <Metric icon={<AlertTriangle />} label="Faltas registradas" value={absences} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-4">
          <h3 className="mb-3 font-black text-navy-950">Vagas abertas</h3>
          <div className="grid gap-3">
            {companyJobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className={job.urgent ? "badge urgent" : "badge"}>{job.urgent ? "URGENTE" : job.function}</span>
                    <h4 className="mt-2 font-black text-navy-950">{job.title}</h4>
                    <p className="text-sm text-slate-600">{job.neighborhood} · {job.startsAt} às {job.endsAt} · {formatCurrency(job.dailyValue)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{job.filled}/{job.quantity} confirmados</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="mb-3 font-black text-navy-950">Operação</h3>
          <div className="grid gap-2 text-sm font-semibold text-slate-600">
            <span className="flex items-center gap-2"><UsersRound size={17} /> Candidatos recebidos</span>
            <span className="flex items-center gap-2"><BriefcaseBusiness size={17} /> Trabalhos em andamento</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={17} /> Trabalhos concluídos</span>
            <span className="flex items-center gap-2"><ClipboardList size={17} /> Histórico de contratações</span>
          </div>
        </div>
      </section>

      {showJobForm && <CreateJobModal title="Criar nova vaga" onClose={() => setShowJobForm(false)} onCreate={createJob} />}
      {showUrgentForm && (
        <Modal title="Reposição urgente" onClose={() => setShowUrgentForm(false)}>
          <UrgentForm
            onSubmit={(input) => {
              createUrgentReplacement(input);
              setShowUrgentForm(false);
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
  onCreate: (input: CreateJobInput) => string;
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
        if (!title || !description || dailyValue <= 0 || quantity <= 0) {
          setError("Preencha título, descrição, quantidade e valor da diária.");
          return;
        }
        setError("");
        onSubmit({
          title,
          function: form.get("function") as JobFunction,
          quantity,
          date: String(form.get("date")),
          startsAt: String(form.get("startsAt")),
          endsAt: String(form.get("endsAt")),
          dailyValue,
          paymentMethod: form.get("paymentMethod") as PaymentMethod,
          approximateAddress: String(form.get("approximateAddress")),
          fullAddress: String(form.get("fullAddress")),
          neighborhood: form.get("neighborhood") as Neighborhood,
          uniform: String(form.get("uniform")),
          requiredExperience: String(form.get("requiredExperience")),
          description,
          benefits: String(form.get("benefits")).split(",").map((item) => item.trim()).filter(Boolean),
          urgent: form.get("urgent") === "on"
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <label className="label">Título<input name="title" className="input" placeholder="Garçom para beach club" /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Função<select name="function" className="input">{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" className="input" defaultValue="1" /></label>
        <label className="label">Data<input name="date" type="date" className="input" required /></label>
        <label className="label">Valor da diária<input name="dailyValue" type="number" min="1" className="input" placeholder="250" /></label>
        <label className="label">Entrada<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Saída<input name="endsAt" type="time" className="input" required /></label>
        <label className="label">Pagamento<select name="paymentMethod" className="input"><option>Dinheiro</option><option>Pix</option><option>Transferência</option><option>A combinar</option></select></label>
        <label className="label">Bairro<select name="neighborhood" className="input">{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="label">Endereço aproximado<input name="approximateAddress" className="input" placeholder="Jurerê, próximo à praia" /></label>
      <label className="label">Endereço completo<input name="fullAddress" className="input" placeholder="Liberado após confirmação" /></label>
      <label className="label">Uniforme<input name="uniform" className="input" placeholder="Camisa preta e calça preta" /></label>
      <label className="label">Experiência exigida<input name="requiredExperience" className="input" placeholder="Experiência com atendimento" /></label>
      <label className="label">Descrição<textarea name="description" className="input min-h-24 py-3" /></label>
      <label className="label">Benefícios<input name="benefits" className="input" placeholder="Alimentação, transporte" /></label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input name="urgent" type="checkbox" className="h-5 w-5 accent-alert" /> Vaga urgente</label>
      <button type="submit" className="primary">Publicar vaga</button>
    </form>
  );
}

function UrgentForm({ onSubmit }: { onSubmit: (input: any) => void }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          function: form.get("function") as JobFunction,
          quantity: Number(form.get("quantity")),
          startsAt: String(form.get("startsAt")),
          dailyValue: Number(form.get("dailyValue")),
          neighborhood: form.get("neighborhood") as Neighborhood,
          observation: String(form.get("observation") || "")
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Função<select name="function" className="input">{functions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label">Quantidade<input name="quantity" type="number" min="1" defaultValue="1" className="input" /></label>
        <label className="label">Horário<input name="startsAt" type="time" className="input" required /></label>
        <label className="label">Valor<input name="dailyValue" type="number" min="1" className="input" placeholder="280" /></label>
        <label className="label md:col-span-2">Bairro<select name="neighborhood" className="input">{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="label">Observação<textarea name="observation" className="input min-h-24 py-3" placeholder="Cobrir falta no turno da noite" /></label>
      <button type="submit" className="danger">Criar vaga URGENTE</button>
    </form>
  );
}
