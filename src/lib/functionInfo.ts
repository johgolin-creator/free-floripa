// Segurança privada tem dois perfis diferentes:
//  - Vigilante: tem curso de formação de vigilante (CNV) e pode atuar em postos
//    e empresas que exigem esse registro.
//  - Segurança: segurança de eventos, sem exigência dessa formação.
// O valor gravado (na vaga, no perfil, no banco) continua sendo o nome da
// função; estes textos são só o que aparece na tela.

// Só o Vigilante ganha rótulo: quem já tinha perfil como "Segurança" pode ser
// vigilante formado e não atualizou, então "Segurança" fica como está.
const LABELS: Record<string, string> = {
  Vigilante: "Vigilante (com formação)"
};

const HINTS: Record<string, string> = {
  Vigilante: "Marque só se tiver curso de formação de vigilante (CNV válida). A empresa pode pedir comprovação.",
  Segurança: "Segurança de evento, sem exigência de curso de formação de vigilante."
};

export function functionLabel(functionName: string): string {
  return LABELS[functionName] ?? functionName;
}

export function functionHint(functionName: string): string | undefined {
  return HINTS[functionName];
}
