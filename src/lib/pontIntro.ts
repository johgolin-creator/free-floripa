/**
 * Abertura da PONT (vídeo oficial da marca) — configuração e controle de sessão.
 * O componente que desenha a abertura é src/components/PontIntro.tsx.
 *
 * SHOW_PONT_INTRO = false desliga a abertura em todo o site e em todos os web
 * apps (a aplicação entra direto). Também dá para desligar só num ambiente com
 * a variável VITE_SHOW_PONT_INTRO=false, sem mexer no código.
 */
export const SHOW_PONT_INTRO: boolean = true;

export const PONT_INTRO_VIDEO = "/intro/pont-intro.mp4";
/** Frame final do próprio vídeo oficial (símbolo + PONT), usado no fallback e no modo de movimento reduzido. */
export const PONT_INTRO_STILL = "/intro/pont-intro-final.jpg";

// sessionStorage: sobrevive a refresh e troca de rota na mesma aba, e some
// quando a sessão acaba (aba/navegador fechado). Mesma chave usada no script
// inline do index.html, que pinta o fundo de preto antes do React carregar.
const SESSION_KEY = "pont:intro-played";

export function isPontIntroEnabled() {
  return SHOW_PONT_INTRO && import.meta.env.VITE_SHOW_PONT_INTRO !== "false";
}

export function hasPlayedPontIntro() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // Sem sessionStorage (modo privado restrito, WebView bloqueada): não dá
    // para lembrar que já tocou, então não toca, para não repetir a cada tela.
    return true;
  }
}

export function markPontIntroPlayed() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignora: ver hasPlayedPontIntro
  }
}

export function shouldShowPontIntro() {
  return isPontIntroEnabled() && !hasPlayedPontIntro();
}
