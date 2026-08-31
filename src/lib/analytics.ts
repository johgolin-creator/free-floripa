// Analytics leve e sem cookies (Umami). Só liga se VITE_UMAMI_SRC e
// VITE_UMAMI_WEBSITE_ID estiverem definidos (no Render). Sem eles, tudo aqui
// é no-op e o app roda igual.
//
// Umami não usa cookies nem identifica a pessoa — coleta contagem de
// pageviews e eventos nomeados. Rastreia navegação de SPA sozinho; a gente
// só adiciona alguns eventos-chave (cadastro, vaga criada, candidatura).

interface UmamiApi {
  track: ((eventName: string, data?: Record<string, unknown>) => void) &
    ((payload: Record<string, unknown>) => void);
}

declare global {
  interface Window {
    umami?: UmamiApi;
  }
}

let enabled = false;

export function initAnalytics() {
  const src = import.meta.env.VITE_UMAMI_SRC;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!src || !websiteId || typeof document === "undefined") return;
  if (document.querySelector('script[data-website-id]')) {
    enabled = true;
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.setAttribute("data-website-id", websiteId);
  document.head.appendChild(script);
  enabled = true;
}

/** Registra um evento nomeado. Silencioso se o analytics estiver desligado. */
export function track(eventName: string, data?: Record<string, unknown>) {
  if (!enabled) return;
  try {
    window.umami?.track(eventName, data);
  } catch {
    // analytics nunca deve quebrar um fluxo do usuário
  }
}
