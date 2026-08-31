// Reduz a imagem no navegador antes de enviar: redimensiona para caber em
// `maxDimension` e recomprime como JPEG. Uma foto de celular de 4-8 MB vira
// tipicamente 200-400 KB, então o upload é rápido e confiável no 4G e a
// imagem carrega mais rápido para quem vê. Fotos de iPhone (HEIC) são
// convertidas de quebra, quando o navegador consegue decodificá-las.
//
// Se algo falhar (formato que o navegador não decodifica, canvas indisponível),
// devolve o arquivo original — a validação de tipo/tamanho no upload cuida do
// resto.

interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;

  if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) return file;

    // Se o arquivo já era menor e não teve redimensionamento, mantém o original.
    if (scale === 1 && blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
