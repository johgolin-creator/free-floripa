import { useState } from "react";
import { ImageUp } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <img src={value} alt={previewAlt} className="h-20 w-20 rounded-lg border border-white/10 object-cover shadow-sm" />
        <div className="min-w-0 flex-1">
          <label className="label">
            {label}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="input cursor-pointer"
              disabled={uploading}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;

                setUploadError("");

                if (deferUpload) {
                  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    setUploadError("Use uma imagem JPG, PNG, WEBP ou GIF.");
                    input.value = "";
                    return;
                  }
                  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
                    setUploadError(`A imagem precisa ter até ${MAX_IMAGE_SIZE_MB} MB.`);
                    input.value = "";
                    return;
                  }
                  onFileSelected?.(file);
                  onChange(URL.createObjectURL(file));
                  return;
                }

                setUploading(true);
                try {
                  const publicUrl = await uploadProfileImage(file, kind);
                  onChange(publicUrl);
                } catch (error) {
                  setUploadError(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
                } finally {
                  setUploading(false);
                  input.value = "";
                }
              }}
            />
          </label>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {uploading ? "Enviando imagem..." : deferUpload ? "JPG, PNG, WEBP ou GIF até 5 MB. Enviada ao criar a conta." : "JPG, PNG, WEBP ou GIF até 5 MB."}
          </p>
        </div>
      </div>
      {uploadError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{uploadError}</div>}
    </div>
  );
}
