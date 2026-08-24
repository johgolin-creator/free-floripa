import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Filter,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { formatDateTime } from "../lib/format";
import { useAppStore } from "../lib/store";
import type { NotificationItem, UserRole } from "../lib/types";

type NotificationKind = "Vagas" | "Candidaturas" | "Escala" | "Pagamento" | "Perfil" | "Sistema";
type NotificationFilter = "Todas" | "Não lidas" | NotificationKind;
type IconType = typeof Bell;

interface NotificationMeta {
  kind: NotificationKind;
  label: string;
  tone: string;
  Icon: IconType;
  href: string;
  actionLabel: string;
  helper: string;
}

const filters: NotificationFilter[] = ["Todas", "Não lidas", "Vagas", "Candidaturas", "Escala", "Pagamento", "Perfil", "Sistema"];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function getMeta(notification: NotificationItem, role: UserRole): NotificationMeta {
  const text = normalizeText(`${notification.title} ${notification.body}`);
  const workerProfilePath = role === "empresa" ? "/app/perfil-empresa" : "/app/perfil-trabalhador";

  if (includesAny(text, ["escala", "turno", "finalizou"])) {
    return {
      kind: "Escala",
      label: "Escala",
      tone: "bg-aqua-50 text-aqua-700 border-aqua-100",
      Icon: CalendarCheck,
      href: role === "empresa" ? "/app/escala" : "/app/trabalhos",
      actionLabel: role === "empresa" ? "Ver escala" : "Meus trabalhos",
      helper: role === "empresa" ? "Acompanhe presença, horários e equipe confirmada." : "Confira seus turnos e status de chegada."
    };
  }

  if (includesAny(text, ["candidatura", "candidato", "aprovada", "aprovado", "recusada", "recusado", "inscreveu", "confirmou"])) {
    return {
      kind: "Candidaturas",
      label: "Candidatura",
      tone: "bg-amber-50 text-amber-700 border-amber-100",
      Icon: ClipboardList,
      href: role === "empresa" ? "/app/candidatos" : "/app/candidaturas",
      actionLabel: role === "empresa" ? "Ver candidatos" : "Ver candidatura",
      helper: role === "empresa" ? "Decida quem aprovar e libere o próximo passo." : "Veja o andamento da sua candidatura."
    };
  }

  if (includesAny(text, ["vaga", "reposição", "trabalho", "plantão", "diária"])) {
    return {
      kind: "Vagas",
      label: "Vaga",
      tone: "bg-sky-50 text-sky-700 border-sky-100",
      Icon: BriefcaseBusiness,
      href: role === "empresa" ? "/app/minhas-vagas" : "/app/vagas",
      actionLabel: role === "empresa" ? "Minhas vagas" : "Ver vagas",
      helper: role === "empresa" ? "Ajuste publicação, urgência e preenchimento." : "Abra oportunidades compatíveis com seu perfil."
    };
  }

  if (includesAny(text, ["plano", "assinatura", "credito", "pagamento", "profissional"])) {
    return {
      kind: "Pagamento",
      label: "Pagamento",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
      Icon: CreditCard,
      href: role === "empresa" ? "/app/empresa" : "/app/planos",
      actionLabel: role === "empresa" ? "Ver painel" : "Ver planos",
      helper: "Resolva pendências de moedas, pagamento ou liberação de recursos."
    };
  }

  if (includesAny(text, ["perfil", "cadastro", "foto", "conta", "dados"])) {
    return {
      kind: "Perfil",
      label: "Perfil",
      tone: "bg-violet-50 text-violet-700 border-violet-100",
      Icon: UserRound,
      href: workerProfilePath,
      actionLabel: "Editar perfil",
      helper: "Mantenha seus dados completos para melhorar confiança e conversão."
    };
  }

  return {
    kind: "Sistema",
    label: "Sistema",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: ShieldCheck,
    href: role === "empresa" ? "/app/empresa" : "/app/trabalhador",
    actionLabel: "Ver painel",
    helper: "Aviso geral do PONT para manter sua operação em dia."
  };
}

function isToday(createdAt: string) {
  return new Date(createdAt).toDateString() === new Date().toDateString();
}

export function NotificationsPage() {
  const { state, markNotificationRead, markRoleNotificationsRead } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("Todas");

  const notifications = useMemo(
    () =>
      state.notifications
        .filter((notification) => notification.role === state.activeRole)
        .map((notification) => ({ notification, meta: getMeta(notification, state.activeRole) }))
        .sort((a, b) => b.notification.createdAt.localeCompare(a.notification.createdAt)),
    [state.activeRole, state.notifications]
  );

  const filteredNotifications = notifications.filter(({ notification, meta }) => {
    if (activeFilter === "Todas") return true;
    if (activeFilter === "Não lidas") return !notification.read;
    return meta.kind === activeFilter;
  });

  const unreadCount = notifications.filter(({ notification }) => !notification.read).length;
  const todayCount = notifications.filter(({ notification }) => isToday(notification.createdAt)).length;
  const actionCount = notifications.filter(({ notification, meta }) => !notification.read && meta.kind !== "Sistema").length;
  const hasUnread = unreadCount > 0;

  return (
    <div>
      <SectionHeader
        eyebrow="Notificações"
        title="Central de notificações"
        description="Acompanhe vagas, candidaturas, escala, perfil e avisos importantes em um só lugar."
        action={
          hasUnread ? (
            <button type="button" onClick={() => markRoleNotificationsRead(state.activeRole)} className="secondary">
              <CheckCircle2 size={17} /> Marcar todas como lidas
            </button>
          ) : null
        }
      />

      <section className="mb-5 grid gap-4 rounded-lg border border-white/10 bg-brand-charcoal p-4 shadow-soft ring-1 ring-white/5">
        <div className="smart-dashboard-metrics">
          <div className="smart-dashboard-metric">
            <span>
              <Bell size={18} />
            </span>
            <strong>{notifications.length}</strong>
            <small>Total</small>
          </div>
          <div className="smart-dashboard-metric is-alert">
            <span>
              <Clock3 size={18} />
            </span>
            <strong>{unreadCount}</strong>
            <small>Não lidas</small>
          </div>
          <div className="smart-dashboard-metric">
            <span>
              <CalendarCheck size={18} />
            </span>
            <strong>{todayCount}</strong>
            <small>Hoje</small>
          </div>
          <div className="smart-dashboard-metric">
            <span>
              <ArrowRight size={18} />
            </span>
            <strong>{actionCount}</strong>
            <small>Com ação</small>
          </div>
        </div>
      </section>

      <section className="jobs-filter-panel">
        <div className="jobs-filter-title">
          <div>
            <h3>
              <Filter size={18} /> Filtrar notificações
            </h3>
            <p>Use os filtros para separar avisos operacionais de mensagens de sistema.</p>
          </div>
          <span className="badge">{filteredNotifications.length} exibidas</span>
        </div>
        <div className="worker-filter-buttons">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`worker-filter-button ${activeFilter === filter ? "is-active" : ""}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação" text="Atualizações importantes aparecerão nesta central." />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState title="Nada neste filtro" text="Troque o filtro para ver outros avisos recebidos." />
      ) : (
        <div className="grid gap-3">
          {filteredNotifications.map(({ notification, meta }) => {
            const Icon = meta.Icon;
            return (
              <article
                key={notification.id}
                className={`worker-application-card ${notification.read ? "" : "border-aqua-200 bg-aqua-50/40"}`}
              >
                <div className="worker-card-head">
                  <div className="flex min-w-0 gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg border ${meta.tone}`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge border ${meta.tone}`}>{meta.label}</span>
                        {!notification.read && <span className="badge border-aqua-200 bg-aqua-50 text-aqua-700">Nova</span>}
                      </div>
                      <h3 className="mt-2">{notification.title}</h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{notification.body}</p>
                      <span className="mt-2 block text-xs font-black uppercase text-slate-500">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="worker-action-row">
                    <Link to={meta.href} className="primary">
                      {meta.actionLabel} <ArrowRight size={16} />
                    </Link>
                    {!notification.read && (
                      <button type="button" onClick={() => markNotificationRead(notification.id)} className="secondary">
                        <CheckCircle2 size={16} /> Marcar lida
                      </button>
                    )}
                  </div>
                </div>
                <div className="worker-next-step">
                  <strong className="text-white">Próximo passo:</strong>{" "}
                  <span className="font-semibold text-slate-600">{meta.helper}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
