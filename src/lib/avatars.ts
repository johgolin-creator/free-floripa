// Foto de perfil padrão do trabalhador. Antes era uma foto de banco de imagens
// (uma pessoa sorrindo), o que dava a impressão de que todo mundo tinha foto.
// Agora é um marcador neutro em public/avatar-placeholder.svg.
export const DEFAULT_AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

// URLs que já foram usadas como "sem foto" e ficaram gravadas no perfil de
// quem se cadastrou antes da troca. São tratadas como vazio para o marcador
// neutro aparecer no lugar, sem precisar limpar o banco.
const LEGACY_DEFAULT_AVATARS = new Set([
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80"
]);

/** Devolve a URL da foto do trabalhador, trocando "sem foto" (vazio ou padrão
 *  antigo) pelo marcador neutro. */
export function resolveAvatarUrl(url: string | null | undefined): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed || LEGACY_DEFAULT_AVATARS.has(trimmed)) return DEFAULT_AVATAR_PLACEHOLDER;
  return trimmed;
}
