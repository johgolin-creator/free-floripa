import { supabase } from "./supabase";

// Ações da administração sobre empresas que precisam de service role / papel
// admin no banco. Hoje: definir o vendedor que fechou o pacote com a empresa.
export const adminCompanyEnabled = Boolean(supabase);

/**
 * Grava (ou limpa, com string vazia) o vendedor responsável pela empresa.
 * Roda na função security-definer admin_set_company_sold_by, que só aceita
 * quem tem papel admin/moderador (public.is_support_user()).
 */
export async function adminSetCompanySoldBy(companyId: string, value: string): Promise<void> {
  if (!supabase) throw new Error("Disponível apenas no ambiente online.");

  const { error } = await supabase.rpc("admin_set_company_sold_by", {
    target_company_id: companyId,
    value: value.trim()
  });
  if (error) throw new Error(error.message);
}
