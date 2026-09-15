import { supabase } from "./supabase";

// Push notifications do navegador (Web Push) - funciona no Android (qualquer
// navegador) e no iPhone (só depois de "Adicionar à Tela de Início", já que
// o Safari só libera push pra PWA instalada, não pra aba comum). Sem app
// nativo, sem Firebase, sem conta de desenvolvedor.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const webPushSupported =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  Boolean(VAPID_PUBLIC_KEY) &&
  Boolean(supabase);

export type WebPushStatus = "unsupported" | "denied" | "subscribed" | "not-subscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  return existing ?? navigator.serviceWorker.register("/sw.js");
}

/** Estado atual: se o navegador suporta, se a pessoa já decidiu (permitiu/
 *  bloqueou) e se já existe uma inscrição ativa neste aparelho. */
export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (!webPushSupported) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return "not-subscribed";

  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "subscribed" : "not-subscribed";
}

/** Pede permissão (se preciso), inscreve este navegador e salva no banco. */
export async function subscribeToWebPush(userId: string): Promise<{ ok: boolean; message: string }> {
  if (!webPushSupported || !supabase) {
    return { ok: false, message: "Notificações do navegador não são suportadas aqui." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Permissão de notificação não concedida." };
  }

  try {
    const registration = await getServiceWorkerRegistration();
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource
      });
    }

    const json = subscription.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!p256dh || !auth) throw new Error("Inscrição inválida.");

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, endpoint: subscription.endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      );
    if (error) throw new Error(error.message);

    return { ok: true, message: "Notificações ativadas neste aparelho." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Não foi possível ativar as notificações." };
  }
}

/** Cancela a inscrição neste aparelho (navegador + banco). */
export async function unsubscribeFromWebPush(): Promise<{ ok: boolean; message: string }> {
  if (!webPushSupported || !supabase) return { ok: false, message: "Não suportado." };

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
    return { ok: true, message: "Notificações desativadas neste aparelho." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Não foi possível desativar." };
  }
}
