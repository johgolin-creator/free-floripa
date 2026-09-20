import type { Application, CompanySchedule, Job, WorkerProfile } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { functionLabel } from "../../lib/functionInfo";

// Folhas para imprimir da Escala. São uma lista de presença: nomes numa
// coluna e, à frente, um espaço para o CPF e outro para a assinatura, com
// linhas altas o bastante para escrever à mão. Estilos inline de propósito:
// a folha sai sempre preta sobre branco, independente do tema escuro do app.

const INK = "#000";
const LINE = "#000";
const ROW_HEIGHT = 34;
/** Linhas em branco além da equipe prevista, para quem aparecer e não estava na lista. */
const EXTRA_BLANK_ROWS = 2;
/** Nunca imprime mais linhas em branco que isto (eventos enormes viram várias folhas). */
const MAX_ROWS = 80;

const sheetStyle = {
  padding: 24,
  color: INK,
  background: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif"
} as const;

function PrintHeader({ companyName, title }: { companyName: string; title: string }) {
  return (
    <div style={{ marginBottom: 16, borderBottom: `2px solid ${LINE}`, paddingBottom: 10 }}>
      <strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{companyName}</strong>
      <h1 style={{ margin: "4px 0 0", fontSize: 22 }}>{title}</h1>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#444" }}>Impresso em {new Date().toLocaleString("pt-BR")}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: "3px 8px 3px 0", fontWeight: 700, width: 110, fontSize: 13 }}>{label}</td>
      <td style={{ padding: "3px 0", fontSize: 13 }}>{value}</td>
    </tr>
  );
}

const thStyle = {
  textAlign: "left" as const,
  border: `1px solid ${LINE}`,
  padding: "6px 8px",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
  background: "#eee"
};

const tdStyle = {
  border: `1px solid ${LINE}`,
  padding: "0 8px",
  height: ROW_HEIGHT,
  fontSize: 13,
  verticalAlign: "middle" as const
};

/** Lista de presença: Nº | Nome | CPF | Assinatura. Sem nome = linha em branco para preencher. */
export function AttendanceTable({ names, minRows }: { names: string[]; minRows: number }) {
  const total = Math.min(MAX_ROWS, Math.max(names.length + EXTRA_BLANK_ROWS, minRows));
  const rows = Array.from({ length: total }, (_, index) => names[index] ?? "");

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "6%" }} />
        <col style={{ width: "34%" }} />
        <col style={{ width: "22%" }} />
        <col style={{ width: "38%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "center" }}>Nº</th>
          <th style={thStyle}>Nome</th>
          <th style={thStyle}>CPF</th>
          <th style={thStyle}>Assinatura</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((name, index) => (
          <tr key={index} style={{ pageBreakInside: "avoid" }}>
            <td style={{ ...tdStyle, textAlign: "center", fontSize: 12 }}>{index + 1}</td>
            <td style={{ ...tdStyle, fontWeight: 600 }}>{name}</td>
            <td style={tdStyle} />
            <td style={tdStyle} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Escala criada à mão: os nomes vêm da "Equipe prevista". */
export function SchedulePrintSheet({ companyName, schedule }: { companyName: string; schedule: CompanySchedule }) {
  return (
    <div style={sheetStyle}>
      <PrintHeader companyName={companyName} title={schedule.title} />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <tbody>
          <InfoRow label="Data" value={formatDate(schedule.date)} />
          <InfoRow label="Horário" value={`${schedule.startsAt} às ${schedule.endsAt}`} />
          <InfoRow label="Local" value={[schedule.location, schedule.neighborhood].filter(Boolean).join(" - ")} />
          <InfoRow label="Função" value={functionLabel(schedule.function)} />
          <InfoRow label="Vagas" value={String(schedule.quantity)} />
        </tbody>
      </table>
      <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Lista de presença</strong>
      <AttendanceTable names={schedule.workerNames} minRows={schedule.quantity} />
      {schedule.notes && (
        <>
          <strong style={{ display: "block", marginTop: 16, fontSize: 13 }}>Observações</strong>
          <p style={{ marginTop: 4, whiteSpace: "pre-wrap", fontSize: 13 }}>{schedule.notes}</p>
        </>
      )}
    </div>
  );
}

/** Vaga publicada: só quem está confirmado (Aprovada / Trabalho concluído) entra na lista. */
export function JobSchedulePrintSheet({
  companyName,
  job,
  applications,
  workers
}: {
  companyName: string;
  job: Job;
  applications: Application[];
  workers: WorkerProfile[];
}) {
  const names = applications
    .filter((application) => application.status === "Aprovada" || application.status === "Trabalho concluído")
    .map((application) => workers.find((worker) => worker.id === application.workerId)?.name ?? "Profissional")
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div style={sheetStyle}>
      <PrintHeader companyName={companyName} title={job.title} />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <tbody>
          <InfoRow label="Data" value={formatDate(job.date)} />
          <InfoRow label="Horário" value={`${job.startsAt} às ${job.endsAt}`} />
          <InfoRow label="Local" value={[job.approximateAddress, job.neighborhood].filter(Boolean).join(", ")} />
          <InfoRow label="Função" value={functionLabel(job.function)} />
          <InfoRow label="Vagas" value={String(job.quantity)} />
        </tbody>
      </table>
      <strong style={{ display: "block", marginBottom: 6, fontSize: 14 }}>Lista de presença</strong>
      <AttendanceTable names={names} minRows={job.quantity} />
    </div>
  );
}
