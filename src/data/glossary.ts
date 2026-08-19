import type { UserRole } from "../lib/types";

export type GlossaryTermId = "moedas" | "confiabilidade" | "codigoVerificacao";

export const glossary: Record<GlossaryTermId, { label: string; body: (role?: UserRole) => string }> = {
  moedas: {
    label: "Moedas",
    body: (role) =>
      role === "empresa"
        ? "Moedas são créditos do PONT. Sua empresa usa moedas em ações pontuais, como cancelar uma vaga que já está com a equipe completa. Não são dinheiro de verdade — compre mais na página Moedas."
        : "Moedas são créditos do PONT. Você usa 1 moeda pra ver todos os detalhes de uma vaga (endereço completo, contato) antes de se candidatar. Não são dinheiro de verdade — compre pacotes na página Planos."
  },
  confiabilidade: {
    label: "Índice de confiabilidade",
    body: () =>
      "Nota de 0 a 100 calculada automaticamente com base em presença, pontualidade, avaliações recebidas e cancelamentos. Quanto maior, mais confiável esse profissional é considerado pelas empresas."
  },
  codigoVerificacao: {
    label: "Código de verificação",
    body: () =>
      "Código que identifica este turno. Ele aparece tanto para o trabalhador quanto para a empresa, para os dois confirmarem que estão falando do mesmo turno."
  }
};
