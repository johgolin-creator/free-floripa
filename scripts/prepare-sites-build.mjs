import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

mkdirSync(join(dist, ".openai"), { recursive: true });
copyFileSync(join(root, ".openai", "hosting.json"), join(dist, ".openai", "hosting.json"));

let indexHtml = readFileSync(join(dist, "index.html"), "utf8");
const scriptMatch = indexHtml.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const styleMatch = indexHtml.match(/<link[^>]+href="([^"]+)"[^>]*>/);

if (scriptMatch) {
  const script = readFileSync(join(dist, scriptMatch[1].replace(/^\//, "")), "utf8");
  indexHtml = indexHtml.replace(scriptMatch[0], () => `<script type="module">${script}</script>`);
}

if (styleMatch) {
  const style = readFileSync(join(dist, styleMatch[1].replace(/^\//, "")), "utf8");
  indexHtml = indexHtml.replace(styleMatch[0], () => `<style>${style}</style>`);
}

mkdirSync(join(dist, "server"), { recursive: true });
writeFileSync(
  join(dist, "server", "index.js"),
  `const INDEX_HTML = ${JSON.stringify(indexHtml)};

export default {
  async fetch() {
    return new Response(INDEX_HTML, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
`,
  "utf8"
);
