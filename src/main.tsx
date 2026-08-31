import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import { AuthProvider } from "./lib/auth";
import { AppProvider } from "./lib/store";
import App from "./App";
import "./index.css";

initSentry();
initAnalytics();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<AppCrash />}>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function AppCrash() {
  return (
    <div className="grid min-h-screen place-items-center bg-ice px-4 text-center">
      <div className="card max-w-sm p-6">
        <strong className="text-lg text-navy-950">Algo deu errado</strong>
        <p className="mt-2 text-sm text-slate-600">
          Tivemos um problema ao carregar esta tela. Recarregue a página para tentar de novo.
        </p>
        <button type="button" className="primary mt-4 w-full" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    </div>
  );
}
