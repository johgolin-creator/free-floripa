import { useEffect, useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { compressImage } from "../lib/imageCompression";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB, uploadProfileImage, type ProfileImageKind } from "../lib/supabaseStorage";

interface ProfileImageUploaderProps {
  label: string;
  value: string;
  kind: ProfileImageKind;
  previewAlt: string;
  onChange: (url: string) => void;
  /** When true, the file is kept locally (preview only) instead of uploaded right away. Use this before the user has an account, e.g. during signup, since uploading requires an active session. Pass the file to onFileSelected so the caller can upload it once the account exists. */
  deferUpload?: boolean;
  onFileSelected?: (file: File) => void;
}

export function ProfileImageUploader({ label, value, kind, previewAlt, onChange, deferUpload, onFileSelected }: ProfileImageUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [uploadError, setUploadError] = useState("");
  // Object URLs criados para preview local (fluxo deferUpload) precisam ser
  // revogados, senão cada troca de foto vaza um blob na memória.
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function setLocalPreview(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    onChange(url);
  }

  const helpText = deferUpload
    ? "JPG, PNG, WEBP ou GIF. É reduzida automaticamente e enviada ao criar a conta."
    : "JPG, PNG, WEBP ou GIF. É reduzida automaticamente antes do envio.";

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {value ? (
          <img src={value} alt={previewAlt} className="h-20 w-20 rounded-lg border border-white/10 object-cover shadow-sm" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
            <ImageUp size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <label className="label">
            {label}
            <input
              type="file"
              accept="image/*"
              className="input cursor-pointer"
              disabled={busy}
              onChange={async (event) => {
                const input = event.currentTarget;
                const original = input.files?.[0];
                if (!original) return;

                setUploadError("");
                setBusy(true);
                setBusyLabel("Preparando imagem...");

                try {
                  const file = await compressImage(original);

                  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    setUploadError("Use uma imagem JPG, PNG, WEBP ou GIF.");
                    return;
                  }
                  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                    setUploadError(`A imagem precisa ter até ${MAX_IMAGE_SIZE_MB} MB.`);
                    return;
                  }

                  if (deferUpload) {
                    onFileSelected?.(file);
                    setLocalPreview(file);
                    return;
                  }

                  setBusyLabel("Enviando imagem...");
                  const publicUrl = await uploadProfileImage(file, kind);
                  onChange(publicUrl);
                } catch (error) {
                  setUploadError(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
                } finally {
                  setBusy(false);
                  setBusyLabel("");
                  input.value = "";
                }
              }}
            />
          </label>
          <p className="mt-1 text-xs font-semibold text-slate-500">{busy ? busyLabel : helpText}</p>
        </div>
      </div>
      {uploadError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{uploadError}</div>}
    </div>
  );
}
