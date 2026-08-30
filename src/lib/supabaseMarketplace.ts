import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { onlyDigits } from "./validation";
import type {
  Application,
  ApplicationStatus,
  CompanyProfile,
  CompanyReview,
  FunctionExperience,
  Job,
  JobFunction,
  JobStatus,
  Neighborhood,
  NotificationItem,
  PaymentMethod,
  Review,
  UserRole,
  WorkerProfile
} from "./types";

const DEFAULT_PUBLIC_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80";
const VALID_FUNCTIONS = new Set<JobFunction>([
  "Garçom",
  "Bartender",
  "Segurança",
  "Auxiliar de cozinha",
  "Copeiro",
  "Recepcionista",
  "Operador de caixa",
  "Limpeza",
  "Montador de eventos",
  "Promotor"
]);
const VALID_NEIGHBORHOODS = new Set<Neighborhood>([
  "Jurerê",
  "Canasvieiras",
  "Ingleses",
  "Centro",
  "Lagoa da Conceição",
  "Campeche"
]);
const VALID_LEVELS = new Set<FunctionExperience["level"]>([
  "Iniciante",
  "Poucas diárias",
  "Experiente",
  "Profissional experiente"
]);
const VALID_PAYMENT_METHODS = new Set<PaymentMethod>(["Dinheiro", "Pix", "Transferência", "A combinar"]);
const VALID_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  "Enviada",
  "Em análise",
  "Convidada",
  "Convite recusado",
  "Aprovada",
  "Recusada",
  "Cancelada",
  "Trabalho concluído",
  "Falta registrada"
]);
const VALID_JOB_STATUSES = new Set<JobStatus>(["Rascunho", "Publicada", "Em andamento", "Concluída", "Cancelada"]);
const PUBLIC_JOBS_LIMIT = 120;
const COMPANY_JOBS_LIMIT = 200;
const PUBLIC_WORKERS_LIMIT = 120;
const USER_APPLICATIONS_LIMIT = 200;

interface WorkerProfileRow {
  id: string;
  user_id: string;
  cpf?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  professions?: string[] | null;
  experience?: string | null;
  description?: string | null;
  availability?: string | null;
  has_transport?: boolean | null;
  max_distance_km?: number | null;
  rating?: number | string | null;
  completed_jobs?: number | null;
  attendance_rate?: number | null;
  punctuality_rate?: number | null;
  cancellations?: number | null;
  verified?: boolean | null;
}

interface FunctionExperienceRow {
  worker_id: string;
  function_name: string;
  level: string;
  months: number | null;
  accepts_assistant: boolean | null;
  verified: boolean | null;
}

interface WorkerReviewRow {
  id: string;
  worker_id: string;
  application_id: string | null;
  job_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface CompanyProfileRow {
  id: string;
  user_id?: string | null;
  establishment_name: string;
  responsible_name: string;
  cnpj: string;
  phone: string;
  email: string;
  category: CompanyProfile["category"] | string;
  address: string;
  neighborhood: string;
  description?: string | null;
  logo_url?: string | null;
  rating?: number | string | null;
}

export interface JobRow {
  id: string;
  company_id: string;
  title: string;
  function_name: string;
  quantity: number;
  filled?: number | null;
  shift_date: string;
  starts_at: string;
  ends_at?: string | null;
  daily_value: number | string;
  payment_method: string;
  approximate_address: string;
  full_address: string;
  neighborhood: string;
  uniform?: string | null;
  required_experience?: string | null;
  description: string;
  benefits?: string[] | null;
  contact_after_confirmation?: boolean | null;
  urgent?: boolean | null;
  status?: string | null;
  company_profiles?: CompanyProfileRow | CompanyProfileRow[] | null;
}

export interface ApplicationRow {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
  created_at: string;
}

interface NotificationRow {
  id: string;
  role: UserRole;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface MarketplaceJobsPayload {
  jobs: Job[];
  companies: CompanyProfile[];
  applications: Application[];
}

export const supabaseMarketplaceEnabled = Boolean(supabase);

function toJobFunction(value: string): JobFunction | null {
  return VALID_FUNCTIONS.has(value as JobFunction) ? (value as JobFunction) : null;
}

function toNeighborhood(value?: string | null): Neighborhood {
  return VALID_NEIGHBORHOODS.has(value as Neighborhood) ? (value as Neighborhood) : "Centro";
}

function toExperienceLevel(value: string): FunctionExperience["level"] {
  return VALID_LEVELS.has(value as FunctionExperience["level"]) ? (value as FunctionExperience["level"]) : "Iniciante";
}

function toPaymentMethod(value: string): PaymentMethod {
  return VALID_PAYMENT_METHODS.has(value as PaymentMethod) ? (value as PaymentMethod) : "A combinar";
}

function toApplicationStatus(value: string): ApplicationStatus {
  return VALID_APPLICATION_STATUSES.has(value as ApplicationStatus) ? (value as ApplicationStatus) : "Enviada";
}

function toJobStatus(value?: string | null): JobStatus {
  if (value === "Aberta") return "Publicada";
  return VALID_JOB_STATUSES.has(value as JobStatus) ? (value as JobStatus) : "Publicada";
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapWorkerReview(row: WorkerReviewRow): Review {
  return {
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    jobId: row.job_id ?? undefined,
    applicationId: row.application_id ?? undefined,
    createdAt: row.created_at
  };
}

function mapPublicWorker(row: WorkerProfileRow, experiences: FunctionExperienceRow[], reviews: WorkerReviewRow[]): WorkerProfile {
  const functions = (row.professions ?? []).map(toJobFunction).filter((item): item is JobFunction => Boolean(item));
  const fallbackFunctions: JobFunction[] = functions.length > 0 ? functions : ["Garçom"];
  const functionExperience = fallbackFunctions.map((functionName) => {
    const found = experiences.find((experience) => experience.worker_id === row.id && experience.function_name === functionName);
    return {
      function: functionName,
      level: found ? toExperienceLevel(found.level) : "Iniciante",
      months: Math.max(0, Number(found?.months ?? 0)),
      acceptsAssistant: found?.accepts_assistant ?? false,
      verified: found?.verified ?? false
    };
  });

  return {
    id: row.id,
    name: row.display_name?.trim() || "Profissional PONT",
    cpf: "",
    phone: "",
    email: "",
    avatarUrl: row.avatar_url || DEFAULT_PUBLIC_AVATAR,
    birthDate: row.birth_date || "2000-01-01",
    city: row.city || "Florianópolis",
    neighborhood: toNeighborhood(row.neighborhood),
    functions: fallbackFunctions,
    functionExperience,
    experience: row.experience || "",
    description: row.description || "Profissional cadastrado no PONT.",
    availability: row.availability || "A combinar",
    hasTransport: Boolean(row.has_transport),
    maxDistanceKm: Math.max(1, Number(row.max_distance_km ?? 10)),
    rating: toNumber(row.rating, 0),
    completedJobs: Math.max(0, Number(row.completed_jobs ?? 0)),
    attendanceRate: Math.max(0, Number(row.attendance_rate ?? 100)),
    punctualityRate: Math.max(0, Number(row.punctuality_rate ?? 100)),
    cancellations: Math.max(0, Number(row.cancellations ?? 0)),
    reviews: reviews
      .filter((review) => review.worker_id === row.id)
      .map(mapWorkerReview)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    verified: Boolean(row.verified)
  };
}

function normalizeTime(value?: string | null) {
  if (!value) return "A combinar";
  return value.slice(0, 5);
}

export function mapCompany(row: CompanyProfileRow): CompanyProfile {
  return {
    id: row.id,
    establishmentName: row.establishment_name || "Empresa PONT",
    responsibleName: row.responsible_name || "Responsável",
    cnpj: row.cnpj || "",
    phone: row.phone || "",
    email: row.email || "",
    category: (row.category || "Outro") as CompanyProfile["category"],
    address: row.address || "",
    neighborhood: toNeighborhood(row.neighborhood),
    description: row.description || "",
    logoUrl: row.logo_url || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80",
    rating: toNumber(row.rating, 0)
  };
}

export function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    companyId: row.company_id,
    status: toJobStatus(row.status),
    title: row.title,
    function: toJobFunction(row.function_name) ?? "Garçom",
    quantity: Math.max(1, Number(row.quantity || 1)),
    filled: Math.max(0, Number(row.filled ?? 0)),
    date: row.shift_date,
    startsAt: normalizeTime(row.starts_at),
    endsAt: normalizeTime(row.ends_at),
    dailyValue: toNumber(row.daily_value, 0),
    paymentMethod: toPaymentMethod(row.payment_method),
    approximateAddress: row.approximate_address,
    fullAddress: row.full_address,
    neighborhood: toNeighborhood(row.neighborhood),
    uniform: row.uniform || "A combinar",
    requiredExperience: row.required_experience || "A combinar",
    description: row.description,
    benefits: row.benefits ?? [],
    contactAfterConfirmation: row.contact_after_confirmation ?? true,
    urgent: Boolean(row.urgent),
    candidates: 0,
    distanceKm: 6
  };
}

export function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    workerId: row.worker_id,
    status: toApplicationStatus(row.status),
    createdAt: row.created_at
  };
}

function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    role: row.role,
    createdAt: row.created_at,
    read: row.read
  };
}

export function getNestedCompany(row: JobRow) {
  const company = Array.isArray(row.company_profiles) ? row.company_profiles[0] : row.company_profiles;
  return company ? mapCompany(company) : null;
}

function sqlTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : null;
}

async function loadApplicationsForJobs(jobIds: string[]) {
  if (!supabase || jobIds.length === 0) return [] as Application[];

  const { data, error } = await supabase
    .from("applications")
    .select("id,job_id,worker_id,status,created_at")
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ApplicationRow[]).map(mapApplication);
}

export async function loadPublicWorkerProfiles(excludeUserId?: string | null) {
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("worker_profiles")
    .select(
      "id,user_id,cpf,display_name,avatar_url,birth_date,city,neighborhood,professions,experience,description,availability,has_transport,max_distance_km,rating,completed_jobs,attendance_rate,punctuality_rate,cancellations,verified"
    )
    .order("updated_at", { ascending: false })
    .limit(PUBLIC_WORKERS_LIMIT);

  if (error) throw new Error(error.message);

  const profiles = ((rows ?? []) as WorkerProfileRow[]).filter((row) => row.user_id !== excludeUserId);
  const ids = profiles.map((row) => row.id);
  if (ids.length === 0) return [];

  const [{ data: experienceRows, error: experienceError }, { data: reviewRows, error: reviewError }] = await Promise.all([
    supabase
      .from("worker_function_experience")
      .select("worker_id,function_name,level,months,accepts_assistant,verified")
      .in("worker_id", ids),
    supabase
      .from("worker_reviews")
      .select("id,worker_id,application_id,job_id,author_name,rating,comment,created_at")
      .in("worker_id", ids)
  ]);

  if (experienceError) throw new Error(experienceError.message);
  if (reviewError) throw new Error(reviewError.message);

  return profiles.map((row) =>
    mapPublicWorker(row, (experienceRows ?? []) as FunctionExperienceRow[], (reviewRows ?? []) as WorkerReviewRow[])
  );
}

export async function publishWorkerProfile(user: User, worker: WorkerProfile) {
  if (!supabase) return;

  const email = worker.email || user.email || "";
  const now = new Date().toISOString();

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      role: "trabalhador",
      full_name: worker.name,
      phone: worker.phone,
      email,
      updated_at: now
    },
    { onConflict: "id" }
  );
  if (userError) throw new Error(userError.message);

  const { data: profileRow, error: profileError } = await supabase
    .from("worker_profiles")
    .upsert(
      {
        id: worker.id,
        user_id: user.id,
        cpf: onlyDigits(worker.cpf || "") || null,
        display_name: worker.name,
        avatar_url: worker.avatarUrl,
        birth_date: worker.birthDate || null,
        city: worker.city,
        neighborhood: worker.neighborhood,
        professions: worker.functions,
        experience: worker.experience,
        description: worker.description,
        availability: worker.availability,
        has_transport: worker.hasTransport,
        max_distance_km: worker.maxDistanceKm,
        rating: worker.rating,
        completed_jobs: worker.completedJobs,
        attendance_rate: worker.attendanceRate,
        punctuality_rate: worker.punctualityRate,
        cancellations: worker.cancellations,
        verified: worker.verified,
        updated_at: now
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (profileError) throw new Error(profileError.message);

  const workerId = profileRow?.id ?? worker.id;
  const { error: deleteError } = await supabase.from("worker_function_experience").delete().eq("worker_id", workerId);
  if (deleteError) throw new Error(deleteError.message);

  if (worker.functionExperience.length === 0) return;

  const { error: insertError } = await supabase.from("worker_function_experience").insert(
    worker.functionExperience.map((experience) => ({
      worker_id: workerId,
      function_name: experience.function,
      level: experience.level,
      months: Math.max(0, experience.months),
      accepts_assistant: experience.acceptsAssistant,
      verified: experience.verified,
      updated_at: now
    }))
  );

  if (insertError) throw new Error(insertError.message);
}

export async function publishCompanyProfile(user: User, company: CompanyProfile) {
  if (!supabase) return;

  const email = company.email || user.email || "";
  const now = new Date().toISOString();

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      role: "empresa",
      full_name: company.responsibleName || company.establishmentName,
      phone: company.phone,
      email,
      updated_at: now
    },
    { onConflict: "id" }
  );
  if (userError) throw new Error(userError.message);

  const { error } = await supabase.from("company_profiles").upsert(
    {
      id: company.id,
      user_id: user.id,
      establishment_name: company.establishmentName,
      responsible_name: company.responsibleName,
      cnpj: company.cnpj || user.id,
      phone: company.phone,
      email,
      category: company.category,
      address: company.address,
      neighborhood: company.neighborhood,
      description: company.description,
      logo_url: company.logoUrl,
      rating: company.rating,
      updated_at: now
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);
}

export async function publishJob(user: User | null, company: CompanyProfile, job: Job) {
  if (!supabase || !user) return;

  await publishCompanyProfile(user, company);

  const { error } = await supabase.from("jobs").upsert(
    {
      id: job.id,
      company_id: company.id,
      title: job.title,
      function_name: job.function,
      quantity: job.quantity,
      filled: job.filled,
      shift_date: job.date,
      starts_at: sqlTime(job.startsAt) ?? "00:00",
      ends_at: sqlTime(job.endsAt),
      daily_value: job.dailyValue,
      payment_method: job.paymentMethod,
      approximate_address: job.approximateAddress,
      full_address: job.fullAddress,
      neighborhood: job.neighborhood,
      uniform: job.uniform,
      required_experience: job.requiredExperience,
      description: job.description,
      benefits: job.benefits,
      contact_after_confirmation: job.contactAfterConfirmation,
      urgent: job.urgent,
      status: job.status ?? "Publicada",
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}

export async function loadPublicJobs(): Promise<MarketplaceJobsPayload> {
  if (!supabase) return { jobs: [], companies: [], applications: [] };

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,company_id,title,function_name,quantity,filled,shift_date,starts_at,ends_at,daily_value,payment_method,approximate_address,full_address,neighborhood,uniform,required_experience,description,benefits,contact_after_confirmation,urgent,status,company_profiles(id,user_id,establishment_name,responsible_name,cnpj,phone,email,category,address,neighborhood,description,logo_url,rating)"
    )
    .neq("status", "Cancelada")
    .order("shift_date", { ascending: true })
    .limit(PUBLIC_JOBS_LIMIT);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as JobRow[];
  const jobs = rows.map(mapJob);
  const companies = rows.map(getNestedCompany).filter((item): item is CompanyProfile => Boolean(item));
  const jobIds = jobs.map((job) => job.id);
  const applications = await loadApplicationsForJobs(jobIds);

  return { jobs, companies, applications };
}

export async function loadCompanyMarketplace(companyId: string): Promise<MarketplaceJobsPayload> {
  if (!supabase) return { jobs: [], companies: [], applications: [] };

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,company_id,title,function_name,quantity,filled,shift_date,starts_at,ends_at,daily_value,payment_method,approximate_address,full_address,neighborhood,uniform,required_experience,description,benefits,contact_after_confirmation,urgent,status"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(COMPANY_JOBS_LIMIT);

  if (error) throw new Error(error.message);

  const jobs = ((data ?? []) as JobRow[]).map(mapJob);
  const jobIds = jobs.map((job) => job.id);
  const applications = await loadApplicationsForJobs(jobIds);

  return { jobs, companies: [], applications };
}

export async function loadWorkerMarketplace(workerId: string): Promise<MarketplaceJobsPayload> {
  if (!supabase) return { jobs: [], companies: [], applications: [] };

  const [{ data: appRows, error: appError }, jobsPayload] = await Promise.all([
    supabase
      .from("applications")
      .select("id,job_id,worker_id,status,created_at")
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false })
      .limit(USER_APPLICATIONS_LIMIT),
    loadPublicJobs()
  ]);

  if (appError) throw new Error(appError.message);

  const applications = ((appRows ?? []) as ApplicationRow[]).map(mapApplication);

  return {
    ...jobsPayload,
    applications
  };
}

export async function publishApplication(worker: WorkerProfile, jobId: string, applicationId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("applications").upsert(
    {
      id: applicationId,
      job_id: jobId,
      worker_id: worker.id,
      status: "Enviada",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "job_id,worker_id" }
  );

  if (error) throw new Error(error.message);
}

export async function updateRemoteApplicationStatus(application: Application, status: ApplicationStatus) {
  if (!supabase) return;

  const { error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", application.id);

  if (error) throw new Error(error.message);
}

export async function publishInvitedApplication(jobId: string, workerId: string, applicationId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("applications").upsert(
    {
      id: applicationId,
      job_id: jobId,
      worker_id: workerId,
      status: "Convidada",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "job_id,worker_id" }
  );
  if (error) throw new Error(error.message);
}

export async function loadRemoteNotifications(userId: string) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id,role,title,body,read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function publishNotification(userId: string, notification: NotificationItem) {
  if (!supabase) return;

  const { error } = await supabase.from("notifications").insert({
    id: notification.id,
    user_id: userId,
    role: notification.role,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    created_at: notification.createdAt
  });

  if (error) throw new Error(error.message);
}

export async function markRemoteNotificationRead(notificationId: string) {
  if (!supabase) return;

  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
  if (error) throw new Error(error.message);
}

export async function markRemoteRoleNotificationsRead(userId: string, role: UserRole) {
  if (!supabase) return;

  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("role", role);
  if (error) throw new Error(error.message);
}

export async function publishWorkerReview(companyId: string, workerId: string, review: Review) {
  if (!supabase) return;

  const { error } = await supabase.from("worker_reviews").insert({
    id: review.id,
    worker_id: workerId,
    company_id: companyId,
    application_id: review.applicationId ?? null,
    job_id: review.jobId ?? null,
    author_name: review.authorName,
    rating: review.rating,
    comment: review.comment,
    created_at: review.createdAt ?? new Date().toISOString()
  });

  if (error) throw new Error(error.message);
}

export async function publishCompanyReview(review: CompanyReview) {
  if (!supabase) return;

  const { error } = await supabase.from("company_reviews").insert({
    id: review.id,
    company_id: review.companyId,
    worker_id: review.workerId,
    worker_name: review.workerName,
    application_id: review.applicationId ?? null,
    job_id: review.jobId ?? null,
    rating: review.rating,
    comment: review.comment,
    created_at: review.createdAt
  });

  if (error) throw new Error(error.message);
}
