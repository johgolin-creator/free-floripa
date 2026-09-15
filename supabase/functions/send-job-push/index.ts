// Manda um Web Push (push notification de navegador) pra todo mundo
// inscrito, quando uma vaga é publicada (mesma condição do trigger em
// notify_workers_new_job.sql: acabou de sair de "Rascunho"/nunca esteve em
// "Rascunho"/"Cancelada").
//
// Disparado por um Database Webhook (Supabase Dashboard > Database >
// Webhooks) em INSERT e UPDATE de public.jobs, apontando pra esta função.
// O payload do webhook é { type: "INSERT"|"UPDATE", table, record, old_record }.
//
// Implementa o protocolo Web Push (RFC 8291 - criptografia aes128gcm, RFC
// 8292 - VAPID) na mão com Web Crypto, porque a lib "web-push" do npm depende
// de módulos do Node que não rodam bem no Deno das Edge Functions.
//
// Secrets necessários (Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY   — mesma chave pública de VITE_VAPID_PUBLIC_KEY no Render
//   VAPID_PRIVATE_KEY  — a chave privada correspondente (nunca vai pro client)
//   VAPID_SUBJECT       — ex.: mailto:contato@usepont.com.br
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(signature);
}

/** HKDF-Expand (RFC 5869) para até 32 bytes - um único bloco T(1) basta,
 *  já que todos os comprimentos que usamos (32, 16, 12) cabem em SHA-256. */
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t1 = await hmacSha256(prk, concatBytes(info, Uint8Array.of(1)));
  return t1.slice(0, length);
}

/** Criptografa o payload no formato aes128gcm (RFC 8291) para uma inscrição
 *  específica. Devolve o corpo pronto pra mandar no POST. */
async function encryptPayload(payload: Uint8Array, p256dhB64: string, authB64: string): Promise<Uint8Array> {
  const userPublicKeyBytes = base64UrlToUint8Array(p256dhB64);
  const authSecret = base64UrlToUint8Array(authB64);

  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey } as EcdhKeyDeriveParams,
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const prkKey = await hmacSha256(authSecret, sharedSecret);
  const keyInfo = concatBytes(strToBytes("WebPush: info\0"), userPublicKeyBytes, localPublicKeyBytes);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmacSha256(salt, ikm);

  const cek = await hkdfExpand(prk, strToBytes("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk, strToBytes("Content-Encoding: nonce\0"), 12);

  // Delimitador 0x02 (último/único registro), sem padding extra - RFC 8188.
  const paddedPayload = concatBytes(payload, Uint8Array.of(2));

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertextBits = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload);
  const ciphertext = new Uint8Array(ciphertextBits);

  const recordSize = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, recordSize, false);
  const idlen = Uint8Array.of(localPublicKeyBytes.length);

  const header = concatBytes(salt, rsBytes, idlen, localPublicKeyBytes);
  return concatBytes(header, ciphertext);
}

async function buildVapidAuthHeader(
  endpoint: string,
  publicKeyB64: string,
  privateKeyB64: string,
  subject: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = uint8ArrayToBase64Url(strToBytes(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(strToBytes(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const publicKeyBytes = base64UrlToUint8Array(publicKeyB64);
  const privateKeyBytes = base64UrlToUint8Array(privateKeyB64);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
    d: uint8ArrayToBase64Url(privateKeyBytes),
    ext: true
  };

  const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // Web Crypto já devolve a assinatura no formato raw (r||s) que o JWS ES256 espera - sem DER.
  const signatureBits = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, strToBytes(unsigned));
  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signatureBits));

  return `vapid t=${unsigned}.${signatureB64}, k=${publicKeyB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: Record<string, unknown>,
  vapid: { publicKey: string; privateKey: string; subject: string }
): Promise<{ ok: boolean; expired: boolean; status?: number }> {
  const body = await encryptPayload(strToBytes(JSON.stringify(payload)), subscription.p256dh, subscription.auth);
  const authHeader = await buildVapidAuthHeader(subscription.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject);

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: authHeader
    },
    body
  });

  // 404/410 = inscrição não existe mais (navegador desinstalado, permissão
  // revogada etc.) - o chamador apaga a linha do banco.
  const expired = response.status === 404 || response.status === 410;
  return { ok: response.ok, expired, status: response.status };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@usepont.com.br";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ ok: false, error: "Função não configurada." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let body: { type?: string; table?: string; record?: Record<string, unknown>; old_record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Corpo inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const record = body.record;
  const oldRecord = body.old_record;
  if (body.table !== "jobs" || !record) {
    return new Response(JSON.stringify({ ok: true, skipped: "not a jobs event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const status = String(record.status ?? "");
  const closedStatuses = ["Rascunho", "Cancelada"];
  const justPublished =
    body.type === "INSERT"
      ? !closedStatuses.includes(status)
      : body.type === "UPDATE" &&
        String(oldRecord?.status ?? "") === "Rascunho" &&
        !closedStatuses.includes(status);

  if (!justPublished) {
    return new Response(JSON.stringify({ ok: true, skipped: "job not newly published" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: company } = await admin
    .from("company_profiles")
    .select("establishment_name")
    .eq("id", record.company_id as string)
    .maybeSingle();

  // push_subscriptions.user_id não tem FK direta pra worker_profiles (as duas
  // só apontam pra auth.users), então filtra em duas consultas em vez de um
  // embed do PostgREST.
  const { data: workerAccounts } = await admin.from("worker_profiles").select("user_id").not("user_id", "is", null);
  const workerUserIds = new Set((workerAccounts ?? []).map((row: { user_id: string }) => row.user_id));

  const { data: allSubscriptions } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, user_id");
  const subscriptions = (allSubscriptions ?? []).filter((sub: { user_id: string }) => workerUserIds.has(sub.user_id));

  const payload = {
    title: "Nova vaga disponível",
    body: `${company?.establishment_name ?? "Uma empresa"} está contratando ${record.quantity} ${record.function_name}(s) para "${record.title}". Candidate-se agora no PONT!`,
    url: "/app/vagas"
  };

  const vapid = { publicKey: vapidPublicKey, privateKey: vapidPrivateKey, subject: vapidSubject };
  let sent = 0;
  const expiredIds: string[] = [];

  for (const sub of (subscriptions ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
    try {
      const result = await sendWebPush(sub, payload, vapid);
      if (result.ok) sent++;
      if (result.expired) expiredIds.push(sub.id);
    } catch (error) {
      console.error(`[send-job-push] falha ao enviar para ${sub.id}:`, error);
    }
  }

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return new Response(JSON.stringify({ ok: true, sent, total: (subscriptions ?? []).length, expiredRemoved: expiredIds.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
