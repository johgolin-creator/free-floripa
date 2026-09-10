import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  Mail,
  MapPin,
  Phone,
  Copy,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  UserRound,
  WalletCards
} from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { UrgentBadge } from "../components/UrgentBadge";
import { Modal } from "../components/Modal";
import { AvatarButton } from "../components/AvatarButton";
import { formatCurrency, formatDate } from "../lib/format";
import { calculateReliability, getExperienceLabel, getFunctionExperience, getJobStatus, getOpenSlots } from "../lib/rules";
import { getTrustBadges } from "../lib/trust";
import { useAppStore } from "../lib/store";
import { adminActivatePlus, adminAdjustCoins, adminCoinsEnabled } from "../lib/supabaseAdminCoins";
import { adminAccountsEnabled, adminDeleteAccount, adminDeleteJob } from "../lib/adminAccounts";
import {
  adminSetCompanySalesRep,
  createSalesRep,
  deleteSalesRep,
  listSalesReps,
  salesRepSignupLink,
  salesRepsEnabled,
  updateSalesRep,
  type SalesRep,
  type SalesRepInput
} from "../lib/salesReps";
import { formatBrl, listSales, registerSale, salesEnabled, type PaymentStatus, type Sale } from "../lib/sales";
import type { Application, CompanyProfile, CompanyReview, Job, TrustReport, UserRole, WorkerProfile } from "../lib/types";

type AdminTab = "Resumo" | "Usuários" | "Vagas" | "Vendedores" | "Moedas" | "Alertas";

const tabs: AdminTab[] = ["Resumo", "Usuários", "Vagas", "Vendedores", "Moedas", "Alertas"];

export function AdminPage() {
  const {
    state,
    resolveTrustReport,
    toggleWorkerBlock,
    toggleCompanyBlock,
    removeWorkerFromState,
    removeCompanyFromState,
    removeJobFromState,
    applyCompanySoldBy
  } = useAppStore();
  const [tab, setTab] = useState<AdminTab>("Resumo");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ type: "worker" | "company"; id: string } | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!salesRepsEnabled) return;
    let active = true;
    Promise.all([listSalesReps(), salesEnabled ? listSales() : Promise.resolve([] as Sale[])])
      .then(([reps, saleRows]) => {
        if (!active) return;
        setSalesReps(reps);
        setSales(saleRows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function reloadSalesReps() {
    if (!salesRepsEnabled) return;
    setSalesReps(await listSalesReps());
  }

  async function reloadSales() {
    if (!salesEnabled) return;
    setSales(await listSales());
  }

  const salesRepByCode = useMemo(() => {
    const map = new Map<string, SalesRep>();
    for (const rep of salesReps) map.set(rep.code.toUpperCase(), rep);
    return map;
  }, [salesReps]);

  function describeSalesRep(soldBy: string | undefined) {
    const code = (soldBy ?? "").trim();
    if (!code) return "";
    const rep = salesRepByCode.get(code.toUpperCase());
    return rep ? `${rep.name} (${rep.code})` : code;
  }

  async function handleDeleteAccount(kind: "worker" | "company", id: string, name: string) {
    if (adminAccountsEnabled) {
      await adminDeleteAccount(id);
    }
    if (kind === "worker") {
      removeWorkerFromState(id);
    } else {
      removeCompanyFromState(id);
    }
    setDetail(null);
    setDeleteFeedback(`Conta de ${name} excluída.`);
  }

  async function handleDeleteJob(jobId: string, title: string) {
    if (adminAccountsEnabled) {
      await adminDeleteJob(jobId);
    }
    removeJobFromState(jobId);
    setDeleteFeedback(`Vaga "${title}" excluída.`);
  }
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
    normalize(`${company.establishmentName} ${company.responsibleName} ${company.email} ${company.phone} ${company.soldBy ?? ""}`).includes(normalizedSearch)
  );
  const filteredJobs = state.jobs.filter((job) => {
    const company = state.companies.find((item) => item.id === job.companyId);
    return normalize(`${job.title} ${job.function} ${job.neighborhood} ${company?.establishmentName ?? ""}`).includes(normalizedSearch);
  });
  const coinPurchaseCount = state.coinLedger.filter((entry) => entry.kind === "purchase").length;

  function goToUsersTab() {
    setSearch("");
    setTab("Usuários");
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Admin"
        title="Painel administrativo"
        description="Acompanhe usuários, empresas, vagas, moedas e sinais de risco em um só lugar."
      />

      {deleteFeedback && (
        <div className="rounded-lg bg-aqua-50 p-3 text-sm font-bold text-aqua-800">{deleteFeedback}</div>
      )}

      <section className="smart-dashboard-hero">
        <div>
          <span className="section-eyebrow">Controle operacional</span>
          <h2>Visão geral do PONT</h2>
          <p>
            Use este painel para enxergar crescimento, pendências e contas que precisam de revisão antes que virem problema.
          </p>
        </div>
        <div className="smart-dashboard-metrics">
          <AdminMetric
            icon={<UserRound size={19} />}
            label="freelancers"
            value={String(state.workers.length)}
            onClick={() => goToUsersTab()}
          />
          <AdminMetric
            icon={<Building2 size={19} />}
            label="empresas"
            value={String(state.companies.length)}
            onClick={() => goToUsersTab()}
          />
          <AdminMetric
            icon={<BriefcaseBusiness size={19} />}
            label="vagas abertas"
            value={String(openJobs.length)}
            onClick={() => setTab("Vagas")}
          />
          <AdminMetric
            icon={<AlertTriangle size={19} />}
            label="alertas"
            value={String(alerts.length + openReports.length)}
            tone={alerts.length + openReports.length > 0 ? "alert" : "normal"}
            onClick={() => setTab("Alertas")}
          />
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
                  avatarUrl={worker.avatarUrl}
                  title={worker.name}
                  subtitle={`${worker.email} - ${worker.functions.join(", ") || "Sem função"}`}
                  meta={`${worker.rating.toFixed(1)} nota - ${worker.completedJobs} trabalhos - ${worker.attendanceRate}% presença`}
                  blocked={blocked}
                  reportCount={reportCount}
                  onToggle={() => toggleWorkerBlock(worker.id)}
                  onOpen={() => setDetail({ type: "worker", id: worker.id })}
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
                  avatarUrl={company.logoUrl}
                  avatarFit="contain"
                  title={company.establishmentName}
                  subtitle={`${company.responsibleName} - ${company.email}`}
                  meta={`${jobs} vaga(s) - ${company.category} - ${company.neighborhood}${company.soldBy ? ` - vendedor: ${describeSalesRep(company.soldBy)}` : ""}`}
                  blocked={blocked}
                  reportCount={reportCount}
                  onToggle={() => toggleCompanyBlock(company.id)}
                  onOpen={() => setDetail({ type: "company", id: company.id })}
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
                  <div className="grid gap-2 sm:min-w-40">
                    <strong className="worker-next-step">{openSlots} vaga(s) em aberto</strong>
                    <JobDeleteButton title={job.title} onDelete={() => handleDeleteJob(job.id, job.title)} />
                  </div>
                </div>
              </article>
            );
          })}
        </AdminList>
      )}

      {tab === "Vendedores" && (
        <SalesRepsPanel
          reps={salesReps}
          companies={state.companies}
          sales={sales}
          blockedCompanyIds={blockedCompanyIds}
          enabled={salesRepsEnabled}
          onReloadReps={reloadSalesReps}
          onReloadSales={reloadSales}
          onOpenCompany={(id) => setDetail({ type: "company", id })}
        />
      )}

      {tab === "Moedas" && (
        <div className="grid gap-4">
        <CoinGrantCard />
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
        </div>
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

      {detail?.type === "worker" &&
        (() => {
          const worker = state.workers.find((item) => item.id === detail.id);
          if (!worker) return null;
          return (
            <WorkerDetailModal
              worker={worker}
              blocked={blockedWorkerIds.includes(worker.id)}
              applications={state.applications}
              jobs={state.jobs}
              companies={state.companies}
              reports={state.trustReports}
              onToggleBlock={() => toggleWorkerBlock(worker.id)}
              onDelete={() => handleDeleteAccount("worker", worker.id, worker.name)}
              onClose={() => setDetail(null)}
            />
          );
        })()}

      {detail?.type === "company" &&
        (() => {
          const company = state.companies.find((item) => item.id === detail.id);
          if (!company) return null;
          return (
            <CompanyDetailModal
              company={company}
              blocked={blockedCompanyIds.includes(company.id)}
              jobs={state.jobs}
              companyReviews={state.companyReviews}
              reports={state.trustReports}
              onToggleBlock={() => toggleCompanyBlock(company.id)}
              onDelete={() => handleDeleteAccount("company", company.id, company.establishmentName)}
              onDeleteJob={handleDeleteJob}
              salesReps={salesReps}
              onSetSalesRep={async (code) => {
                if (salesRepsEnabled) {
                  await adminSetCompanySalesRep(company.id, code);
                }
                applyCompanySoldBy(company.id, code);
              }}
              onClose={() => setDetail(null)}
            />
          );
        })()}
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

function AdminMetric({
  icon,
  label,
  value,
  tone = "normal",
  onClick
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "alert";
  onClick?: () => void;
}) {
  const className = `smart-dashboard-metric ${tone === "alert" ? "is-alert" : ""} ${onClick ? "is-clickable" : ""}`;
  const content = (
    <>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}

function CoinGrantCard() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("trabalhador");
  const [amount, setAmount] = useState("20");
  const [reason, setReason] = useState("Compra confirmada pelo suporte");
  const [plusDays, setPlusDays] = useState("30");
  const [pending, setPending] = useState<"" | "coins" | "plus">("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function run(kind: "coins" | "plus") {
    if (!email.trim()) {
      setFeedback({ tone: "err", text: "Informe o e-mail da conta." });
      return;
    }
    setPending(kind);
    setFeedback(null);
    try {
      if (kind === "coins") {
        const value = Number(amount);
        if (!Number.isFinite(value) || value === 0) throw new Error("Informe uma quantidade diferente de zero.");
        await adminAdjustCoins(email, role, value, reason);
        setFeedback({ tone: "ok", text: `Ajuste de ${value > 0 ? "+" : ""}${value} moeda(s) aplicado para ${email.trim()} (${role}).` });
      } else {
        const days = Number(plusDays);
        if (!Number.isFinite(days) || days <= 0) throw new Error("Informe um número de dias válido.");
        await adminActivatePlus(email, role, days);
        setFeedback({ tone: "ok", text: `Plus estendido por ${days} dia(s) para ${email.trim()} (${role}).` });
      }
    } catch (err) {
      setFeedback({ tone: "err", text: err instanceof Error ? err.message : "Não foi possível concluir." });
    } finally {
      setPending("");
    }
  }

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <WalletCards size={18} className="text-aqua-300" />
        <h3 className="font-black text-white">Creditar moedas / ativar Plus</h3>
      </div>
      <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
        Use depois que o pagamento for confirmado pelo WhatsApp. Precisa que sua conta tenha papel
        admin/moderador no banco.
      </p>

      {!adminCoinsEnabled && (
        <div className="mb-3 rounded-lg bg-slate-100 p-3 text-sm font-bold text-slate-600">
          Disponível apenas no ambiente online (Supabase configurado).
        </div>
      )}
      {feedback && (
        <div
          className={`mb-3 rounded-lg p-3 text-sm font-bold ${
            feedback.tone === "ok" ? "bg-aqua-50 text-aqua-800" : "bg-red-50 text-alert"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">
          E-mail da conta
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="pessoa@email.com" />
        </label>
        <label className="label">
          Carteira
          <select className="input" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            <option value="trabalhador">Trabalhador</option>
            <option value="empresa">Empresa</option>
          </select>
        </label>
        <label className="label">
          Quantidade de moedas (negativo para estornar)
          <input className="input" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="label">
          Motivo
          <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </div>
      <button
        type="button"
        className="primary mt-3"
        disabled={!adminCoinsEnabled || pending !== ""}
        onClick={() => run("coins")}
      >
        {pending === "coins" ? "Aplicando..." : "Aplicar ajuste de moedas"}
      </button>

      <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-2">
        <label className="label">
          Ativar Plus por (dias)
          <input className="input" type="number" value={plusDays} onChange={(event) => setPlusDays(event.target.value)} />
        </label>
        <button
          type="button"
          className="secondary self-end"
          disabled={!adminCoinsEnabled || pending !== ""}
          onClick={() => run("plus")}
        >
          {pending === "plus" ? "Ativando..." : "Estender Plus da conta"}
        </button>
      </div>
    </section>
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
  avatarUrl,
  avatarFit = "cover",
  title,
  subtitle,
  meta,
  blocked,
  reportCount = 0,
  onToggle,
  onOpen
}: {
  icon: ReactNode;
  avatarUrl?: string;
  avatarFit?: "cover" | "contain";
  title: string;
  subtitle: string;
  meta: string;
  blocked: boolean;
  reportCount?: number;
  onToggle: () => void;
  onOpen?: () => void;
}) {
  return (
    <article className={`worker-application-card ${blocked ? "border-red-100 bg-red-50/60" : ""}`}>
      <div className="worker-card-head">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="group flex min-w-0 flex-1 gap-3 text-left disabled:cursor-default"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={`h-16 w-16 shrink-0 rounded-lg border-2 ${blocked ? "border-red-200" : "border-brand-dark"} ${avatarFit === "contain" ? "bg-white object-contain" : "object-cover"}`}
            />
          ) : (
            <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-lg ${blocked ? "bg-red-100 text-alert" : "bg-aqua-50 text-aqua-700"}`}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={blocked ? "badge border-red-100 bg-red-50 text-alert" : "badge"}>{blocked ? "Bloqueado" : "Ativo"}</span>
              {reportCount > 0 && <span className="badge border-amber-200 bg-amber-50 text-amber-700">{reportCount} relato(s) aberto(s)</span>}
            </div>
            <h3 className="mt-2 underline-offset-4 group-hover:underline">{title}</h3>
            <p className="text-sm font-semibold text-slate-600">{subtitle}</p>
            <p className="mt-1 text-xs font-black uppercase text-slate-500">{meta}</p>
          </div>
        </button>
        <div className="grid gap-2 sm:min-w-40">
          {onOpen && (
            <button type="button" onClick={onOpen} className="secondary">
              <Eye size={16} /> Ver perfil
            </button>
          )}
          <button type="button" onClick={onToggle} className={blocked ? "secondary" : "danger"}>
            <Ban size={16} /> {blocked ? "Desbloquear" : "Bloquear"}
          </button>
        </div>
      </div>
    </article>
  );
}

function DetailField({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon}
        {label}
      </span>
      <strong className="mt-1 block break-words text-sm text-white">{value}</strong>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="font-black text-white">{title}</h3>
      {children}
    </section>
  );
}

function WorkerDetailModal({
  worker,
  blocked,
  applications,
  jobs,
  companies,
  reports,
  onToggleBlock,
  onDelete,
  onClose
}: {
  worker: WorkerProfile;
  blocked: boolean;
  applications: Application[];
  jobs: Job[];
  companies: CompanyProfile[];
  reports: TrustReport[];
  onToggleBlock: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const reliability = calculateReliability(worker);
  const badges = getTrustBadges(worker);
  const workerApplications = applications
    .filter((application) => application.workerId === worker.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const openReports = reports.filter(
    (report) => report.status === "Aberto" && report.targetType === "worker" && report.targetId === worker.id
  );
  const experiences = worker.functions
    .map((functionName) => getFunctionExperience(worker, functionName))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <Modal title={`Perfil de ${worker.name}`} onClose={onClose}>
      <div className="grid max-h-[72vh] gap-4 overflow-auto pr-1">
        <div className="flex items-start gap-3">
          <AvatarButton
            src={worker.avatarUrl}
            name={worker.name}
            className="h-28 w-28 rounded-lg border-2 border-brand-dark object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">{worker.name}</h2>
              {worker.verified && <span className="badge bg-aqua-100 text-aqua-700"><BadgeCheck size={14} /> Verificado</span>}
              <span className={blocked ? "badge border-red-100 bg-red-50 text-alert" : "badge"}>{blocked ? "Bloqueado" : "Ativo"}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{worker.functions.join(", ") || "Sem função"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin size={14} /> {worker.city} - {worker.neighborhood}
            </p>
          </div>
        </div>

        {openReports.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-alert">
            {openReports.length} relato(s) aberto(s) sobre este profissional.
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <DetailField icon={<Mail size={13} />} label="E-mail" value={worker.email || "Não informado"} />
          <DetailField icon={<Phone size={13} />} label="Telefone" value={worker.phone || "Não informado"} />
          <DetailField label="CPF" value={worker.cpf || "Não informado"} />
          <DetailField icon={<CalendarDays size={13} />} label="Nascimento" value={worker.birthDate ? formatDate(worker.birthDate) : "Não informado"} />
          <DetailField icon={<MapPin size={13} />} label="Cidade / bairro" value={`${worker.city || "?"} - ${worker.neighborhood}`} />
          <DetailField label="ID da conta" value={<code className="text-xs">{worker.id}</code>} />
        </div>

        <DetailSection title="Indicadores">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailField icon={<Star size={13} />} label="Nota" value={worker.rating.toFixed(1)} />
            <DetailField label="Confiabilidade" value={`${reliability}%`} />
            <DetailField label="Trabalhos" value={String(worker.completedJobs)} />
            <DetailField label="Comparecimento" value={`${worker.attendanceRate}%`} />
            <DetailField label="Pontualidade" value={`${worker.punctualityRate}%`} />
            <DetailField label="Cancelamentos" value={String(worker.cancellations)} />
            <DetailField label="Transporte próprio" value={worker.hasTransport ? "Sim" : "Não"} />
            <DetailField label="Distância máx." value={`${worker.maxDistanceKm} km`} />
            <DetailField label="Perfil verificado" value={worker.verified ? "Sim" : "Não"} />
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span key={badge.label} className={`badge ${badge.tone}`}>
                  <Award size={13} /> {badge.label}
                </span>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="Descrição e disponibilidade">
          <p className="text-sm leading-6 text-slate-600">{worker.description || "Sem descrição."}</p>
          {worker.experience && <p className="text-sm leading-6 text-slate-600">Experiência: {worker.experience}</p>}
          <p className="text-sm leading-6 text-slate-600">Disponibilidade: {worker.availability || "Não informada"}</p>
        </DetailSection>

        {experiences.length > 0 && (
          <DetailSection title="Nível por profissão">
            <div className="grid gap-2">
              {experiences.map((experience) => (
                <div key={experience.function} className="rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-black uppercase text-slate-500">{experience.function}</span>
                  <strong className="mt-1 block text-sm text-white">{getExperienceLabel(experience.level)}</strong>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {experience.months} meses informados{experience.verified ? " - verificado" : ""}
                    {experience.acceptsAssistant ? " - aceita ajudante" : ""}
                  </p>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        <DetailSection title={`Candidaturas (${workerApplications.length})`}>
          {workerApplications.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma candidatura registrada.</p>
          ) : (
            <div className="grid gap-2">
              {workerApplications.slice(0, 12).map((application) => {
                const job = jobs.find((item) => item.id === application.jobId);
                const company = job ? companies.find((item) => item.id === job.companyId) : undefined;
                return (
                  <div key={application.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{job?.title ?? "Vaga removida"}</strong>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {company?.establishmentName ?? "Empresa"} - {formatDate(application.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <span className="badge shrink-0">{application.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </DetailSection>

        {worker.reviews.length > 0 && (
          <DetailSection title="Avaliações recebidas">
            <div className="grid gap-2">
              {worker.reviews.map((review) => (
                <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                  <strong className="flex items-center gap-1 text-sm text-white">
                    <Star size={14} /> {review.rating} - {review.authorName}
                  </strong>
                  <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        <button type="button" onClick={onToggleBlock} className={blocked ? "secondary" : "danger"}>
          <Ban size={16} /> {blocked ? "Desbloquear profissional" : "Bloquear profissional"}
        </button>

        <DangerDeleteAccount kind="profissional" name={worker.name} onDelete={onDelete} />
      </div>
    </Modal>
  );
}

function CompanyDetailModal({
  company,
  blocked,
  jobs,
  companyReviews,
  reports,
  onToggleBlock,
  onDelete,
  onDeleteJob,
  salesReps,
  onSetSalesRep,
  onClose
}: {
  company: CompanyProfile;
  blocked: boolean;
  jobs: Job[];
  companyReviews: CompanyReview[];
  reports: TrustReport[];
  onToggleBlock: () => void;
  onDelete: () => Promise<void>;
  onDeleteJob: (jobId: string, title: string) => Promise<void>;
  salesReps: SalesRep[];
  onSetSalesRep: (code: string) => Promise<void>;
  onClose: () => void;
}) {
  const companyJobs = jobs.filter((job) => job.companyId === company.id);
  const companyJobIds = new Set(companyJobs.map((job) => job.id));
  const reviews = companyReviews.filter((review) => review.companyId === company.id);
  const openReports = reports.filter(
    (report) =>
      report.status === "Aberto" &&
      ((report.targetType === "company" && report.targetId === company.id) ||
        (report.targetType === "job" && companyJobIds.has(report.targetId)))
  );

  return (
    <Modal title={`Perfil de ${company.establishmentName}`} onClose={onClose}>
      <div className="grid max-h-[72vh] gap-4 overflow-auto pr-1">
        <div className="flex items-start gap-3">
          <AvatarButton
            src={company.logoUrl}
            name={company.establishmentName}
            className="h-28 w-28 rounded-lg border-2 border-brand-dark bg-white object-contain"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">{company.establishmentName}</h2>
              <span className={blocked ? "badge border-red-100 bg-red-50 text-alert" : "badge"}>{blocked ? "Bloqueada" : "Ativa"}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{company.category} - {company.neighborhood}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Star size={14} /> {company.rating.toFixed(1)} de avaliação
            </p>
          </div>
        </div>

        {openReports.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-alert">
            {openReports.length} relato(s) aberto(s) sobre esta empresa ou suas vagas.
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <DetailField label="Responsável" value={company.responsibleName || "Não informado"} />
          <DetailField label="CNPJ" value={company.cnpj || "Não informado"} />
          <DetailField icon={<Phone size={13} />} label="Telefone" value={company.phone || "Não informado"} />
          <DetailField icon={<Mail size={13} />} label="E-mail" value={company.email || "Não informado"} />
          <DetailField label="Categoria" value={company.category} />
          <DetailField icon={<MapPin size={13} />} label="Endereço" value={company.address || "Não informado"} />
          <DetailField label="Bairro" value={company.neighborhood} />
          <DetailField label="Avaliação" value={`${company.rating.toFixed(1)} de 5`} />
          <DetailField label="ID da conta" value={<code className="text-xs">{company.id}</code>} />
        </div>

        <CompanySalesRepField value={company.soldBy ?? ""} reps={salesReps} onSave={onSetSalesRep} />

        <DetailSection title="Sobre a empresa">
          <p className="text-sm leading-6 text-slate-600">{company.description || "Sem descrição."}</p>
        </DetailSection>

        <DetailSection title={`Vagas publicadas (${companyJobs.length})`}>
          {companyJobs.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma vaga cadastrada.</p>
          ) : (
            <div className="grid gap-2">
              {companyJobs.slice(0, 12).map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-white">{job.title}</strong>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {job.function} - {formatDate(job.date)} - {formatCurrency(job.dailyValue)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="badge">{getOpenSlots(job)} em aberto</span>
                    <JobDeleteButton title={job.title} onDelete={() => onDeleteJob(job.id, job.title)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        {reviews.length > 0 && (
          <DetailSection title="Avaliações dos trabalhadores">
            <div className="grid gap-2">
              {reviews.slice(0, 8).map((review) => (
                <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                  <strong className="flex items-center gap-1 text-sm text-white">
                    <Star size={14} /> {review.rating} - {review.workerName}
                  </strong>
                  <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        <button type="button" onClick={onToggleBlock} className={blocked ? "secondary" : "danger"}>
          <Ban size={16} /> {blocked ? "Desbloquear empresa" : "Bloquear empresa"}
        </button>

        <DangerDeleteAccount kind="empresa" name={company.establishmentName} onDelete={onDelete} />
      </div>
    </Modal>
  );
}

function DangerDeleteAccount({
  kind,
  name,
  onDelete
}: {
  kind: "profissional" | "empresa";
  name: string;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ready = confirmText.trim().toUpperCase() === "EXCLUIR";

  async function run() {
    if (!ready || pending) return;
    setPending(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a conta.");
      setPending(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50/60 p-3">
      <strong className="flex items-center gap-2 text-sm text-alert">
        <Trash2 size={15} /> Zona de perigo
      </strong>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
        Excluir apaga a conta {kind === "empresa" ? "da empresa" : "do profissional"}, o perfil, vagas,
        candidaturas, avaliações e histórico. Não dá para desfazer.
      </p>

      {!open ? (
        <button type="button" className="danger mt-2" onClick={() => setOpen(true)}>
          <Trash2 size={16} /> Excluir conta
        </button>
      ) : (
        <div className="mt-2 grid gap-2">
          <label className="text-xs font-black uppercase text-slate-500">
            Digite EXCLUIR para confirmar a remoção de {name}
            <input
              className="input mt-1"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="EXCLUIR"
              autoFocus
            />
          </label>
          {error && <div className="rounded-lg bg-red-50 p-2 text-xs font-bold text-alert">{error}</div>}
          <div className="flex gap-2">
            <button type="button" className="danger" disabled={!ready || pending} onClick={run}>
              <Trash2 size={16} /> {pending ? "Excluindo..." : "Excluir definitivamente"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError("");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function JobDeleteButton({ title, onDelete }: { title: string; onDelete: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a vaga.");
      setPending(false);
      setArmed(false);
    }
  }

  return (
    <div className="grid gap-1">
      {!armed ? (
        <button type="button" className="danger" onClick={() => setArmed(true)}>
          <Trash2 size={15} /> Excluir vaga
        </button>
      ) : (
        <div className="grid gap-1">
          <span className="text-xs font-bold text-alert">Excluir "{title}" e suas candidaturas?</span>
          <div className="flex gap-2">
            <button type="button" className="danger" disabled={pending} onClick={run}>
              {pending ? "Excluindo..." : "Confirmar"}
            </button>
            <button type="button" className="secondary" disabled={pending} onClick={() => setArmed(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <span className="text-xs font-bold text-alert">{error}</span>}
    </div>
  );
}

function CompanySalesRepField({
  value,
  reps,
  onSave
}: {
  value: string;
  reps: SalesRep[];
  onSave: (code: string) => Promise<void>;
}) {
  const currentCode = value.trim().toUpperCase();
  const [draft, setDraft] = useState(currentCode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = draft !== currentCode;
  // Se a empresa tem um código que não está na lista (vendedor removido ou
  // texto antigo), mantém como opção pra não sumir do select.
  const knownCodes = new Set(reps.map((rep) => rep.code.toUpperCase()));
  const orphanCode = currentCode && !knownCodes.has(currentCode) ? currentCode : "";

  async function save() {
    if (!dirty || pending) return;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      await onSave(draft);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-aqua-100 bg-aqua-50/40 p-3">
      <span className="text-xs font-black uppercase text-slate-500">Vendedor responsável pelo pacote</span>
      <div className="mt-1 flex flex-wrap gap-2">
        <select
          className="input flex-1"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
        >
          <option value="">— sem vendedor —</option>
          {reps.map((rep) => (
            <option key={rep.id} value={rep.code.toUpperCase()}>
              {rep.name} ({rep.code}){rep.active ? "" : " — inativo"}
            </option>
          ))}
          {orphanCode && <option value={orphanCode}>{orphanCode} (não cadastrado)</option>}
        </select>
        <button type="button" className="primary" disabled={!dirty || pending} onClick={save}>
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {saved && <p className="mt-1 text-xs font-bold text-aqua-700">Vendedor atualizado.</p>}
      {error && <p className="mt-1 text-xs font-bold text-alert">{error}</p>}
      {reps.length === 0 && (
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Cadastre vendedores na aba "Vendedores" para poder atribuir.
        </p>
      )}
    </div>
  );
}

type RepStatusFilter = "todos" | "ativos" | "inativos";
type RepSort = "faturamento" | "vendas" | "clientes" | "recente";

interface RepAgg {
  rep: SalesRep;
  companies: CompanyProfile[];
  sales: Sale[];
  revenueCents: number;
  ticketCents: number;
  lastSale: Sale | undefined;
}

function SalesRepsPanel({
  reps,
  companies,
  sales,
  blockedCompanyIds,
  enabled,
  onReloadReps,
  onReloadSales,
  onOpenCompany
}: {
  reps: SalesRep[];
  companies: CompanyProfile[];
  sales: Sale[];
  blockedCompanyIds: string[];
  enabled: boolean;
  onReloadReps: () => Promise<void>;
  onReloadSales: () => Promise<void>;
  onOpenCompany: (companyId: string) => void;
}) {
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepStatusFilter>("todos");
  const [sort, setSort] = useState<RepSort>("faturamento");
  const [repForm, setRepForm] = useState<{ mode: "new" } | { mode: "edit"; rep: SalesRep } | null>(null);
  const [saleForm, setSaleForm] = useState<{ companyId?: string } | null>(null);
  const [detailRepId, setDetailRepId] = useState<string | null>(null);

  const companiesByCode = useMemo(() => {
    const map = new Map<string, CompanyProfile[]>();
    for (const company of companies) {
      const key = (company.soldBy ?? "").trim().toUpperCase();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(company);
      map.set(key, list);
    }
    return map;
  }, [companies]);

  const salesByCode = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const sale of sales) {
      const key = (sale.salesRepCode ?? "").trim().toUpperCase();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(sale);
      map.set(key, list);
    }
    return map;
  }, [sales]);

  const aggregates = useMemo<RepAgg[]>(() => {
    return reps.map((rep) => {
      const code = rep.code.toUpperCase();
      const repSales = (salesByCode.get(code) ?? []).slice().sort((a, b) => b.soldAt.localeCompare(a.soldAt));
      const paid = repSales.filter((sale) => sale.paymentStatus === "pago");
      const revenueCents = paid.reduce((sum, sale) => sum + sale.amountCents, 0);
      return {
        rep,
        companies: (companiesByCode.get(code) ?? []).slice().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
        sales: repSales,
        revenueCents,
        ticketCents: paid.length ? Math.round(revenueCents / paid.length) : 0,
        lastSale: repSales[0]
      };
    });
  }, [reps, salesByCode, companiesByCode]);

  const rows = useMemo(() => {
    const term = normalize(search);
    return aggregates
      .filter(({ rep, companies: repCompanies }) => {
        if (statusFilter === "ativos" && !rep.active) return false;
        if (statusFilter === "inativos" && rep.active) return false;
        if (!term) return true;
        const haystack = normalize(
          `${rep.name} ${rep.code} ${rep.email} ${repCompanies.map((c) => c.establishmentName).join(" ")}`
        );
        return haystack.includes(term);
      })
      .sort((a, b) => {
        if (sort === "vendas") return b.sales.length - a.sales.length;
        if (sort === "clientes") return b.companies.length - a.companies.length;
        if (sort === "recente") return (b.lastSale?.soldAt ?? "").localeCompare(a.lastSale?.soldAt ?? "");
        return b.revenueCents - a.revenueCents;
      });
  }, [aggregates, search, statusFilter, sort]);

  const totalRevenue = sales.filter((s) => s.paymentStatus === "pago").reduce((sum, s) => sum + s.amountCents, 0);
  const totalClients = companies.filter((c) => {
    const code = (c.soldBy ?? "").trim().toUpperCase();
    return code && reps.some((r) => r.code.toUpperCase() === code);
  }).length;

  const detailAgg = aggregates.find((a) => a.rep.id === detailRepId) ?? null;

  async function toggleActive(rep: SalesRep) {
    try {
      await updateSalesRep(rep.id, {
        name: rep.name,
        email: rep.email,
        phone: rep.phone,
        cpf: rep.cpf,
        notes: rep.notes,
        active: !rep.active
      });
      await onReloadReps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
    }
  }

  async function removeRep(rep: SalesRep) {
    try {
      await deleteSalesRep(rep.id);
      await onReloadReps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="grid gap-4">
      <SectionHeader
        eyebrow="Admin"
        title="Vendedores"
        description="Indicações e vendas por vendedor. Contas com pontapp no e-mail viram vendedor automaticamente; use + Novo Vendedor para os demais."
        action={
          <div className="grid gap-2 sm:flex">
            <button type="button" className="secondary" disabled={!enabled} onClick={() => setSaleForm({})}>
              <WalletCards size={16} /> Registrar venda
            </button>
            <button type="button" className="primary" disabled={!enabled} onClick={() => setRepForm({ mode: "new" })}>
              <Plus size={16} /> Novo Vendedor
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <InfoTile icon={<UserRound />} label="Total de vendedores" value={String(reps.length)} />
        <InfoTile icon={<UserRound />} label="Ativos" value={String(reps.filter((r) => r.active).length)} />
        <InfoTile icon={<Building2 />} label="Clientes indicados" value={String(totalClients)} />
        <InfoTile icon={<ClipboardList />} label="Planos vendidos" value={String(sales.length)} />
        <InfoTile icon={<WalletCards />} label="Faturamento" value={formatBrl(totalRevenue)} />
      </div>

      {!enabled && (
        <div className="rounded-lg bg-slate-100 p-3 text-sm font-bold text-slate-600">
          Disponível apenas no ambiente online (Supabase configurado).
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}

      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <input
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, código, e-mail ou cliente"
        />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RepStatusFilter)}>
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as RepSort)}>
          <option value="faturamento">Ordenar: faturamento</option>
          <option value="vendas">Ordenar: vendas</option>
          <option value="clientes">Ordenar: clientes</option>
          <option value="recente">Ordenar: venda recente</option>
        </select>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-white">Vendedores</h3>
          <span className="badge">{rows.length}</span>
        </div>
        <div className="grid gap-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhum vendedor.</p>
          ) : (
            rows.map((agg) => (
              <article key={agg.rep.id} className="worker-application-card">
                <div className="worker-card-head">
                  <button
                    type="button"
                    onClick={() => setDetailRepId(agg.rep.id)}
                    className="group min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-white group-hover:underline">{agg.rep.name}</strong>
                      <span className="badge">{agg.rep.code}</span>
                      <span className={agg.rep.active ? "badge bg-aqua-50 text-aqua-700" : "badge border-slate-200 bg-slate-50 text-slate-500"}>
                        {agg.rep.active ? "Ativo" : "Inativo"}
                      </span>
                      {!agg.rep.linked && <span className="badge border-amber-200 bg-amber-50 text-amber-700">sem conta</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span>{agg.companies.length} cliente(s)</span>
                      <span>{agg.sales.length} venda(s)</span>
                      <span className="text-aqua-700">{formatBrl(agg.revenueCents)}</span>
                      <span>
                        Última venda: {agg.lastSale ? formatDate(agg.lastSale.soldAt) : "—"}
                      </span>
                    </div>
                  </button>
                  <div className="grid gap-2 sm:min-w-40">
                    <CopyButton text={salesRepSignupLink(agg.rep.code)} label="Copiar link" />
                    <button type="button" className="secondary" onClick={() => setSaleForm({})}>
                      <WalletCards size={15} /> Registrar venda
                    </button>
                    <button type="button" className="secondary" onClick={() => setRepForm({ mode: "edit", rep: agg.rep })}>
                      Editar
                    </button>
                    <button type="button" className="secondary" onClick={() => toggleActive(agg.rep)}>
                      {agg.rep.active ? "Desativar" : "Ativar"}
                    </button>
                    {!agg.rep.linked && (
                      <button type="button" className="danger" onClick={() => removeRep(agg.rep)}>
                        <Trash2 size={15} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {repForm && (
        <RepFormModal
          rep={repForm.mode === "edit" ? repForm.rep : null}
          onClose={() => setRepForm(null)}
          onSaved={async () => {
            setRepForm(null);
            await onReloadReps();
          }}
        />
      )}
      {saleForm && (
        <SaleFormModal
          companies={companies}
          reps={reps}
          initialCompanyId={saleForm.companyId}
          onClose={() => setSaleForm(null)}
          onSaved={async () => {
            setSaleForm(null);
            await onReloadSales();
          }}
        />
      )}
      {detailAgg && (
        <RepDetailModal
          agg={detailAgg}
          blockedCompanyIds={blockedCompanyIds}
          onOpenCompany={onOpenCompany}
          onRegisterSale={(companyId) => {
            setDetailRepId(null);
            setSaleForm({ companyId });
          }}
          onClose={() => setDetailRepId(null)}
        />
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="secondary"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        })
      }
    >
      <Copy size={15} /> {done ? "Copiado!" : label}
    </button>
  );
}

function RepFormModal({
  rep,
  onClose,
  onSaved
}: {
  rep: SalesRep | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<SalesRepInput>({
    name: rep?.name ?? "",
    email: rep?.email ?? "",
    phone: rep?.phone ?? "",
    cpf: rep?.cpf ?? "",
    notes: rep?.notes ?? "",
    active: rep?.active ?? true
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (pending) return;
    if (!form.name.trim()) {
      setError("Informe o nome do vendedor.");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (rep) await updateSalesRep(rep.id, form);
      else await createSalesRep(form);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  return (
    <Modal title={rep ? `Editar ${rep.name}` : "Novo vendedor"} onClose={onClose}>
      <div className="grid gap-3">
        {rep && (
          <p className="text-xs font-semibold text-slate-500">
            Código <strong className="text-white">{rep.code}</strong> — gerado automaticamente, não muda.
          </p>
        )}
        <label className="label">
          Nome completo
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            E-mail
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label">
            WhatsApp
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="label">
            CPF
            <input className="input" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </label>
          <label className="label">
            Status
            <select
              className="input"
              value={form.active ? "ativo" : "inativo"}
              onChange={(e) => setForm({ ...form, active: e.target.value === "ativo" })}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>
        </div>
        <label className="label">
          Observações
          <textarea className="input min-h-20 py-2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        {error && <div className="rounded-lg bg-red-50 p-2 text-xs font-bold text-alert">{error}</div>}
        <button type="button" className="primary" disabled={pending} onClick={submit}>
          {pending ? "Salvando..." : "Salvar vendedor"}
        </button>
      </div>
    </Modal>
  );
}

function SaleFormModal({
  companies,
  reps,
  initialCompanyId,
  onClose,
  onSaved
}: {
  companies: CompanyProfile[];
  reps: SalesRep[];
  initialCompanyId?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [plan, setPlan] = useState("Profissional");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Pix");
  const [status, setStatus] = useState<PaymentStatus>("pago");
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const sortedCompanies = useMemo(
    () => companies.slice().sort((a, b) => a.establishmentName.localeCompare(b.establishmentName)),
    [companies]
  );
  const company = companies.find((c) => c.id === companyId);
  const repCode = (company?.soldBy ?? "").trim().toUpperCase();
  const rep = reps.find((r) => r.code.toUpperCase() === repCode);

  async function submit() {
    if (pending) return;
    if (!companyId) {
      setError("Escolha a empresa.");
      return;
    }
    const value = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(value) || value < 0) {
      setError("Informe um valor válido.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await registerSale({
        companyId,
        plan,
        amountCents: value,
        paymentMethod: method,
        paymentStatus: status,
        soldAt
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a venda.");
      setPending(false);
    }
  }

  return (
    <Modal title="Registrar venda" onClose={onClose}>
      <div className="grid gap-3">
        <label className="label">
          Empresa (cliente)
          <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">— escolher —</option>
            {sortedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.establishmentName}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-lg bg-slate-50 p-2 text-xs font-semibold text-slate-600">
          Vendedor:{" "}
          {company
            ? rep
              ? `${rep.name} (${rep.code})`
              : repCode
                ? `código "${repCode}" não cadastrado — a venda fica sem vendedor`
                : "esta empresa não tem vendedor — a venda fica sem atribuição"
            : "—"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            Plano
            <input className="input" value={plan} onChange={(e) => setPlan(e.target.value)} />
          </label>
          <label className="label">
            Valor (R$)
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="539,90" />
          </label>
          <label className="label">
            Forma de pagamento
            <input className="input" value={method} onChange={(e) => setMethod(e.target.value)} />
          </label>
          <label className="label">
            Status do pagamento
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="estornado">Estornado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className="label">
            Data da venda
            <input className="input" type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
          </label>
        </div>
        {error && <div className="rounded-lg bg-red-50 p-2 text-xs font-bold text-alert">{error}</div>}
        <button type="button" className="primary" disabled={pending} onClick={submit}>
          {pending ? "Registrando..." : "Registrar venda"}
        </button>
      </div>
    </Modal>
  );
}

type SaleHistFilter = { days: number; plan: string; status: string };

function RepDetailModal({
  agg,
  blockedCompanyIds,
  onOpenCompany,
  onRegisterSale,
  onClose
}: {
  agg: RepAgg;
  blockedCompanyIds: string[];
  onOpenCompany: (companyId: string) => void;
  onRegisterSale: (companyId: string) => void;
  onClose: () => void;
}) {
  const { rep } = agg;
  const link = salesRepSignupLink(rep.code);
  const [filter, setFilter] = useState<SaleHistFilter>({ days: 0, plan: "", status: "" });
  const plans = Array.from(new Set(agg.sales.map((s) => s.plan)));
  const cutoff = filter.days ? Date.now() - filter.days * 24 * 60 * 60 * 1000 : 0;
  const filtered = agg.sales.filter((s) => {
    if (cutoff && new Date(s.soldAt).getTime() < cutoff) return false;
    if (filter.plan && s.plan !== filter.plan) return false;
    if (filter.status && s.paymentStatus !== filter.status) return false;
    return true;
  });

  return (
    <Modal title={`Vendedor: ${rep.name}`} onClose={onClose}>
      <div className="grid max-h-[74vh] gap-4 overflow-auto pr-1">
        <div className="grid gap-2 sm:grid-cols-2">
          <DetailField label="Código" value={rep.code} />
          <DetailField label="Status" value={rep.active ? "Ativo" : "Inativo"} />
          <DetailField icon={<Mail size={13} />} label="E-mail" value={rep.email || "—"} />
          <DetailField icon={<Phone size={13} />} label="WhatsApp" value={rep.phone || "—"} />
          {rep.cpf && <DetailField label="CPF" value={rep.cpf} />}
          <DetailField label="Conta vinculada" value={rep.linked ? "Sim" : "Não"} />
        </div>
        <div className="rounded-lg border border-aqua-100 bg-aqua-50/40 p-3">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
            <Link2 size={13} /> Link de indicação
          </span>
          <p className="mt-1 break-all text-xs font-semibold text-slate-600">{link}</p>
          <div className="mt-2 flex gap-2">
            <CopyButton text={link} label="Copiar link" />
            <CopyButton text={rep.code} label="Copiar código" />
          </div>
        </div>

        <DetailSection title="Performance">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailField label="Clientes indicados" value={String(agg.companies.length)} />
            <DetailField label="Planos vendidos" value={String(agg.sales.length)} />
            <DetailField label="Faturamento" value={formatBrl(agg.revenueCents)} />
            <DetailField label="Ticket médio" value={formatBrl(agg.ticketCents)} />
            <DetailField label="Última venda" value={agg.lastSale ? formatDate(agg.lastSale.soldAt) : "—"} />
          </div>
          {rep.notes && <p className="text-sm leading-6 text-slate-600">Obs.: {rep.notes}</p>}
        </DetailSection>

        <DetailSection title={`Histórico de vendas (${filtered.length})`}>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="input" value={filter.days} onChange={(e) => setFilter({ ...filter, days: Number(e.target.value) })}>
              <option value={0}>Período: todos</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
              <option value={365}>Último ano</option>
            </select>
            <select className="input" value={filter.plan} onChange={(e) => setFilter({ ...filter, plan: e.target.value })}>
              <option value="">Plano: todos</option>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select className="input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Status: todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="estornado">Estornado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma venda no filtro.</p>
          ) : (
            <div className="grid gap-2">
              {filtered.map((sale) => (
                <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-white">
                      Venda #{String(sale.seq).padStart(5, "0")} - {sale.companyName || "Empresa"}
                    </strong>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {sale.plan} - {formatDate(sale.soldAt)}
                      {sale.source === "payment" ? " - Mercado Pago" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <strong className="text-sm text-white">{formatBrl(sale.amountCents)}</strong>
                    <span
                      className={
                        sale.paymentStatus === "pago"
                          ? "badge bg-aqua-50 text-aqua-700"
                          : sale.paymentStatus === "pendente"
                            ? "badge border-amber-200 bg-amber-50 text-amber-700"
                            : "badge border-red-100 bg-red-50 text-alert"
                      }
                    >
                      {sale.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title={`Clientes indicados (${agg.companies.length})`}>
          {agg.companies.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhum cliente ainda.</p>
          ) : (
            <div className="grid gap-2">
              {agg.companies.map((company) => (
                <div key={company.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                  <button type="button" onClick={() => onOpenCompany(company.id)} className="min-w-0 text-left">
                    <strong className="block truncate text-sm text-white hover:underline">{company.establishmentName}</strong>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {company.category} - {company.neighborhood}
                      {company.createdAt ? ` - ${formatDate(company.createdAt.slice(0, 10))}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        blockedCompanyIds.includes(company.id)
                          ? "badge border-red-100 bg-red-50 text-alert"
                          : "badge bg-aqua-50 text-aqua-700"
                      }
                    >
                      {blockedCompanyIds.includes(company.id) ? "Bloqueada" : "Ativa"}
                    </span>
                    <button type="button" className="secondary min-h-8 px-2 text-xs" onClick={() => onRegisterSale(company.id)}>
                      Registrar venda
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </Modal>
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
