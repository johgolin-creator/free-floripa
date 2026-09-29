import type { ConfirmedInviteMember } from "./scheduleInvites";
import type { CompanySchedule } from "./types";

/** Uma pessoa da equipe de uma escala criada à mão. */
export interface TeamMember {
  name: string;
  /** Só dígitos; "" quando ainda não se sabe (nome digitado à mão). */
  cpf: string;
  /** Só dígitos; "" quando não se sabe. */
  phone: string;
  /** "manual" = nome digitado em Equipe prevista; "convite" = confirmou pelo link. */
  source: "manual" | "convite";
  /** Só para quem confirmou pelo link: permite remover da equipe. */
  responseId?: string;
  inviteId?: string;
}

/** Mesmo nome escrito de jeitos diferentes ("JOÃO  lima" e "Joao Lima") é a mesma pessoa. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Equipe de uma escala = nomes digitados em "Equipe prevista" + quem confirmou pelo link.
 *  Quem aparece nos dois lugares conta uma vez só (fica com o CPF e o celular do convite). */
export function buildTeam(schedule: Pick<CompanySchedule, "workerNames">, confirmed: ConfirmedInviteMember[]): TeamMember[] {
  const team: TeamMember[] = [];
  const byKey = new Map<string, TeamMember>();

  for (const name of schedule.workerNames) {
    const key = normalizeName(name);
    if (!key || byKey.has(key)) continue;
    const member: TeamMember = { name: name.trim(), cpf: "", phone: "", source: "manual" };
    byKey.set(key, member);
    team.push(member);
  }

  for (const item of confirmed) {
    const key = normalizeName(item.name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.cpf = item.cpf;
      existing.phone = item.phoneDigits;
      existing.source = "convite";
      existing.responseId = item.responseId;
      existing.inviteId = item.inviteId;
      continue;
    }
    const member: TeamMember = {
      name: item.name.trim(),
      cpf: item.cpf,
      phone: item.phoneDigits,
      source: "convite",
      responseId: item.responseId,
      inviteId: item.inviteId
    };
    byKey.set(key, member);
    team.push(member);
  }

  return team;
}
