import { supabase } from "./supabase";

export type SalesRepLeadStatus = "a_contatar" | "contatado" | "negociando" | "convertido" | "perdido";

export const SALES_REP_LEAD_STATUS_LABELS: Record<SalesRepLeadStatus, string> = {
  a_contatar: "A contatar",
  contatado: "Contatado",
  negociando: "Negociando",
  convertido: "Convertido",
  perdido: "Perdido"
};

export const SALES_REP_LEAD_STATUSES: SalesRepLeadStatus[] = [
  "a_contatar",
  "contatado",
  "negociando",
  "convertido",
  "perdido"
];

export interface SalesRepLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  status: SalesRepLeadStatus;
  createdAt: string;
  updatedAt: string;
}

interface SalesRepLeadRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: SalesRepLeadStatus;
  created_at: string;
  updated_at: string;
}

function mapLead(row: SalesRepLeadRow): SalesRepLead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SELECT_COLUMNS = "id,name,phone,email,notes,status,created_at,updated_at";

/** Vendedor: os próprios contatos em prospecção (RLS "sales rep leads self manage"). */
export async function listMySalesRepLeads(): Promise<SalesRepLead[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("sales_rep_leads")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SalesRepLeadRow[]).map(mapLead);
}

export interface SalesRepLeadInput {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export async function createSalesRepLead(salesRepId: string, input: SalesRepLeadInput): Promise<SalesRepLead> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { data, error } = await supabase
    .from("sales_rep_leads")
    .insert({
      sales_rep_id: salesRepId,
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      notes: input.notes.trim() || null
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapLead(data as SalesRepLeadRow);
}

export async function updateSalesRepLeadStatus(id: string, status: SalesRepLeadStatus): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.from("sales_rep_leads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSalesRepLead(id: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");
  const { error } = await supabase.from("sales_rep_leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
