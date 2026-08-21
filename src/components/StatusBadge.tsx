export type StatusBadgeType = "application" | "schedule" | "job";

function toneClass(type: StatusBadgeType, status: string) {
  if (type === "application") {
    if (status === "Aprovada" || status === "Trabalho concluído") return "badge bg-aqua-100 text-aqua-700";
    if (status === "Recusada" || status === "Cancelada" || status === "Falta registrada" || status === "Convite recusado")
      return "badge bg-red-50 text-alert";
    if (status === "Convidada") return "badge bg-amber-50 text-amber-700";
    return "badge";
  }

  if (type === "schedule") {
    if (status === "Cancelada") return "badge bg-red-50 text-alert";
    if (status === "Concluída" || status === "Confirmada") return "badge bg-aqua-100 text-aqua-700";
    return "badge";
  }

  if (status === "Cancelada") return "badge bg-red-50 text-alert";
  if (status === "Concluída") return "badge bg-aqua-100 text-aqua-700";
  if (status === "Rascunho") return "badge bg-slate-200 text-slate-700";
  return "badge";
}

export function StatusBadge({ type, status }: { type: StatusBadgeType; status: string }) {
  return <span className={toneClass(type, status)}>{status}</span>;
}

const legendCopy: Record<StatusBadgeType, { status: string; meaning: string }[]> = {
  application: [
    { status: "Enviada", meaning: "você se candidatou, aguardando a empresa" },
    { status: "Em análise", meaning: "a empresa está avaliando o seu perfil" },
    { status: "Convidada", meaning: "a empresa te convidou para a vaga, aguardando sua resposta" },
    { status: "Convite recusado", meaning: "você recusou o convite da empresa" },
    { status: "Aprovada", meaning: "você foi escalado para o turno" },
    { status: "Recusada", meaning: "a empresa não seguiu com essa candidatura" },
    { status: "Cancelada", meaning: "a candidatura foi encerrada" },
    { status: "Trabalho concluído", meaning: "o turno foi realizado" },
    { status: "Falta registrada", meaning: "houve ausência registrada nesse turno" }
  ],
  schedule: [
    { status: "Planejada", meaning: "escala criada, ainda sem confirmação" },
    { status: "Confirmada", meaning: "equipe confirmada para esse horário" },
    { status: "Concluída", meaning: "o turno já aconteceu" },
    { status: "Cancelada", meaning: "essa escala foi cancelada" }
  ],
  job: [
    { status: "Rascunho", meaning: "vaga salva, ainda não publicada" },
    { status: "Publicada", meaning: "vaga visível para os profissionais" },
    { status: "Em andamento", meaning: "o turno da vaga está acontecendo" },
    { status: "Concluída", meaning: "a vaga foi finalizada" },
    { status: "Cancelada", meaning: "a vaga foi cancelada" }
  ]
};

export function StatusLegend({ type }: { type: StatusBadgeType }) {
  return (
    <details className="term-hint status-legend">
      <summary className="term-hint-trigger">O que significa cada status?</summary>
      <div className="term-hint-bubble status-legend-bubble">
        <ul className="grid gap-1.5">
          {legendCopy[type].map((item) => (
            <li key={item.status}>
              <strong>{item.status}:</strong> {item.meaning}.
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
