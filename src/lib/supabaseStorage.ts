import { supabase } from "./supabase";

export type ProfileImageKind = "trabalhadores" | "empresas";

const PROFILE_IMAGES_BUCKET = "avatars";
const MAX_IMAGE_SIZE_MB = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();
  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) return extensionFromName;
  return file.type.split("/").pop() || "jpg";
}

function getStorageErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("bucket") || normalized.includes("not found")) {
    return "O bucket avatars ainda nao foi criado no Supabase.";
  }
  if (normalized.includes("policy") || normalized.includes("row-level") || normalized.includes("permission")) {
    return "O Supabase bloqueou o envio. Confira as politicas do bucket avatars.";
  }

  return message || "Nao foi possivel enviar a imagem.";
}

export async function uploadProfileImage(file: File, kind: ProfileImageKind) {
  if (!supabase) {
    throw new Error("Configure o Supabase para enviar fotos pelo app.");
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`A imagem precisa ter ate ${MAX_IMAGE_SIZE_MB} MB.`);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) {
    throw new Error("Entre na sua conta antes de enviar uma foto.");
  }

  const extension = getExtension(file);
  const path = `${user.id}/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(PROFILE_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true
  });

  if (error) {
    throw new Error(getStorageErrorMessage(error.message));
  }

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
