import { AlertTriangle, BriefcaseBusiness, CalendarCheck, Clock3, CreditCard, TrendingUp, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { StatusBadge, StatusLegend } from "../components/StatusBadge";
import { TermHint } from "../components/TermHint";
import { UrgentBadge } from "../components/UrgentBadge";
import { useAppStore } from "../lib/store";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";

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
    const companyLedger = state.coinLedger.filter((entry) => entry.role === "empresa");
    const coinPurchases = companyLedger.filter((entry) => entry.amount > 0).reduce((total, entry) => total + entry.amount, 0);
    const coinSpent = Math.abs(companyLedger.filter((entry) => entry.amount < 0).reduce((total, entry) => total + entry.amount, 0));
    const cancellationFees = Math.abs(
      companyLedger
        .filter((entry) => entry.reason === "cancel_filled_job")
        .reduce((total, entry) => total + entry.amount, 0)
    );
    const canceledJobs = companyJobs.filter((job) => job.status === "Cancelada");
    const costPerConfirmed = confirmed.length > 0 ? confirmedTotal / confirmed.length : 0;
    const recentCompanyLedger = companyLedger.slice(0, 8);

    return (
      <FinancialShell
        title="Financeiro da empresa"
        description="Acompanhe custo previsto, profissionais confirmados e trabalhos concluídos."
        metrics={[
          { icon: <BriefcaseBusiness size={18} />, label: "previsto", value: formatCurrency(plannedTotal) },
          { icon: <Clock3 size={18} />, label: "confirmado", value: formatCurrency(confirmedTotal) },
          { icon: <CalendarCheck size={18} />, label: "concluído", value: formatCurrency(completedTotal) },
          { icon: <WalletCards size={18} />, label: "saldo moedas", value: String(state.subscription.companyCreditsRemaining) }
        ]}
      >
        <section className="mb-4 grid gap-3 md:grid-cols-4">
          <StatTile variant="primary" icon={<WalletCards size={18} />} label={<TermHint term="moedas" role="empresa">Moedas compradas</TermHint>} value={`${coinPurchases} moeda${coinPurchases === 1 ? "" : "s"}`} />
          <StatTile icon={<CreditCard size={18} />} label="Moedas usadas" value={`${coinSpent} moeda${coinSpent === 1 ? "" : "s"}`} />
          <StatTile tone={cancellationFees > 0 ? "alert" : "normal"} icon={<AlertTriangle size={18} />} label="Taxas de cancelamento" value={`${cancellationFees} moeda${cancellationFees === 1 ? "" : "s"}`} />
          <StatTile icon={<TrendingUp size={18} />} label="Custo por confirmado" value={formatCurrency(costPerConfirmed)} />
        </section>

        <section className="mb-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="card p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="section-eyebrow">Controle empresarial</span>
                <h3 className="text-xl font-black text-white">Resumo de custos e moedas</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Separe o custo dos turnos e o uso de moedas em ações sensíveis, como cancelamento de vaga preenchida.
                </p>
              </div>
              <span className="badge bg-aqua-50 text-aqua-700">
                <WalletCards size={15} /> <TermHint term="moedas" role="empresa">Saldo: {state.subscription.companyCreditsRemaining}</TermHint>
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Info label="vagas criadas" value={String(companyJobs.length)} />
              <Info label="vagas canceladas" value={String(canceledJobs.length)} />
              <Info label="profissionais confirmados" value={String(confirmed.length)} />
              <Info label="trabalhos concluídos" value={String(completed.length)} />
              <Info label="custo confirmado" value={formatCurrency(confirmedTotal)} />
              <Info label="custo concluído" value={formatCurrency(completedTotal)} />
            </div>
          </article>

          <article className="card p-4">
            <div className="mb-4">
              <span className="section-eyebrow">Extrato empresarial</span>
              <h3 className="text-xl font-black text-white">Moedas recentes</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Compras, cobranças e ajustes que impactam o saldo da empresa.</p>
            </div>
            {recentCompanyLedger.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Nenhuma movimentação de moedas empresariais ainda.
              </div>
            ) : (
              <div className="grid gap-2">
                {recentCompanyLedger.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="text-sm text-white">{getCompanyCoinTitle(entry.reason)}</strong>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(entry.createdAt)}</p>
                      </div>
                      <span className={`text-sm font-black ${entry.amount > 0 ? "text-aqua-700" : "text-white"}`}>
                        {entry.amount > 0 ? "+" : ""}{entry.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

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
              const jobCoinFees = Math.abs(
                companyLedger
                  .filter((entry) => entry.jobId === job.id && entry.amount < 0)
                  .reduce((total, entry) => total + entry.amount, 0)
              );
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
                    <div className="worker-next-step">
                      <small>Diária</small>
                      <strong>{formatCurrency(job.dailyValue)}</strong>
                      <span>{job.status}</span>
                    </div>
                  </div>
                  <div className="worker-info-grid">
                    <Info label="previsto" value={formatCurrency(job.dailyValue * job.quantity)} />
                    <Info label="confirmado" value={formatCurrency(job.dailyValue * jobConfirmed)} />
                    <Info label="concluído" value={formatCurrency(job.dailyValue * jobCompleted)} />
                    <Info label="moedas cobradas" value={`${jobCoinFees} moeda${jobCoinFees === 1 ? "" : "s"}`} />
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
      {workerApplications.length > 0 && <StatusLegend type="application" />}
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
                      <StatusBadge type="application" status={application.status} />
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

function getCompanyCoinTitle(reason: string) {
  if (reason === "package_professional") return "Pacote Profissional";
  if (reason === "package_plus") return "Pacote Plus";
  if (reason === "coin_pack") return "Compra de moedas";
  if (reason === "cancel_filled_job") return "Cancelamento de vaga preenchida";
  if (reason === "admin_adjustment") return "Ajuste administrativo";
  return "Movimentação de moedas";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="worker-info-tile">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-white">{value}</strong>
    </div>
  );
}
