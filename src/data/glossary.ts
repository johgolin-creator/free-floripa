import type { UserRole } from "../lib/types";

export type GlossaryTermId = "confiabilidade" | "codigoVerificacao";

export const glossary: Record<GlossaryTermId, { label: string; body: (role?: UserRole) => string }> = {
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
