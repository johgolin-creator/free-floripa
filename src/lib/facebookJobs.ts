import type { CompanyProfile } from "./types";

/** ID fixo da empresa-vitrine que reúne todas as vagas captadas do
 *  Facebook. Não é uma empresa real (não tem login/CNPJ verdadeiro) — existe
 *  só pra satisfazer o modelo de dados, que exige toda vaga ligada a uma
 *  empresa cadastrada. Precisa existir também no Supabase antes da primeira
 *  publicação (ver supabase/facebook_jobs.sql), com este mesmo id. */
export const FACEBOOK_JOBS_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export function buildFacebookJobsCompany(): CompanyProfile {
  return {
    id: FACEBOOK_JOBS_COMPANY_ID,
    establishmentName: "Oportunidades encontradas no Facebook",
    responsibleName: "Equipe PONT",
    cnpj: "00000000000001",
    cpf: "",
    phone: "",
    email: "contato@pont.app",
    category: "Outro",
    address: "Florianópolis",
    neighborhood: "Centro",
    description:
      "Vagas vistas em grupos do Facebook e organizadas pela equipe PONT. O contato de quem publicou o anúncio original é liberado assim que a candidatura é aprovada.",
    logoUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80",
    rating: 5
  };
}
