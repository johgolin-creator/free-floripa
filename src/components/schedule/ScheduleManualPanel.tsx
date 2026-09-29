import { useState } from "react";
import { Edit3, FileText, MapPin, MessageCircle, Printer, Receipt, Trash2, UserMinus, UserPlus } from "lucide-react";
import { KebabMenu, type MenuAction } from "./KebabMenu";
import { PanelShell } from "./PanelShell";
import { ScheduleInvitePanel } from "./ScheduleInvitePanel";
import { formatDate, getWhatsAppUrl } from "../../lib/format";
import { functionLabel } from "../../lib/functionInfo";
import type { TeamMember } from "../../lib/scheduleTeam";
import { formatCPF } from "../../lib/validation";
import { parseISODate } from "../../lib/scheduleEvents";
import type { CompanySchedule } from "../../lib/types";

const LIME = "#C8FF38";
const AMBER = "#F4B740";
const RED = "#FF5252";
const GRAY = "#7D8494";

const quickButton = "secondary min-h-9 px-3 text-xs";

function longDate(date: string) {
  const label = parseISODate(date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function scheduleStatus(status: CompanySchedule["status"]): { label: string; color: string } {
  if (status === "Concluída") return { label: "Concluída", color: GRAY };
  if (status === "Cancelada") return { label: "Cancelada", color: RED };
  if (status === "Confirmada") return { label: "Confirmada", color: LIME };
  return { label: "Planejada", color: AMBER };
}

/** Painel de uma escala criada à mão: equipe prevista, detalhes e o link de convite. */
export function ScheduleManualPanel({
  schedule,
  members,
  companyName,
  disabled,
  onRemoveMember,
  onInviteChanged,
  onEdit,
  onDelete,
  onPrint,
  onReceipts
}: {
  schedule: CompanySchedule;
  /** Equipe já somada: nomes digitados + quem confirmou pelo link. */
  members: TeamMember[];
  companyName: string;
  disabled?: boolean;
  onRemoveMember: (member: TeamMember) => void;
  onInviteChanged: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onReceipts: () => void;
}) {
  const [tab, setTab] = useState("equipe");
  const status = scheduleStatus(schedule.status);
  const place = [schedule.location, schedule.neighborhood].filter(Boolean).join(" - ");
  const open = Math.max(0, schedule.quantity - members.length);

  function memberActions(member: TeamMember): MenuAction[] {
    const actions: MenuAction[] = [];
    if (member.phone) {
      actions.push({
        label: "Chamar no WhatsApp",
        icon: <MessageCircle size={15} />,
        href: getWhatsAppUrl(member.phone, `Olá, ${member.name.split(" ")[0]}. Estou organizando a escala ${schedule.title} no ${companyName}.`)
      });
    }
    if (member.source === "convite" && member.responseId) {
      actions.push({ label: "Remover da equipe", icon: <UserMinus size={15} />, danger: true, disabled, onClick: () => onRemoveMember(member) });
    } else {
      actions.push({ label: "Para tirar este nome, use Editar escala", icon: <Edit3 size={15} />, disabled: true });
    }
    return actions;
  }

  const team = (
    <div className="grid gap-3">
      <h4 className="text-lg font-black text-white">
        Equipe ({members.length}/{schedule.quantity})
      </h4>
      <div className="overflow-hidden rounded-xl border border-white/10">
        {members.length === 0 ? (
          <p className="px-3 py-4 text-sm font-semibold text-slate-400">
            Ninguém na equipe ainda. Quem confirmar pelo link de convite (aba Convite) entra aqui sozinho, ou use "Editar escala" para incluir nomes.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {members.map((member, index) => (
              <li key={`${member.name}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white">
                  {member.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-white">{member.name}</strong>
                  <span className="block truncate text-xs font-semibold text-slate-400">
                    {functionLabel(schedule.function)}
                    {member.cpf && <span className="text-slate-500"> · CPF {formatCPF(member.cpf)}</span>}
                  </span>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black text-white"
                  style={{ borderColor: `${LIME}66`, background: `${LIME}1f` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: LIME }} />
                  {member.source === "convite" ? "Confirmou pelo link" : "Previsto"}
                </span>
                <KebabMenu actions={memberActions(member)} label={`Ações de ${member.name}`} vertical />
              </li>
            ))}
          </ul>
        )}
        {open > 0 && (
          <div className="flex items-center gap-3 border-t border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dashed border-white/20 text-slate-400">
              <UserPlus size={16} />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-400">
              {open} vaga{open === 1 ? "" : "s"} em aberto
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const details = (
    <div className="grid gap-3">
      <section className="rounded-xl border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-black text-white">Local</h5>
        <p className="flex items-start gap-2 text-xs font-semibold text-slate-600">
          <MapPin size={14} className="mt-0.5 shrink-0" /> {place || "Local não informado."}
        </p>
      </section>
      <section className="rounded-xl border border-white/10 p-3">
        <h5 className="mb-2 text-sm font-black text-white">Observações</h5>
        {schedule.notes ? (
          <p className="flex items-start gap-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600">
            <FileText size={13} className="mt-0.5 shrink-0 text-slate-400" /> {schedule.notes}
          </p>
        ) : (
          <p className="text-xs font-semibold text-slate-400">Nenhuma observação para esta escala.</p>
        )}
      </section>
      <p className="text-xs font-semibold text-slate-500">
        {functionLabel(schedule.function)} · {schedule.quantity} vaga{schedule.quantity === 1 ? "" : "s"} · {formatDate(schedule.date)}
      </p>
    </div>
  );

  return (
    <PanelShell
      title={schedule.title}
      statusLabel={status.label}
      statusColor={status.color}
      date={longDate(schedule.date)}
      time={`${schedule.startsAt} – ${schedule.endsAt}`}
      place={place}
      quickActions={
        <>
          <button type="button" className={quickButton} onClick={onPrint}>
            <Printer size={14} /> Imprimir
          </button>
          <button type="button" className={quickButton} onClick={onReceipts}>
            <Receipt size={14} /> Recibos
          </button>
        </>
      }
      tabs={[
        { id: "equipe", label: "Equipe" },
        { id: "detalhes", label: "Detalhes" },
        { id: "convite", label: "Convite" }
      ]}
      activeTab={tab}
      onTab={setTab}
      footer={
        <>
          <button type="button" className="secondary min-h-11 justify-center" disabled={disabled} onClick={onEdit}>
            <Edit3 size={16} /> Editar escala
          </button>
          <button type="button" className="danger min-h-11 justify-center" disabled={disabled} onClick={onDelete}>
            <Trash2 size={16} /> Excluir
          </button>
        </>
      }
    >
      {tab === "equipe" ? (
        team
      ) : tab === "detalhes" ? (
        details
      ) : (
        <ScheduleInvitePanel key={schedule.id} schedule={schedule} companyName={companyName} disabled={disabled} onChanged={onInviteChanged} />
      )}
    </PanelShell>
  );
}
