import { supabase } from "./supabase";
import {
  getNestedCompany,
  loadPublicWorkerProfiles,
  mapApplication,
  mapCompany,
  mapJob,
  supabaseMarketplaceEnabled,
  type ApplicationRow,
  type CompanyProfileRow,
  type JobRow
} from "./supabaseMarketplace";
import type { AdminModerationState, Application, CompanyProfile, Job, TrustReport, TrustReportTargetType, WorkerProfile } from "./types";

const MODERATION_JOBS_LIMIT = 500;
const MODERATION_APPLICATIONS_LIMIT = 1000;

export const supabaseModerationEnabled = supabaseMarketplaceEnabled;

interface TrustReportRow {
  id: string;
  reporter_role: TrustReport["reporterRole"];
  reporter_id: string;
  reporter_name: string;
  target_type: TrustReportTargetType;
  target_id: string;
  target_name: string;
  reason: string;
  status: TrustReport["status"];
  created_at: string;
  resolved_at?: string | null;
}

interface ModerationBlockRow {
  target_type: "worker" | "company";
  target_id: string;
}

export interface ModerationOverview {
  workers: WorkerProfile[];
  companies: CompanyProfile[];
  jobs: Job[];
  applications: Application[];
  trustReports: TrustReport[];
  adminModeration: AdminModerationState;
}

function mapTrustReport(row: TrustReportRow): TrustReport {
  return {
    id: row.id,
    reporterRole: row.reporter_role,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: row.target_name,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined
  };
}

export async function loadAllCompanyProfiles(): Promise<CompanyProfile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("company_profiles")
    .select("id,user_id,establishment_name,responsible_name,cnpj,phone,email,category,address,neighborhood,description,logo_url,rating")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as CompanyProfileRow[]).map(mapCompany);
}

export async function loadAllJobsForModeration(): Promise<{ jobs: Job[]; companies: CompanyProfile[] }> {
  if (!supabase) return { jobs: [], companies: [] };

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,company_id,title,function_name,quantity,filled,shift_date,starts_at,ends_at,daily_value,payment_method,approximate_address,full_address,neighborhood,uniform,required_experience,description,benefits,contact_after_confirmation,urgent,status,company_profiles(id,user_id,establishment_name,responsible_name,cnpj,phone,email,category,address,neighborhood,description,logo_url,rating)"
    )
    .order("shift_date", { ascending: false })
    .limit(MODERATION_JOBS_LIMIT);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as JobRow[];
  return {
    jobs: rows.map(mapJob),
    companies: rows.map(getNestedCompany).filter((item): item is CompanyProfile => Boolean(item))
  };
}

export async function loadAllApplicationsForModeration(): Promise<Application[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("applications")
    .select("id,job_id,worker_id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(MODERATION_APPLICATIONS_LIMIT);

  if (error) throw new Error(error.message);
  return ((data ?? []) as ApplicationRow[]).map(mapApplication);
}

export async function loadAllTrustReports(): Promise<TrustReport[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("trust_reports")
    .select("id,reporter_role,reporter_id,reporter_name,target_type,target_id,target_name,reason,status,created_at,resolved_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as TrustReportRow[]).map(mapTrustReport);
}

export async function loadAllModerationBlocks(): Promise<AdminModerationState> {
  if (!supabase) return { blockedWorkerIds: [], blockedCompanyIds: [] };

  const { data, error } = await supabase.from("moderation_blocks").select("target_type,target_id");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ModerationBlockRow[];
  return {
    blockedWorkerIds: rows.filter((row) => row.target_type === "worker").map((row) => row.target_id),
    blockedCompanyIds: rows.filter((row) => row.target_type === "company").map((row) => row.target_id)
  };
}

export async function loadModerationOverview(): Promise<ModerationOverview> {
  if (!supabase) {
    return { workers: [], companies: [], jobs: [], applications: [], trustReports: [], adminModeration: { blockedWorkerIds: [], blockedCompanyIds: [] } };
  }

  const [workers, companies, jobsPayload, applications, trustReports, adminModeration] = await Promise.all([
    loadPublicWorkerProfiles(null),
    loadAllCompanyProfiles(),
    loadAllJobsForModeration(),
    loadAllApplicationsForModeration(),
    loadAllTrustReports(),
    loadAllModerationBlocks()
  ]);

  const companyIds = new Set(companies.map((company) => company.id));
  const mergedCompanies = [...companies, ...jobsPayload.companies.filter((company) => !companyIds.has(company.id))];

  return { workers, companies: mergedCompanies, jobs: jobsPayload.jobs, applications, trustReports, adminModeration };
}

export async function setModerationBlock(targetType: "worker" | "company", targetId: string, blocked: boolean, blockedBy?: string) {
  if (!supabase) return;

  if (blocked) {
    const { error } = await supabase
      .from("moderation_blocks")
      .upsert({ target_type: targetType, target_id: targetId, blocked_by: blockedBy ?? null }, { onConflict: "target_type,target_id" });
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("moderation_blocks").delete().eq("target_type", targetType).eq("target_id", targetId);
  if (error) throw new Error(error.message);
}

export async function resolveTrustReportRemote(reportId: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("trust_reports")
    .update({ status: "Resolvido", resolved_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
}

export async function publishTrustReport(report: TrustReport) {
  if (!supabase) return;

  const { error } = await supabase.from("trust_reports").insert({
    id: report.id,
    reporter_role: report.reporterRole,
    reporter_id: report.reporterId,
    reporter_name: report.reporterName,
    target_type: report.targetType,
    target_id: report.targetId,
    target_name: report.targetName,
    reason: report.reason,
    status: report.status,
    created_at: report.createdAt
  });

  if (error) throw new Error(error.message);
}
