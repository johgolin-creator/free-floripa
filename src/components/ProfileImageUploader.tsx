import { useState } from "react";
import { ImageUp } from "lucide-react";
import { uploadProfileImage, type ProfileImageKind } from "../lib/supabaseStorage";

interface ProfileImageUploaderProps {
  label: string;
  value: string;
  kind: ProfileImageKind;
  previewAlt: string;
  onChange: (url: string) => void;
}

export function ProfileImageUploader({ label, value, kind, previewAlt, onChange }: ProfileImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <img src={value} alt={previewAlt} className="h-20 w-20 rounded-lg border border-white object-cover shadow-sm" />
        <div className="min-w-0 flex-1">
          <label className="label">
            {label}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="input cursor-pointer bg-white"
              disabled={uploading}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;

                setUploading(true);
                setUploadError("");
                try {
                  const publicUrl = await uploadProfileImage(file, kind);
                  onChange(publicUrl);
                } catch (error) {
                  setUploadError(error instanceof Error ? error.message : "Nao foi possivel enviar a imagem.");
                } finally {
                  setUploading(false);
                  input.value = "";
                }
              }}
            />
          </label>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {uploading ? "Enviando imagem..." : "JPG, PNG, WEBP ou GIF ate 5 MB."}
          </p>
        </div>
      </div>
      {uploadError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{uploadError}</div>}
      <label className="label">
        Link da imagem
        <input
          className="input bg-white"
          value={value}
          placeholder="Cole um link ou envie uma imagem acima"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
