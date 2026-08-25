import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Search,
  ShieldCheck,
  Target,
  UserRound,
  WalletCards
} from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UrgentBadge } from "../components/UrgentBadge";
import { formatCurrency, formatDate } from "../lib/format";
import { getJobStatus, getOpenSlots } from "../lib/rules";
import { useAppStore } from "../lib/store";
import type { TrustReport } from "../lib/types";

type AdminTab = "Resumo" | "Usuários" | "Vagas" | "Moedas" | "Alertas";

const tabs: AdminTab[] = ["Resumo", "Usuários", "Vagas", "Moedas", "Alertas"];

export function AdminPage() {
  const { state, resolveTrustReport, toggleWorkerBlock, toggleCompanyBlock } = useAppStore();
  const [tab, setTab] = useState<AdminTab>("Resumo");
  const [search, setSearch] = useState("");
  const normalizedSearch = normalize(search);
  const blockedWorkerIds = state.adminModeration.blockedWorkerIds;
  const blockedCompanyIds = state.adminModeration.blockedCompanyIds;

  const openJobs = state.jobs.filter((job) => {
    const status = getJobStatus(job);
    return status === "Publicada" || status === "Urgente" || status === "Em andamento";
  });
  const pendingApplications = state.applications.filter(
    (application) => application.status === "Enviada" || application.status === "Em análise"
  );
  const approvedApplications = state.applications.filter(
    (application) => application.status === "Aprovada" || application.status === "Trabalho concluído"
  );
  const plannedVolume = state.jobs.reduce((total, job) => total + job.dailyValue * job.quantity, 0);
  const confirmedVolume = approvedApplications.reduce((total, application) => {
    const job = state.jobs.find((item) => item.id === application.jobId);
    return total + (job?.dailyValue ?? 0);
  }, 0);
  const coinRevenue = state.coinLedger
    .filter((entry) => entry.kind === "purchase")
    .reduce((total, entry) => total + coinPackagePrice(entry.reason), 0);
  const alerts = useMemo(() => buildAlerts(state), [state]);
  const openReports = state.trustReports.filter((report) => report.status === "Aberto");
  const resolvedReports = state.trustReports.filter((report) => report.status === "Resolvido").slice(0, 8);

  const filteredWorkers = state.workers.filter((worker) =>
    normalize(`${worker.name} ${worker.email} ${worker.phone} ${worker.functions.join(" ")}`).includes(normalizedSearch)
  );
  const filteredCompanies = state.companies.filter((company) =>
    normalize(`${company.establishmentName} ${company.responsibleName} ${company.email} ${company.phone}`).includes(normalizedSearch)
  );
  const filteredJobs = state.jobs.filter((job) => {
    const company = state.companies.find((item) => item.id === job.companyId);
    return normalize(`${job.title} ${job.function} ${job.neighborhood} ${company?.establishmentName ?? ""}`).includes(normalizedSearch);
  });
  const coinPurchaseCount = state.coinLedger.filter((entry) => entry.kind === "purchase").length;

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Admin"
        title="Painel administrativo"
        description="Acompanhe usuários, empresas, vagas, moedas e sinais de risco em um só lugar."
      />

      <section className="smart-dashboard-hero">
        <div>
          <span className="section-eyebrow">Controle operacional</span>
          <h2>Visão geral do PONT</h2>
          <p>
            Use este painel para enxergar crescimento, pendências e contas que precisam de revisão antes que virem problema.
          </p>
        </div>
        <div className="smart-dashboard-metrics">
          <AdminMetric icon={<UserRound size={19} />} label="freelancers" value={String(state.workers.length)} />
          <AdminMetric icon={<Building2 size={19} />} label="empresas" value={String(state.companies.length)} />
          <AdminMetric icon={<BriefcaseBusiness size={19} />} label="vagas abertas" value={String(openJobs.length)} />
          <AdminMetric icon={<AlertTriangle size={19} />} label="alertas" value={String(alerts.length + openReports.length)} tone={alerts.length + openReports.length > 0 ? "alert" : "normal"} />
        </div>
        <div className="smart-dashboard-actions">
          <Link to="/app/admin/captacao" className="company-action company-action-primary">
            <Target size={17} /> Captação de empresas
          </Link>
        </div>
      </section>

      <section className="jobs-filter-panel">
        <div className="jobs-filter-title">
          <div>
            <h3><Search size={18} /> Administrar dados</h3>
            <p>Busque por nome, e-mail, vaga, função ou empresa.</p>
          </div>
          <span className="badge">{blockedWorkerIds.length + blockedCompanyIds.length} bloqueio(s)</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no painel admin"
          />
          <div className="worker-filter-buttons">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`worker-filter-button ${tab === item ? "is-active" : ""}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tab === "Resumo" && (
        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="card p-4">
            <h3 className="mb-3 font-black text-white">Indicadores principais</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile icon={<ClipboardList />} label="Candidaturas pendentes" value={String(pendingApplications.length)} />
              <InfoTile icon={<CheckCircle2 />} label="Candidaturas confirmadas" value={String(approvedApplications.length)} />
              <InfoTile icon={<WalletCards />} label="Volume previsto" value={formatCurrency(plannedVolume)} />
              <InfoTile icon={<WalletCards />} label="Volume confirmado" value={formatCurrency(confirmedVolume)} />
              <InfoTile icon={<WalletCards />} label="Receita de moedas" value={formatCurrency(coinRevenue)} />
            </div>
          </div>
          <div className="card p-4">
            <h3 className="mb-3 font-black text-white">Ações rápidas</h3>
            <div className="grid gap-2 text-sm font-semibold text-slate-600">
              <span className="flex items-center gap-2"><ShieldCheck size={16} /> Revisar {openReports.length} relato(s) e {alerts.length} alerta(s) operacionais.</span>
              <span className="flex items-center gap-2"><Ban size={16} /> {blockedWorkerIds.length} trabalhador(es) bloqueado(s).</span>
              <span className="flex items-center gap-2"><Ban size={16} /> {blockedCompanyIds.length} empresa(s) bloqueada(s).</span>
              <span className="flex items-center gap-2"><WalletCards size={16} /> Trabalhador: {state.subscription.creditsRemaining} moeda(s).</span>
              <span className="flex items-center gap-2"><WalletCards size={16} /> Empresa: {state.subscription.companyCreditsRemaining} moeda(s).</span>
            </div>
          </div>
        </section>
      )}

      {tab === "Usuários" && (
        <section className="grid gap-4 xl:grid-cols-2">
          <AdminList title="Trabalhadores" count={filteredWorkers.length}>
            {filteredWorkers.map((worker) => {
              const blocked = blockedWorkerIds.includes(worker.id);
              const reportCount = countOpenReportsForWorker(openReports, worker.id);
              return (
                <AdminRow
                  key={worker.id}
                  icon={<UserRound size={18} />}
                  title={worker.name}
                  subtitle={`${worker.email} - ${worker.functions.join(", ") || "Sem função"}`}
                  meta={`${worker.rating.toFixed(1)} nota - ${worker.completedJobs} trabalhos - ${worker.attendanceRate}% presença`}
                  blocked={blocked}
                  reportCount={reportCount}
                  onToggle={() => toggleWorkerBlock(worker.id)}
                />
              );
            })}
          </AdminList>
          <AdminList title="Empresas" count={filteredCompanies.length}>
            {filteredCompanies.map((company) => {
              const blocked = blockedCompanyIds.includes(company.id);
              const jobs = state.jobs.filter((job) => job.companyId === company.id).length;
              const reportCount = countOpenReportsForCompany(openReports, company.id, state.jobs);
              return (
                <AdminRow
                  key={company.id}
                  icon={<Building2 size={18} />}
                  title={company.establishmentName}
                  subtitle={`${company.responsibleName} - ${company.email}`}
                  meta={`${jobs} vaga(s) - ${company.category} - ${company.neighborhood}`}
                  blocked={blocked}
                  reportCount={reportCount}
                  onToggle={() => toggleCompanyBlock(company.id)}
                />
              );
            })}
          </AdminList>
        </section>
      )}

      {tab === "Vagas" && (
        <AdminList title="Vagas publicadas" count={filteredJobs.length}>
          {filteredJobs.map((job) => {
            const company = state.companies.find((item) => item.id === job.companyId);
            const openSlots = getOpenSlots(job);
            const reportCount = countOpenReportsForJob(openReports, job.id);
            return (
              <article key={job.id} className="worker-application-card">
                <div className="worker-card-head">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {job.urgent ? <UrgentBadge /> : <StatusBadge type="job" status={getJobStatus(job)} />}
                      <span className="badge">{job.function}</span>
                      <span className="badge">{formatDate(job.date)}</span>
                      {reportCount > 0 && <span className="badge border-red-100 bg-red-50 text-alert">{reportCount} relato(s)</span>}
                    </div>
                    <h3>{job.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {company?.establishmentName ?? "Empresa"} - {job.neighborhood} - {formatCurrency(job.dailyValue)}
                    </p>
                  </div>
                  <strong className="worker-next-step">{openSlots} vaga(s) em aberto</strong>
                </div>
              </article>
            );
          })}
        </AdminList>
      )}

      {tab === "Moedas" && (
        <section className="grid gap-4 lg:grid-cols-[0.8fr_1fr]">
          <div className="card p-4">
            <h3 className="mb-3 font-black text-white">Carteiras da conta atual</h3>
            <div className="grid gap-3">
              <InfoTile icon={<WalletCards />} label="Saldo do trabalhador" value={`${state.subscription.creditsRemaining} moeda(s)`} />
              <InfoTile icon={<WalletCards />} label="Saldo da empresa" value={`${state.subscription.companyCreditsRemaining} moeda(s)`} />
              <InfoTile icon={<BriefcaseBusiness />} label="Compras de moedas" value={String(coinPurchaseCount)} />
              <InfoTile icon={<ClipboardList />} label="Candidaturas enviadas" value={String(state.applications.length)} />
            </div>
          </div>
          <AdminList title="Uso recente de moedas" count={state.coinLedger.length}>
            {state.coinLedger.slice(0, 12).map((transaction) => {
              const job = transaction.jobId ? state.jobs.find((item) => item.id === transaction.jobId) : undefined;
              return (
                <CoinRow
                  key={transaction.id}
                  title={getCoinAdminTitle(transaction.reason)}
                  text={`${transaction.role === "empresa" ? "Empresa" : "Trabalhador"} - ${job?.title ?? "Sem vaga vinculada"}`}
                  amount={`${transaction.amount > 0 ? "+" : ""}${transaction.amount} moeda${Math.abs(transaction.amount) === 1 ? "" : "s"}`}
                />
              );
            })}
          </AdminList>
        </section>
      )}

      {tab === "Alertas" && (
        <AdminList title="Relatos e alertas operacionais" count={alerts.length + openReports.length}>
          {openReports.map((report) => {
            const reportedJob = report.targetType === "job" ? state.jobs.find((job) => job.id === report.targetId) : undefined;
            const reportedJobCompany = reportedJob ? state.companies.find((company) => company.id === reportedJob.companyId) : undefined;
            const blockTargetCompanyId = report.targetType === "company" ? report.targetId : reportedJobCompany?.id;
            const targetBlocked =
              (report.targetType === "worker" && blockedWorkerIds.includes(report.targetId)) ||
              Boolean(blockTargetCompanyId && blockedCompanyIds.includes(blockTargetCompanyId));
            return (
              <ReportRow
                key={report.id}
                report={report}
                targetMeta={
                  reportedJobCompany
                    ? `Vaga vinculada à empresa ${reportedJobCompany.establishmentName}.`
                    : undefined
                }
                targetBlocked={targetBlocked}
                onResolve={() => resolveTrustReport(report.id)}
                onBlock={
                  report.targetType === "worker"
                    ? () => toggleWorkerBlock(report.targetId)
                    : blockTargetCompanyId
                      ? () => toggleCompanyBlock(blockTargetCompanyId)
                      : undefined
                }
              />
            );
          })}
          {openReports.length === 0 && (
            <article className="worker-application-card">
              <div className="worker-card-head">
                <div>
                  <span className="badge border-aqua-100 bg-aqua-50 text-aqua-700">Sem relatos abertos</span>
                  <h3 className="mt-2">Nenhuma denúncia aguardando revisão</h3>
                  <p className="text-sm font-semibold text-slate-600">Quando trabalhadores ou empresas relatarem problemas, eles aparecerão aqui primeiro.</p>
                </div>
              </div>
            </article>
          )}
          {alerts.map((alert) => (
            <article key={alert.id} className="worker-application-card border-amber-100 bg-amber-50/50">
              <div className="worker-card-head">
                <div className="flex gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle size={20} />
                  </span>
                  <div>
                    <span className="badge border-amber-200 bg-amber-50 text-amber-700">{alert.kind}</span>
                    <h3 className="mt-2">{alert.title}</h3>
                    <p className="text-sm font-semibold leading-6 text-slate-600">{alert.text}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {resolvedReports.length > 0 && (
            <div className="mt-2 grid gap-3 border-t border-slate-200 pt-4">
              <div>
                <h3 className="font-black text-white">Histórico resolvido</h3>
                <p className="text-sm font-semibold text-slate-600">Últimos relatos marcados como resolvidos pela administração.</p>
              </div>
              {resolvedReports.map((report) => (
                <ResolvedReportRow key={report.id} report={report} />
              ))}
            </div>
          )}
        </AdminList>
      )}
    </div>
  );
}

function buildAlerts(state: ReturnType<typeof useAppStore>["state"]) {
  const workerAlerts = state.workers
    .filter((worker) => worker.attendanceRate < 85 || worker.cancellations >= 2)
    .map((worker) => ({
      id: `worker-${worker.id}`,
      kind: "Trabalhador",
      title: worker.name,
      text: `${worker.attendanceRate}% de presença e ${worker.cancellations} cancelamento(s).`
    }));
  const jobAlerts = state.jobs
    .filter((job) => job.urgent && getOpenSlots(job) > 0)
    .map((job) => ({
      id: `job-${job.id}`,
      kind: "Vaga urgente",
      title: job.title,
      text: `${getOpenSlots(job)} vaga(s) ainda em aberto para ${formatDate(job.date)}.`
    }));
  const companyAlerts = state.companies
    .filter((company) => company.rating > 0 && company.rating < 4)
    .map((company) => ({
      id: `company-${company.id}`,
      kind: "Empresa",
      title: company.establishmentName,
      text: `Avaliação atual ${company.rating.toFixed(1)}. Vale revisar histórico e reclamações.`
    }));

  return [...workerAlerts, ...jobAlerts, ...companyAlerts];
}

function countOpenReportsForWorker(reports: TrustReport[], workerId: string) {
  return reports.filter((report) => report.targetType === "worker" && report.targetId === workerId).length;
}

function countOpenReportsForCompany(reports: TrustReport[], companyId: string, jobs: ReturnType<typeof useAppStore>["state"]["jobs"]) {
  const companyJobIds = new Set(jobs.filter((job) => job.companyId === companyId).map((job) => job.id));
  return reports.filter(
    (report) =>
      (report.targetType === "company" && report.targetId === companyId) ||
      (report.targetType === "job" && companyJobIds.has(report.targetId))
  ).length;
}

function countOpenReportsForJob(reports: TrustReport[], jobId: string) {
  return reports.filter((report) => report.targetType === "job" && report.targetId === jobId).length;
}

function AdminMetric({ icon, label, value, tone = "normal" }: { icon: ReactNode; label: string; value: string; tone?: "normal" | "alert" }) {
  return (
    <span className={`smart-dashboard-metric ${tone === "alert" ? "is-alert" : ""}`}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="worker-info-tile">
      <span className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">{icon} {label}</span>
      <strong className="mt-2 block text-lg text-white">{value}</strong>
    </div>
  );
}

function AdminList({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-black text-white">{title}</h3>
        <span className="badge">{count}</span>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function AdminRow({
  icon,
  title,
  subtitle,
  meta,
  blocked,
  reportCount = 0,
  onToggle
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  meta: string;
  blocked: boolean;
  reportCount?: number;
  onToggle: () => void;
}) {
  return (
    <article className={`worker-application-card ${blocked ? "border-red-100 bg-red-50/60" : ""}`}>
      <div className="worker-card-head">
        <div className="flex min-w-0 gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${blocked ? "bg-red-100 text-alert" : "bg-aqua-50 text-aqua-700"}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={blocked ? "badge border-red-100 bg-red-50 text-alert" : "badge"}>{blocked ? "Bloqueado" : "Ativo"}</span>
              {reportCount > 0 && <span className="badge border-amber-200 bg-amber-50 text-amber-700">{reportCount} relato(s) aberto(s)</span>}
            </div>
            <h3 className="mt-2">{title}</h3>
            <p className="text-sm font-semibold text-slate-600">{subtitle}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">{meta}</p>
          </div>
        </div>
        <button type="button" onClick={onToggle} className={blocked ? "secondary" : "danger"}>
          <Ban size={16} /> {blocked ? "Desbloquear" : "Bloquear"}
        </button>
      </div>
    </article>
  );
}

function ReportRow({
  report,
  targetMeta,
  targetBlocked,
  onResolve,
  onBlock
}: {
  report: TrustReport;
  targetMeta?: string;
  targetBlocked: boolean;
  onResolve: () => void;
  onBlock?: () => void;
}) {
  return (
    <article className="worker-application-card border-red-100 bg-red-50/50">
      <div className="worker-card-head">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-100 text-alert">
            <AlertTriangle size={20} />
          </span>
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="badge border-red-100 bg-red-50 text-alert">Relato aberto</span>
              <span className="badge">{getReportTargetLabel(report.targetType)}</span>
            </div>
            <h3 className="mt-2">{report.targetName}</h3>
            <p className="text-sm font-semibold leading-6 text-slate-600">{report.reason}</p>
            {targetMeta && <p className="mt-1 text-sm font-black text-white">{targetMeta}</p>}
            <p className="mt-1 text-xs font-black uppercase text-slate-500">
              Enviado por {report.reporterName} em {formatDate(report.createdAt.slice(0, 10))}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:min-w-40">
          {onBlock && (
            <button type="button" onClick={onBlock} className={targetBlocked ? "secondary" : "danger"}>
              <Ban size={16} /> {targetBlocked ? "Desbloquear alvo" : "Bloquear alvo"}
            </button>
          )}
          <button type="button" onClick={onResolve} className="secondary">
            <CheckCircle2 size={16} /> Marcar resolvido
          </button>
        </div>
      </div>
    </article>
  );
}

function ResolvedReportRow({ report }: { report: TrustReport }) {
  return (
    <article className="worker-application-card bg-slate-50/80">
      <div className="worker-card-head">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-aqua-100 bg-aqua-50 text-aqua-700">Resolvido</span>
            <span className="badge">{getReportTargetLabel(report.targetType)}</span>
          </div>
          <h3 className="mt-2">{report.targetName}</h3>
          <p className="text-sm font-semibold leading-6 text-slate-600">{report.reason}</p>
          <p className="mt-1 text-xs font-black uppercase text-slate-500">
            Enviado por {report.reporterName}
            {report.resolvedAt ? ` - Resolvido em ${formatDate(report.resolvedAt.slice(0, 10))}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function CoinRow({ title, text, amount }: { title: string; text: string; amount: string }) {
  return (
    <article className="worker-application-card">
      <div className="worker-card-head">
        <div>
          <span className="badge border-aqua-100 bg-aqua-50 text-aqua-700">Moeda</span>
          <h3 className="mt-2">{title}</h3>
          <p className="text-sm font-semibold text-slate-600">{text}</p>
        </div>
        <strong className="worker-next-step">{amount}</strong>
      </div>
    </article>
  );
}

function getReportTargetLabel(targetType: TrustReport["targetType"]) {
  if (targetType === "worker") return "Profissional";
  if (targetType === "company") return "Empresa";
  return "Vaga";
}

function coinPackagePrice(reason: string) {
  if (reason === "package_professional") return 19.9;
  if (reason === "package_plus") return 29.9;
  if (reason === "coin_pack") return 4.95;
  return 0;
}

function getCoinAdminTitle(reason: string) {
  if (reason === "package_professional") return "Pacote Profissional";
  if (reason === "package_plus") return "Pacote Plus";
  if (reason === "coin_pack") return "Pacote de moedas";
  if (reason === "unlock_job") return "Vaga liberada";
  if (reason === "apply_job") return "Candidatura enviada";
  if (reason === "cancel_filled_job") return "Cancelamento de vaga preenchida";
  return "Movimentação de moedas";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
