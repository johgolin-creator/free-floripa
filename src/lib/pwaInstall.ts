import { useEffect, useState } from "react";

// Instalação do PONT como PWA no Android (e outros navegadores Chromium),
// no lugar do .apk baixável de antes. O Chrome dispara "beforeinstallprompt"
// só quando a página já tem manifest válido e um service worker registrado
// — por isso registerServiceWorkerForInstall() roda cedo, em main.tsx, sem
// esperar a pessoa ativar notificações (que é quando webPush.ts registra o
// mesmo /sw.js hoje; registrar de novo aqui é seguro, o navegador reaproveita
// o registro existente).

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function registerServiceWorkerForInstall() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Sem service worker o app ainda funciona normalmente pelo navegador,
    // só não fica instalável — não é um erro que precise interromper nada.
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/** true assim que o Chrome/Android sinalizar que o site pode ser instalado. */
export function usePwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null);

  useEffect(() => {
    const listener = () => setCanInstall(deferredPrompt !== null);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  async function promptInstall(): Promise<"accepted" | "dismissed" | null> {
    if (!deferredPrompt) return null;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    notify();
    try {
      // Em teoria prompt()/userChoice sempre resolvem quando o navegador
      // realmente mostra o diálogo nativo - mas se algo impedir a UI de
      // aparecer (foco da aba, navegador incomum), isso travaria o botão
      // pra sempre sem essa rede de segurança; melhor cair no modal manual.
      const result = await Promise.race([
        prompt.prompt().then(() => prompt.userChoice),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000))
      ]);
      return result ? result.outcome : null;
    } catch {
      return null;
    }
  }

  return { canInstall, promptInstall };
}
