import { supabase } from "./supabase";
import type { CompanyLead, CompanyLeadSegment } from "./types";

export const supabaseCompanyLeadsEnabled = Boolean(supabase);

interface CompanyLeadRow {
  id: string;
  name: string;
  segment: CompanyLeadSegment;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string;
  contacted: boolean;
  found_at: string;
}

function rowToLead(row: CompanyLeadRow): CompanyLead {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    address: row.address ?? undefined,
    city: row.city,
    contacted: row.contacted,
    foundAt: row.found_at
  };
}

export async function loadRemoteCompanyLeads(): Promise<CompanyLead[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from("company_leads").select("*");
  if (error) throw new Error(error.message);

  return ((data as CompanyLeadRow[] | null) ?? []).map(rowToLead);
}

export async function upsertRemoteCompanyLeads(leads: CompanyLead[]): Promise<void> {
  if (!supabase || leads.length === 0) return;

  const rows = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    segment: lead.segment,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    website: lead.website ?? null,
    address: lead.address ?? null,
    city: lead.city,
    found_at: lead.foundAt
  }));

  const { error } = await supabase.from("company_leads").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function setRemoteCompanyLeadContacted(id: string, contacted: boolean): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("company_leads").update({ contacted }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRemoteCompanyLead(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("company_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
