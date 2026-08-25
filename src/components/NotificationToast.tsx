import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useAppStore } from "../lib/store";
import type { NotificationItem } from "../lib/types";

const VISIBLE_MS = 7000;

export function NotificationToast() {
  const { state, markNotificationRead } = useAppStore();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const roleNotifications = state.notifications.filter((notification) => notification.role === state.activeRole);

    if (seenIds.current === null) {
      seenIds.current = new Set(roleNotifications.map((notification) => notification.id));
      return;
    }

    const fresh = roleNotifications.filter((notification) => !seenIds.current?.has(notification.id));
    if (fresh.length === 0) return;

    fresh.forEach((notification) => seenIds.current?.add(notification.id));
    setToasts((current) => [...fresh, ...current].slice(0, 3));
  }, [state.notifications, state.activeRole]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, VISIBLE_MS)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts]);

  if (toasts.length === 0) return null;

  function dismiss(id: string) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  function openNotification(notification: NotificationItem) {
    markNotificationRead(notification.id);
    dismiss(notification.id);
    navigate("/app/notificacoes");
  }

  return (
    <div className="notification-toast-stack">
      {toasts.map((toast) => (
        <article key={toast.id} className="notification-toast" role="alert">
          <button type="button" className="notification-toast-body" onClick={() => openNotification(toast)}>
            <span className="notification-toast-icon">
              <Bell size={18} />
            </span>
            <span className="min-w-0">
              <strong>{toast.title}</strong>
              <span className="notification-toast-text">{toast.body}</span>
            </span>
          </button>
          <button
            type="button"
            className="notification-toast-close"
            onClick={() => dismiss(toast.id)}
            aria-label="Fechar notificação"
          >
            <X size={15} />
          </button>
        </article>
      ))}
    </div>
  );
}
