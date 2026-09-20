import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCopy, MessageCircle, UserX, XCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { formatDate, getWhatsAppUrl } from "../lib/format";
import type { Application, Job, WorkerProfile } from "../lib/types";

type Bucket = "confirmado" | "recusou" | "aguardando" | "faltou" | "candidato";

interface Person {
  application: Application;
  worker: WorkerProfile | undefined;
}

interface Group {
  key: string;
  name: string;
  jobs: Job[];
  slots: number;
  confirmado: Person[];
  recusou: Person[];
  aguardando: Person[];
  faltou: Person[];
  candidato: Person[];
}

interface Day {
  date: string;
  groups: Group[];
}

/** Como o status da candidatura vira "resposta" no painel:
 *  - confirmou: Aprovada / Trabalho concluído
 *  - recusou: Convite recusado / Cancelada
 *  - sem resposta: Convidada (o convite foi enviado e ainda não respondido)
 *  - faltou: Falta registrada
 *  - candidato: Enviada / Em análise (aguarda decisão da empresa, não do profissional)
 *  Recusada (a empresa recusou o candidato) não entra. */
function getBucket(status: Application["status"]): Bucket | null {
  if (status === "Aprovada" || status === "Trabalho concluído") return "confirmado";
  if (status === "Convite recusado" || status === "Cancelada") return "recusou";
  if (status === "Convidada") return "aguardando";
  if (status === "Falta registrada") return "faltou";
  if (status === "Enviada" || status === "Em análise") return "candidato";
  return null;
}

/** Vagas criadas pela aba Eventos têm o título "Evento: função". Agrupamos por
 *  evento; as demais ficam agrupadas pelo próprio título. */
function getGroupName(job: Job) {
  if (job.description.includes("Equipe criada pela aba Eventos")) {
    const separatorIndex = job.title.indexOf(":");
    if (separatorIndex > 0) return job.title.slice(0, separatorIndex).trim();
  }
  return job.title;
}

function buildDays(jobs: Job[], applications: Application[], workers: WorkerProfile[]): Day[] {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const days = new Map<string, Map<string, Group>>();

  for (const job of jobs) {
    const dayGroups = days.get(job.date) ?? new Map<string, Group>();
    const name = getGroupName(job);
    const group =
      dayGroups.get(name) ??
      ({ key: `${job.date}|${name}`, name, jobs: [], slots: 0, confirmado: [], recusou: [], aguardando: [], faltou: [], candidato: [] } as Group);

    group.jobs.push(job);
    group.slots += job.quantity;
    for (const application of applications) {
      if (application.jobId !== job.id) continue;
      const bucket = getBucket(application.status);
      if (!bucket) continue;
      group[bucket].push({ application, worker: workerById.get(application.workerId) });
    }

    dayGroups.set(name, group);
    days.set(job.date, dayGroups);
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groups]) => ({ date, groups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)) }));
}

function weekday(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("pt-BR", { weekday: "long" });
}

function summaryText(date: string, group: Group) {
  const parts = [
    `${group.confirmado.length} confirmado(s)`,
    `${group.recusou.length} recusaram`,
    `${group.aguardando.length} sem resposta`
  ];
  const missing = Math.max(0, group.slots - group.confirmado.length);
  const tail = missing > 0 ? ` Faltam ${missing} para completar.` : " Escala completa.";
  return `Escala ${formatDate(date)} - ${group.name}: ${parts.join(", ")}.${tail}`;
}

export function ScheduleConfirmationPanel({
  jobs,
  applications,
  workers,
  companyName
}: {
  jobs: Job[];
  applications: Application[];
  workers: WorkerProfile[];
  companyName: string;
}) {
  const days = useMemo(() => buildDays(jobs, applications, workers), [jobs, applications, workers]);
  const [copiedKey, setCopiedKey] = useState("");

  function copy(key: string, text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(""), 1800);
      })
      .catch(() => {
        // Sem permissão da área de transferência: o texto continua visível na tela.
      });
  }

  return (
    <section className="schedule-section">
      <div>
        <h3 className="text-lg font-black text-white">Confirmações por dia</h3>
        <p className="text-sm font-semibold text-slate-600">
          Quem confirmou, quem recusou e quem ainda não respondeu, por casa/evento. Use para cobrar quem falta.
        </p>
      </div>

      {days.length === 0 ? (
        <EmptyState title="Nada para acompanhar" text="Publique uma vaga ou crie um evento para ver as confirmações aqui." />
      ) : (
        <div className="grid gap-4">
          {days.map((day) => (
            <div key={day.date} className="grid gap-2">
              <h4 className="text-sm font-black uppercase text-slate-500">
                {formatDate(day.date)} {weekday(day.date) && `- ${weekday(day.date)}`}
              </h4>
              {day.groups.map((group) => {
                const answered = group.confirmado.length + group.recusou.length + group.aguardando.length;
                const missing = Math.max(0, group.slots - group.confirmado.length);
                const pct = (count: number) => (answered > 0 ? (count / answered) * 100 : 0);
                const summary = summaryText(day.date, group);

                return (
                  <details key={group.key} className="card p-4" open={group.aguardando.length > 0}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <strong className="block text-base text-white">{group.name}</strong>
                          <span className="text-xs font-semibold text-slate-500">
                            {group.slots} vaga{group.slots === 1 ? "" : "s"}
                            {group.jobs.length > 1 ? ` em ${group.jobs.length} funções` : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-black">
                          <span className="badge bg-aqua-50 text-aqua-700">
                            <CheckCircle2 size={13} /> {group.confirmado.length} confirmaram
                          </span>
                          <span className="badge border-red-100 bg-red-50 text-alert">
                            <XCircle size={13} /> {group.recusou.length} recusaram
                          </span>
                          <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                            {group.aguardando.length} sem resposta
                          </span>
                        </div>
                      </div>
                      {answered > 0 && (
                        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                          <span className="bg-aqua-300" style={{ width: `${pct(group.confirmado.length)}%` }} />
                          <span className="bg-alert" style={{ width: `${pct(group.recusou.length)}%` }} />
                          <span className="bg-amber-400" style={{ width: `${pct(group.aguardando.length)}%` }} />
                        </div>
                      )}
                      {missing > 0 && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600">
                          <AlertTriangle size={14} /> Faltam {missing} profissional{missing === 1 ? "" : "is"} para completar.
                        </p>
                      )}
                    </summary>

                    <div className="mt-4 grid gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="secondary min-h-9 px-3 text-xs" onClick={() => copy(group.key, summary)}>
                          <ClipboardCopy size={15} /> {copiedKey === group.key ? "Copiado!" : "Copiar resumo"}
                        </button>
                        {group.candidato.length > 0 && (
                          <Link to={`/app/candidatos?vaga=${group.jobs[0].id}`} className="text-xs font-black text-aqua-700">
                            {group.candidato.length} candidato{group.candidato.length === 1 ? "" : "s"} aguardando sua aprovação
                          </Link>
                        )}
                      </div>

                      <PeopleList
                        title="Sem resposta"
                        tone="amber"
                        people={group.aguardando}
                        empty="Ninguém pendente."
                        chase={{ groupName: group.name, date: day.date, companyName }}
                      />
                      <PeopleList title="Confirmaram" tone="aqua" people={group.confirmado} empty="Ninguém confirmou ainda." />
                      <PeopleList title="Recusaram" tone="red" people={group.recusou} empty="Ninguém recusou." />
                      {group.faltou.length > 0 && (
                        <PeopleList title="Faltaram" tone="red" people={group.faltou} empty="" icon={<UserX size={13} />} />
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const toneClass: Record<"aqua" | "red" | "amber", string> = {
  aqua: "text-aqua-700",
  red: "text-alert",
  amber: "text-amber-600"
};

function PeopleList({
  title,
  tone,
  people,
  empty,
  chase,
  icon
}: {
  title: string;
  tone: "aqua" | "red" | "amber";
  people: Person[];
  empty: string;
  chase?: { groupName: string; date: string; companyName: string };
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <strong className={`flex items-center gap-1.5 text-xs font-black uppercase ${toneClass[tone]}`}>
        {icon} {title} ({people.length})
      </strong>
      {people.length === 0 ? (
        empty && <p className="mt-1 text-xs font-semibold text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-1 grid gap-1">
          {people.map(({ application, worker }) => (
            <li key={application.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="min-w-0 truncate text-sm font-bold text-white">{worker?.name ?? "Profissional"}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs font-semibold text-slate-500">
                {worker?.phone && <span>{worker.phone}</span>}
                {chase && worker?.phone && (
                  <a
                    href={getWhatsAppUrl(
                      worker.phone,
                      `Olá, ${worker.name.split(" ")[0]}! Você consegue confirmar presença na escala de ${formatDate(chase.date)} (${chase.groupName}) no ${chase.companyName}?`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-black text-aqua-700"
                  >
                    <MessageCircle size={14} /> Cobrar
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
