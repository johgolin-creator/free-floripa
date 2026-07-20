import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

mkdirSync(join(dist, ".openai"), { recursive: true });
mkdirSync(join(dist, "server"), { recursive: true });
copyFileSync(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));
const indexHtml = readFileSync(join(dist, "index.html"), "utf8");

writeFileSync(
  join(dist, "server", "index.js"),
  `const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function extension(pathname) {
  const match = pathname.match(/\\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : ".html";
}

async function serveAsset(env, request) {
  if (env?.ASSETS?.fetch) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
  }

  const url = new URL(request.url);
  const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fallback = filePath.startsWith("/assets/") ? filePath : "/index.html";
  const body = fallback === "/index.html" ? INDEX_HTML : "Arquivo não encontrado";
  return new Response(body, {
    status: fallback === "/index.html" ? 200 : 404,
    headers: { "content-type": MIME_TYPES[extension(fallback)] ?? "text/plain; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    return serveAsset(env, request);
  }
};

const INDEX_HTML = ${JSON.stringify(indexHtml)};
`,
  "utf8"
);
