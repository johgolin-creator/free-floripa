import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Isola uma tela: se ela quebrar ao renderizar, mostra o motivo aqui dentro
 *  (com o menu do app ainda de pé) em vez de derrubar o app inteiro na tela
 *  genérica "Algo deu errado", e manda o erro pro Sentry. */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="card grid gap-3 p-5">
        <strong className="text-lg text-white">Não foi possível abrir esta tela</strong>
        <p className="text-sm font-semibold text-slate-600">
          Tente recarregar. Se continuar, fale com o suporte e informe o erro abaixo.
        </p>
        <code className="break-words rounded-lg bg-slate-50 p-3 text-xs font-bold text-alert">
          {this.state.error.name}: {this.state.error.message}
        </code>
        <button type="button" className="primary w-full sm:w-auto" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}
