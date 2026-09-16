import { supabase } from "./supabase";
import type { FacebookLead } from "./types";

export const supabaseFacebookLeadsEnabled = Boolean(supabase);

interface FacebookLeadRow {
  id: string;
  raw_text: string;
  title: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  contacted: boolean;
  created_at: string;
}

function rowToLead(row: FacebookLeadRow): FacebookLead {
  return {
    id: row.id,
    rawText: row.raw_text,
    title: row.title,
    contactName: row.contact_name ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    city: row.city ?? undefined,
    contacted: row.contacted,
    createdAt: row.created_at
  };
}

export async function loadRemoteFacebookLeads(): Promise<FacebookLead[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from("facebook_leads").select("*");
  if (error) throw new Error(error.message);

  return ((data as FacebookLeadRow[] | null) ?? []).map(rowToLead);
}

export async function upsertRemoteFacebookLead(lead: FacebookLead): Promise<void> {
  if (!supabase) return;

  const row = {
    id: lead.id,
    raw_text: lead.rawText,
    title: lead.title,
    contact_name: lead.contactName ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    city: lead.city ?? null,
    contacted: lead.contacted,
    created_at: lead.createdAt
  };

  const { error } = await supabase.from("facebook_leads").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function setRemoteFacebookLeadContacted(id: string, contacted: boolean): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("facebook_leads").update({ contacted }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRemoteFacebookLead(id: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("facebook_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
