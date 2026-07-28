import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { FunctionExperience, JobFunction, Neighborhood, WorkerProfile } from "./types";

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

interface WorkerProfileRow {
  id: string;
  user_id: string;
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

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapPublicWorker(row: WorkerProfileRow, experiences: FunctionExperienceRow[]): WorkerProfile {
  const functions = (row.professions ?? []).map(toJobFunction).filter((item): item is JobFunction => Boolean(item));
  const fallbackFunctions: JobFunction[] = functions.length > 0 ? functions : ["Garçom"];
  const functionExperience = fallbackFunctions.map((functionName) => {
    const found = experiences.find((experience) => experience.worker_id === row.id && experience.function_name === functionName);
    return {
      function: functionName,
      level: found ? toExperienceLevel(found.level) : "Iniciante",
      months: Math.max(0, Number(found?.months ?? 0)),
      acceptsAssistant: found?.accepts_assistant ?? true,
      verified: found?.verified ?? false
    };
  });

  return {
    id: row.id,
    name: row.display_name?.trim() || "Profissional Free Floripa",
    phone: "",
    email: "",
    avatarUrl: row.avatar_url || DEFAULT_PUBLIC_AVATAR,
    birthDate: row.birth_date || "2000-01-01",
    city: row.city || "Florianópolis",
    neighborhood: toNeighborhood(row.neighborhood),
    functions: fallbackFunctions,
    functionExperience,
    experience: row.experience || "",
    description: row.description || "Profissional cadastrado no Free Floripa.",
    availability: row.availability || "A combinar",
    hasTransport: Boolean(row.has_transport),
    maxDistanceKm: Math.max(1, Number(row.max_distance_km ?? 10)),
    rating: toNumber(row.rating, 0),
    completedJobs: Math.max(0, Number(row.completed_jobs ?? 0)),
    attendanceRate: Math.max(0, Number(row.attendance_rate ?? 100)),
    punctualityRate: Math.max(0, Number(row.punctuality_rate ?? 100)),
    cancellations: Math.max(0, Number(row.cancellations ?? 0)),
    reviews: [],
    verified: Boolean(row.verified)
  };
}

export async function loadPublicWorkerProfiles(excludeUserId?: string | null) {
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("worker_profiles")
    .select(
      "id,user_id,display_name,avatar_url,birth_date,city,neighborhood,professions,experience,description,availability,has_transport,max_distance_km,rating,completed_jobs,attendance_rate,punctuality_rate,cancellations,verified"
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const profiles = ((rows ?? []) as WorkerProfileRow[]).filter((row) => row.user_id !== excludeUserId);
  const ids = profiles.map((row) => row.id);
  if (ids.length === 0) return [];

  const { data: experienceRows, error: experienceError } = await supabase
    .from("worker_function_experience")
    .select("worker_id,function_name,level,months,accepts_assistant,verified")
    .in("worker_id", ids);

  if (experienceError) throw new Error(experienceError.message);

  return profiles.map((row) => mapPublicWorker(row, (experienceRows ?? []) as FunctionExperienceRow[]));
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
