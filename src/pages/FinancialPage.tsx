import { BriefcaseBusiness, CalendarCheck, Clock3, CreditCard, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate } from "../lib/format";

export function FinancialPage() {
  const { state, currentWorker, currentCompany } = useAppStore();

  if (state.activeRole === "empresa") {
    const companyJobs = state.jobs.filter((job) => job.companyId === currentCompany.id);
    const companyApplications = state.applications.filter((application) =>
      companyJobs.some((job) => job.id === application.jobId)
    );
    const confirmed = companyApplications.filter(
      (application) => application.status === "Aprovada" || application.status === "Trabalho concluído"
    );
    const completed = companyApplications.filter((application) => application.status === "Trabalho concluído");
    const plannedTotal = companyJobs.reduce((total, job) => total + job.dailyValue * job.quantity, 0);
    const confirmedTotal = confirmed.reduce((total, application) => {
      const job = companyJobs.find((item) => item.id === application.jobId);
      return total + (job?.dailyValue ?? 0);
    }, 0);
    const completedTotal = completed.reduce((total, application) => {
      const job = companyJobs.find((item) => item.id === application.jobId);
      return total + (job?.dailyValue ?? 0);
    }, 0);

    return (
      <FinancialShell
        title="Financeiro da empresa"
        description="Acompanhe custo previsto, profissionais confirmados e trabalhos concluídos."
        metrics={[
          { icon: <BriefcaseBusiness size={18} />, label: "previsto", value: formatCurrency(plannedTotal) },
          { icon: <Clock3 size={18} />, label: "confirmado", value: formatCurrency(confirmedTotal) },
          { icon: <CalendarCheck size={18} />, label: "concluído", value: formatCurrency(completedTotal) },
          { icon: <WalletCards size={18} />, label: "vagas", value: String(companyJobs.length) }
        ]}
      >
        {companyJobs.length === 0 ? (
          <EmptyState title="Sem movimentação financeira" text="Crie vagas para acompanhar os custos previstos e concluídos." />
        ) : (
          <div className="grid gap-3">
            {companyJobs.map((job) => {
              const jobApplications = companyApplications.filter((application) => application.jobId === job.id);
              const jobConfirmed = jobApplications.filter(
                (application) => application.status === "Aprovada" || application.status === "Trabalho concluído"
              ).length;
              const jobCompleted = jobApplications.filter((application) => application.status === "Trabalho concluído").length;
              return (
                <article key={job.id} className="worker-application-card">
                  <div className="worker-card-head">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="badge">{job.function}</span>
                        <span className="badge">{formatDate(job.date)}</span>
                        {job.urgent && <UrgentBadge />}
                      </div>
                      <h3>{job.title}</h3>
                      <p className="text-sm font-semibold text-slate-600">{job.neighborhood} - {job.quantity} vaga{job.quantity === 1 ? "" : "s"}</p>
                    </div>
                    <strong className="worker-next-step">{formatCurrency(job.dailyValue)} por diária</strong>
                  </div>
                  <div className="worker-info-grid">
                    <Info label="previsto" value={formatCurrency(job.dailyValue * job.quantity)} />
                    <Info label="confirmado" value={formatCurrency(job.dailyValue * jobConfirmed)} />
                    <Info label="concluído" value={formatCurrency(job.dailyValue * jobCompleted)} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </FinancialShell>
    );
  }

  const workerApplications = state.applications.filter((application) => application.workerId === currentWorker.id);
  const approved = workerApplications.filter((application) => application.status === "Aprovada");
  const completed = workerApplications.filter((application) => application.status === "Trabalho concluído");
  const approvedTotal = approved.reduce((total, application) => {
    const job = state.jobs.find((item) => item.id === application.jobId);
    return total + (job?.dailyValue ?? 0);
  }, 0);
  const completedTotal = completed.reduce((total, application) => {
    const job = state.jobs.find((item) => item.id === application.jobId);
    return total + (job?.dailyValue ?? 0);
  }, 0);

  return (
    <FinancialShell
      title="Financeiro do freelancer"
      description="Veja valores previstos em turnos aprovados e histórico de trabalhos concluídos."
      metrics={[
        { icon: <Clock3 size={18} />, label: "a receber", value: formatCurrency(approvedTotal) },
        { icon: <CalendarCheck size={18} />, label: "concluído", value: formatCurrency(completedTotal) },
        { icon: <BriefcaseBusiness size={18} />, label: "aprovados", value: String(approved.length) },
        { icon: <CreditCard size={18} />, label: "plano", value: state.subscription.plan }
      ]}
    >
      {workerApplications.length === 0 ? (
        <EmptyState title="Nenhum valor ainda" text="Quando suas candidaturas forem aprovadas, os valores aparecerão aqui." />
      ) : (
        <div className="grid gap-3">
          {workerApplications.map((application) => {
            const job = state.jobs.find((item) => item.id === application.jobId);
            const company = state.companies.find((item) => item.id === job?.companyId);
            if (!job) return null;
            return (
              <article key={application.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge">{application.status}</span>
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatDate(job.date)}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{company?.establishmentName ?? "Empresa"} - {job.neighborhood}</p>
                  </div>
                  <strong className="worker-next-step">{formatCurrency(job.dailyValue)}</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </FinancialShell>
  );
}

function FinancialShell({
  title,
  description,
  metrics,
  children
}: {
  title: string;
  description: string;
  metrics: { icon: ReactNode; label: string; value: string }[];
  children: ReactNode;
}) {
  return (
    <div>
      <SectionHeader eyebrow="Financeiro" title={title} description={description} />
      <section className="smart-dashboard-hero mb-5">
        <div>
          <span className="section-eyebrow w-fit">Resumo financeiro</span>
          <h2>Valores do fluxo de trabalho</h2>
          <p>Uma visão rápida para controlar custo, previsão e histórico sem sair do app.</p>
        </div>
        <div className="smart-dashboard-metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="smart-dashboard-metric">
              <span>{metric.icon}</span>
              <strong>{metric.value}</strong>
              <small>{metric.label}</small>
            </div>
          ))}
        </div>
      </section>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="worker-info-tile">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
