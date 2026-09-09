// Copia o APK (pont.apk, na raiz do repo) para dentro de dist/ no build do
// SITE. Não roda no build mobile (cap:sync) de propósito: se o APK ficasse
// em dist/ durante o `cap sync`, o Capacitor empacotaria o APK dentro do
// próprio APK, e o arquivo dobrava de tamanho a cada build.

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "pont.apk");
const dest = join(root, "dist", "pont.apk");

if (existsSync(src)) {
  copyFileSync(src, dest);
  console.log("attach-apk: dist/pont.apk atualizado");
} else {
  console.warn("attach-apk: pont.apk não encontrado na raiz — o download do app ficará indisponível");
}
