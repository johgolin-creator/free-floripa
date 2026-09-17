export type UserRole = "trabalhador" | "empresa";

export type JobFunction =
  | "Garçom"
  | "Bartender"
  | "Segurança"
  | "Auxiliar de cozinha"
  | "Copeiro"
  | "Recepcionista"
  | "Operador de caixa"
  | "Limpeza"
  | "Camareira"
  | "Montador de eventos"
  | "Promotor"
  | "Repositor";

export type ExperienceLevel = "Iniciante" | "Poucas diárias" | "Experiente" | "Profissional experiente";

export interface FunctionExperience {
  function: JobFunction;
  level: ExperienceLevel;
  months: number;
  acceptsAssistant: boolean;
  verified: boolean;
}

// Antes era uma lista fechada de bairros; agora é texto livre digitado no
// cadastro/edição do perfil (Florianópolis tem dezenas de bairros e a lista
// fixa deixava muita gente sem a opção certa). `neighborhoods` em
// data/demoData.ts continua existindo como sugestão (datalist) e para os
// filtros de busca de vaga, mas não restringe mais o valor salvo.
export type Neighborhood = string;

export type PaymentMethod = "Dinheiro" | "Pix" | "Transferência" | "A combinar";
export type JobStatus = "Rascunho" | "Publicada" | "Em andamento" | "Concluída" | "Cancelada";
export type CompanyScheduleStatus = "Planejada" | "Confirmada" | "Concluída" | "Cancelada";

export type ApplicationStatus =
  | "Enviada"
  | "Em análise"
  | "Convidada"
  | "Convite recusado"
  | "Aprovada"
  | "Recusada"
  | "Cancelada"
  | "Trabalho concluído"
  | "Falta registrada";

export interface WorkerProfile {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  avatarUrl: string;
  /** Fotos extras do perfil, além da principal (avatarUrl). Mostradas como
   *  galeria no perfil e para empresas avaliando o profissional. */
  photos: string[];
  birthDate: string;
  city: string;
  neighborhood: Neighborhood;
  functions: JobFunction[];
  functionExperience: FunctionExperience[];
  experience: string;
  description: string;
  availability: string;
  hasTransport: boolean;
  maxDistanceKm: number;
  rating: number;
  completedJobs: number;
  attendanceRate: number;
  punctualityRate: number;
  cancellations: number;
  reviews: Review[];
  verified: boolean;
}

export interface CompanyProfile {
  id: string;
  establishmentName: string;
  responsibleName: string;
  /** CNPJ (empresa) ou CPF (pessoa física) — sempre exatamente um dos dois preenchido. */
  cnpj: string;
  cpf: string;
  phone: string;
  email: string;
  category: "Restaurante" | "Bar" | "Beach club" | "Hotel" | "Casa noturna" | "Buffet" | "Agência de eventos" | "Outro";
  address: string;
  neighborhood: Neighborhood;
  description: string;
  logoUrl: string;
  /** Foto de capa (banner) do perfil da empresa. Vazio = degradê da marca. */
  coverUrl?: string;
  rating: number;
  /** Vendedor que trouxe/fechou o pacote com a empresa (nome ou código).
   *  Só a administração vê e edita. Vazio = sem atribuição. */
  soldBy?: string;
  /** Data de criação do cadastro da empresa (ISO). Só preenchida na visão
   *  de moderação. */
  createdAt?: string;
}

export interface Job {
  id: string;
  companyId: string;
  status?: JobStatus;
  title: string;
  function: JobFunction;
  quantity: number;
  filled: number;
  date: string;
  startsAt: string;
  endsAt: string;
  dailyValue: number;
  paymentMethod: PaymentMethod;
  approximateAddress: string;
  fullAddress: string;
  neighborhood: Neighborhood;
  uniform: string;
  requiredExperience: string;
  description: string;
  benefits: string[];
  contactAfterConfirmation: boolean;
  urgent: boolean;
  candidates: number;
  distanceKm: number;
  /** Vaga captada de um post do Facebook e publicada automaticamente pelo
   *  admin (ver lib/facebookJobParsing.ts). Fica sob uma empresa-vitrine
   *  compartilhada (FACEBOOK_JOBS_COMPANY_ID em lib/facebookJobs.ts) em vez
   *  de uma empresa real cadastrada — por isso o contato de quem publicou o
   *  post fica nos campos externalContact* abaixo, não no perfil da
   *  empresa. Quem se candidata primeiro é aprovado automaticamente (ver
   *  supabase/facebook_jobs.sql) e só aí o contato é liberado. */
  source?: "facebook";
  externalContactName?: string;
  externalContactPhone?: string;
  externalContactEmail?: string;
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface CompanySchedule {
  id: string;
  companyId: string;
  title: string;
  function: JobFunction;
  quantity: number;
  date: string;
  startsAt: string;
  endsAt: string;
  neighborhood: Neighborhood;
  location: string;
  notes: string;
  workerNames: string[];
  status: CompanyScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  jobId?: string;
  applicationId?: string;
  createdAt?: string;
}

export interface CompanyReview {
  id: string;
  companyId: string;
  workerId: string;
  workerName: string;
  rating: number;
  comment: string;
  jobId?: string;
  applicationId?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  role: UserRole;
  createdAt: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  applicationId: string;
  jobId: string;
  workerId: string;
  companyId: string;
  senderRole: UserRole;
  senderName: string;
  body: string;
  createdAt: string;
  readByWorker: boolean;
  readByCompany: boolean;
}

export interface CoinLedgerEntry {
  id: string;
  role: UserRole;
  kind: "purchase" | "spend" | "bonus" | "refund" | "admin_adjustment";
  reason: string;
  amount: number;
  balanceAfter: number;
  jobId?: string;
  applicationId?: string;
  createdAt: string;
}

export interface SubscriptionState {
  plan: "Gratuito" | "Profissional" | "Plus";
  creditsRemaining: number;
  companyCreditsRemaining: number;
  renewalDate: string;
  unlockedJobIds: string[];
  plusActiveUntil?: string;
  companyPlusActiveUntil?: string;
}

export interface AdminModerationState {
  blockedWorkerIds: string[];
  blockedCompanyIds: string[];
}

export type TrustReportTargetType = "worker" | "company" | "job";
export type TrustReportStatus = "Aberto" | "Resolvido";

export interface TrustReport {
  id: string;
  reporterRole: UserRole;
  reporterId: string;
  reporterName: string;
  targetType: TrustReportTargetType;
  targetId: string;
  targetName: string;
  reason: string;
  status: TrustReportStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type BugReportStatus = "Aberto" | "Em andamento" | "Resolvido";

export interface BugReport {
  id: string;
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  title: string;
  description: string;
  pagePath: string;
  status: BugReportStatus;
  createdAt: string;
  resolvedAt?: string;
}

export type CompanyLeadSegment = "Restaurantes" | "Baladas" | "Hotéis" | "Mercados" | "Atacados";

export interface CompanyLead {
  id: string;
  name: string;
  segment: CompanyLeadSegment;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city: string;
  contacted: boolean;
  foundAt: string;
}

/** Vaga freelancer vista num post de rede social (hoje só Facebook), colada
 *  manualmente por um admin — nunca coletada automaticamente (ver
 *  lib/facebookLeadParsing.ts para o porquê). */
export interface FacebookLead {
  id: string;
  rawText: string;
  title: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  contacted: boolean;
  createdAt: string;
}

export interface AppState {
  activeRole: UserRole;
  selectedWorkerId: string;
  selectedCompanyId: string;
  workers: WorkerProfile[];
  companies: CompanyProfile[];
  jobs: Job[];
  companySchedules: CompanySchedule[];
  applications: Application[];
  favoriteWorkerIds: string[];
  notifications: NotificationItem[];
  chatMessages: ChatMessage[];
  companyReviews: CompanyReview[];
  coinLedger: CoinLedgerEntry[];
  subscription: SubscriptionState;
  adminModeration: AdminModerationState;
  trustReports: TrustReport[];
  companyLeads: CompanyLead[];
  facebookLeads: FacebookLead[];
}
