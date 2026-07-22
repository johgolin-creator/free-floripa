import type { CompanyProfile, WorkerProfile } from "./types";

const DEFAULT_WORKER_TEXTS = ["Perfil recém-criado no Free Floripa.", "Perfil recÃ©m-criado no Free Floripa."];
const DEFAULT_COMPANY_TEXTS = ["Empresa cadastrada no Free Floripa."];

function filled(value: string | undefined | null) {
  return Boolean(value?.trim());
}

function notDefault(value: string, defaults: string[]) {
  return filled(value) && !defaults.includes(value.trim());
}

export function getWorkerProfileCompletion(worker: WorkerProfile) {
  const missing: string[] = [];

  if (!filled(worker.name)) missing.push("nome completo");
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

  if (!filled(company.establishmentName) || company.establishmentName === "Empresa Free Floripa") missing.push("nome do estabelecimento");
  if (!filled(company.responsibleName) || company.responsibleName === "Responsável" || company.responsibleName === "ResponsÃ¡vel") {
    missing.push("responsável");
  }
  if (!filled(company.cnpj)) missing.push("CNPJ");
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
