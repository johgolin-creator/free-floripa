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
  | "Montador de eventos"
  | "Promotor";

export type ExperienceLevel = "Iniciante" | "Poucas diárias" | "Experiente" | "Profissional experiente";

export interface FunctionExperience {
  function: JobFunction;
  level: ExperienceLevel;
  months: number;
  acceptsAssistant: boolean;
  verified: boolean;
}

export type Neighborhood =
  | "Jurerê"
  | "Canasvieiras"
  | "Ingleses"
  | "Centro"
  | "Lagoa da Conceição"
  | "Campeche";

export type PaymentMethod = "Dinheiro" | "Pix" | "Transferência" | "A combinar";
export type JobStatus = "Rascunho" | "Publicada" | "Em andamento" | "Concluída" | "Cancelada";
export type CompanyScheduleStatus = "Planejada" | "Confirmada" | "Concluída" | "Cancelada";

export type ApplicationStatus =
  | "Enviada"
  | "Em análise"
  | "Aprovada"
  | "Recusada"
  | "Cancelada"
  | "Trabalho concluído"
  | "Falta registrada";

export type ShiftStatus = "Ainda não chegou" | "Fez check-in" | "Finalizou o turno";

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string;
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
  cnpj: string;
  phone: string;
  email: string;
  category: "Restaurante" | "Bar" | "Beach club" | "Hotel" | "Casa noturna" | "Buffet" | "Agência de eventos" | "Outro";
  address: string;
  neighborhood: Neighborhood;
  description: string;
  logoUrl: string;
  rating: number;
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
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  status: ApplicationStatus;
  createdAt: string;
}

export interface WorkShift {
  id: string;
  jobId: string;
  workerId: string;
  status: ShiftStatus;
  checkinAt?: string;
  checkoutAt?: string;
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
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  role: UserRole;
  createdAt: string;
  read: boolean;
}

export interface SubscriptionState {
  plan: "Gratuito" | "Profissional";
  creditsRemaining: number;
  renewalDate: string;
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
  shifts: WorkShift[];
  favoriteWorkerIds: string[];
  notifications: NotificationItem[];
  subscription: SubscriptionState;
}
