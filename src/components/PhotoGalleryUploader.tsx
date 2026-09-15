import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { compressImage } from "../lib/imageCompression";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB, uploadProfileImage, type ProfileImageKind } from "../lib/supabaseStorage";

const MAX_PHOTOS = 6;

interface PhotoGalleryUploaderProps {
  label: string;
  photos: string[];
  kind: ProfileImageKind;
  onChange: (photos: string[]) => void;
}

/** Galeria de fotos extras do perfil (além da foto principal). Cada envio
 *  soma à lista, até MAX_PHOTOS; cada uma pode ser removida individualmente. */
export function PhotoGalleryUploader({ label, photos, kind, onChange }: PhotoGalleryUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    if (files.length === 0) {
      setError(`Você pode ter até ${MAX_PHOTOS} fotos extras.`);
      return;
    }

    setError("");
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const original of files) {
        const file = await compressImage(original);
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setError("Use imagens JPG, PNG, WEBP ou GIF.");
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          setError(`Cada imagem precisa ter até ${MAX_IMAGE_SIZE_MB} MB.`);
          continue;
        }
        const url = await uploadProfileImage(file, kind);
        uploaded.push(url);
      }
      if (uploaded.length > 0) onChange([...photos, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar as fotos.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, item) => item !== index));
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
      <label className="label">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="input cursor-pointer"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onChange={(event) => handleFiles(event.currentTarget.files)}
        />
      </label>
      <p className="text-xs font-semibold text-slate-500">
        {busy
          ? "Enviando fotos..."
          : `Até ${MAX_PHOTOS} fotos extras (JPG, PNG, WEBP ou GIF). ${photos.length}/${MAX_PHOTOS} enviadas.`}
      </p>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {photos.map((url, index) => (
            <div key={url + index} className="group relative h-20 w-20 shrink-0">
              <img src={url} alt="" className="h-20 w-20 rounded-lg border border-white/10 object-cover shadow-sm" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remover foto"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-alert text-white shadow-sm"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length === 0 && !busy && (
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
          <ImageUp size={22} />
        </div>
      )}
    </div>
  );
}
