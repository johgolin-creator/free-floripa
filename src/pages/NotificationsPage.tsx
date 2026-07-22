import { Bell, CheckCircle2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatDateTime } from "../lib/format";

export function NotificationsPage() {
  const { state, markNotificationRead, markRoleNotificationsRead } = useAppStore();
  const notifications = state.notifications.filter((notification) => notification.role === state.activeRole);
  const hasUnread = notifications.some((notification) => !notification.read);

  return (
    <div>
      <SectionHeader
        eyebrow="Notificações"
        title="Central de notificações"
        description="Eventos internos do MVP. Push real entra na integração futura."
        action={
          hasUnread ? (
            <button type="button" onClick={() => markRoleNotificationsRead(state.activeRole)} className="secondary">
              <CheckCircle2 size={17} /> Marcar todas como lidas
            </button>
          ) : null
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação" text="Atualizações importantes aparecerão nesta central." />
      ) : (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <article key={notification.id} className="card flex gap-3 p-4">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${notification.read ? "bg-slate-100 text-slate-500" : "bg-aqua-100 text-aqua-700"}`}>
                {notification.read ? <CheckCircle2 size={19} /> : <Bell size={19} />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-navy-950">{notification.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                <span className="mt-2 block text-xs font-semibold text-slate-500">{formatDateTime(notification.createdAt)}</span>
              </div>
              {!notification.read && (
                <button type="button" onClick={() => markNotificationRead(notification.id)} className="secondary shrink-0 px-3">
                  Marcar lida
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
