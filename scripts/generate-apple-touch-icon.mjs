// Gera os icones da marca PONT sem dependencias externas.
// Rasteriza a mesma geometria do favicon.svg e grava um PNG via zlib.
//   node scripts/generate-apple-touch-icon.mjs [tamanho] [arquivoSaida]
// Sem argumentos gera public/apple-touch-icon.png (180x180).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = Number(process.argv[2]) || 180;
const OUT = process.argv[3] || "apple-touch-icon.png";
const S = SIZE / 48; // o SVG usa viewBox 0 0 48 48
const BG = [0x11, 0x13, 0x18];
const FG = [0xc8, 0xff, 0x38];

const cx = 24, cy = 24, ringR = 15, stroke = 5.5;
const dotR = 3.6;
const dots = [[9, 24], [39, 24]];

function inRing(x, y) {
  const dx = x - cx, dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (Math.abs(d - ringR) > stroke / 2) return false;
  // arco de cima e arco de baixo, com folga nas laterais (como no favicon).
  const ang = Math.atan2(dy, dx); // -PI..PI (y para baixo)
  const top = ang < -0.30 && ang > -Math.PI + 0.30;
  const bottom = ang > 0.30 && ang < Math.PI - 0.30;
  return top || bottom;
}
function inDot(x, y) {
  return dots.some(([dx, dy]) => Math.hypot(x - dx, y - dy) <= dotR);
}

// monta as linhas RGB (filtro None por linha)
const raw = Buffer.alloc((SIZE * 3 + 1) * SIZE);
let p = 0;
for (let py = 0; py < SIZE; py++) {
  raw[p++] = 0;
  for (let px = 0; px < SIZE; px++) {
    // supersampling 3x3 para suavizar as bordas
    let hit = 0;
    for (let sy = 0; sy < 3; sy++) {
      for (let sx = 0; sx < 3; sx++) {
        const ux = (px + (sx + 0.5) / 3) / S;
        const uy = (py + (sy + 0.5) / 3) / S;
        if (inRing(ux, uy) || inDot(ux, uy)) hit++;
      }
    }
    const t = hit / 9;
    raw[p++] = Math.round(BG[0] + (FG[0] - BG[0]) * t);
    raw[p++] = Math.round(BG[1] + (FG[1] - BG[1]) * t);
    raw[p++] = Math.round(BG[2] + (FG[2] - BG[2]) * t);
  }
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type: truecolor RGB
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("../public/" + OUT, import.meta.url), png);
console.log("public/" + OUT + " gerado (" + SIZE + "px):", png.length, "bytes");
