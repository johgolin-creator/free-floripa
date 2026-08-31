import * as Sentry from "@sentry/react";

// Monitoramento de erro. Só liga se VITE_SENTRY_DSN estiver definido (no
// Render). Sem a variável, isto é um no-op — o app roda igual e o
// Sentry.ErrorBoundary no main.tsx ainda mostra a tela de fallback, só não
// reporta pra lugar nenhum.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Só captura de erro. Sem performance tracing nem session replay, que
    // consomem rápido a cota do plano gratuito.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
      // Extensões de navegador / scripts de terceiros
      "top.GLOBALS",
      "originalCreateNotification"
    ]
  });
}
