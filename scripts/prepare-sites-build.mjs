import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const assetMap = {};

mkdirSync(join(dist, ".openai"), { recursive: true });
copyFileSync(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));

function contentType(pathname) {
  const types = {
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
  return types[extname(pathname).toLowerCase()] ?? "text/plain; charset=utf-8";
}

function addFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const local = relative(dist, absolute).split(sep).join("/");
    if (local.startsWith("server/") || local.startsWith(".openai/")) continue;

    if (statSync(absolute).isDirectory()) {
      addFiles(absolute);
      continue;
    }

    assetMap[`/${local}`] = {
      body: readFileSync(absolute, "utf8"),
      contentType: contentType(local)
    };
  }
}

addFiles(dist);
assetMap["/"] = assetMap["/index.html"];

mkdirSync(join(dist, "server"), { recursive: true });
writeFileSync(
  join(dist, "server", "index.js"),
  `const ASSETS = ${JSON.stringify(assetMap)};

async function serveAsset(env, request) {
  if (env?.ASSETS?.fetch) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
  }

  const url = new URL(request.url);
  const asset = ASSETS[url.pathname] ?? (!url.pathname.startsWith("/assets/") ? ASSETS["/index.html"] : null);

  if (!asset) {
    return new Response("Arquivo nao encontrado", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }

  return new Response(asset.body, {
    headers: {
      "content-type": asset.contentType,
      "cache-control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
    }
  });
}

export default {
  async fetch(request, env) {
    return serveAsset(env, request);
  }
};
`,
  "utf8"
);
