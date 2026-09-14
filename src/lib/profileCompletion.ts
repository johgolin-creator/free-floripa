import type { CompanyProfile, WorkerProfile } from "./types";
import { isValidCNPJ, isValidCPF } from "./validation";

const DEFAULT_WORKER_TEXTS = ["Perfil recém-criado no PONT.", "Perfil recÃ©m-criado no PONT."];
const DEFAULT_COMPANY_TEXTS = ["Empresa cadastrada no PONT."];

/** Placeholders usados antes da pessoa enviar uma foto real. Foto é
 *  obrigatória: um perfil que ainda está com o placeholder conta como
 *  incompleto, e as telas de edição bloqueiam salvar nesse estado. */
export const WORKER_AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";
export const COMPANY_LOGO_PLACEHOLDER = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80";

function filled(value: string | undefined | null) {
  return Boolean(value?.trim());
}

function notDefault(value: string, defaults: string[]) {
  return filled(value) && !defaults.includes(value.trim());
}

export function getWorkerProfileCompletion(worker: WorkerProfile) {
  const missing: string[] = [];

  if (!filled(worker.avatarUrl) || worker.avatarUrl === WORKER_AVATAR_PLACEHOLDER) missing.push("foto de perfil");
  if (!filled(worker.name)) missing.push("nome completo");
  if (!isValidCPF(worker.cpf)) missing.push("CPF");
  if (!filled(worker.phone)) missing.push("telefone");
  if (!filled(worker.email)) missing.push("e-mail");
  if (!filled(worker.birthDate)) missing.push("data de nascimento");
  if (!filled(worker.city)) missing.push("cidade");
  if (!filled(worker.neighborhood)) missing.push("bairro");
  if (worker.functions.length === 0) missing.push("pelo menos uma profissão");
  if (worker.functionExperience.length === 0) missing.push("nível de experiência");
  if (!filled(worker.experience)) missing.push("experiência profissional");
  if (!notDefault(worker.description, DEFAULT_WORKER_TEXTS)) missing.push("descrição do perfil");
  if (!filled(worker.availability) || worker.availability === "A combinar") missing.push("disponibilidade");
  if (!Number.isFinite(worker.maxDistanceKm) || worker.maxDistanceKm <= 0) missing.push("distância máxima");

  return {
    complete: missing.length === 0,
    missing
  };
}

export function getCompanyProfileCompletion(company: CompanyProfile) {
  const missing: string[] = [];

  if (!filled(company.logoUrl) || company.logoUrl === COMPANY_LOGO_PLACEHOLDER) missing.push("foto ou logotipo");
  if (!filled(company.establishmentName) || company.establishmentName === "Empresa PONT") missing.push("nome do estabelecimento");
  if (!filled(company.responsibleName) || company.responsibleName === "Responsável" || company.responsibleName === "ResponsÃ¡vel") {
    missing.push("responsável");
  }
  if (!isValidCNPJ(company.cnpj) && !isValidCPF(company.cpf)) missing.push("CNPJ ou CPF");
  if (!filled(company.phone)) missing.push("telefone");
  if (!filled(company.email)) missing.push("e-mail");
  if (!filled(company.category)) missing.push("categoria");
  if (!filled(company.neighborhood)) missing.push("bairro");
  if (!filled(company.address)) missing.push("endereço");
  if (!notDefault(company.description, DEFAULT_COMPANY_TEXTS)) missing.push("descrição da empresa");

  return {
    complete: missing.length === 0,
    missing
  };
}
