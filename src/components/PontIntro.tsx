import { useCallback, useEffect, useRef, useState } from "react";
import { PontMark } from "./BrandLogo";
import { PONT_INTRO_STILL, PONT_INTRO_VIDEO, markPontIntroPlayed, shouldShowPontIntro } from "../lib/pontIntro";

/*
 * Abertura da PONT com o vídeo oficial da marca (9:16, 5s).
 *
 * Fica montada uma vez na raiz (main.tsx), por cima de tudo: vale para o site
 * e para todas as áreas do app sem repetir lógica. A aplicação é renderizada
 * normalmente por trás enquanto o vídeo toca, então quando a abertura some o
 * sistema já está pronto (sem tela preta entre os dois).
 *
 * Tela preta -> vídeo oficial -> símbolo completo + PONT -> fade -> sistema.
 * Se o vídeo não começar (rede lenta, autoplay bloqueado, erro), mostra o
 * frame final do próprio vídeo (ou o símbolo, se nem a imagem vier) e segue.
 * Com prefers-reduced-motion, mostra só o frame final por um instante.
 */

const LEAVE_MS = 450;
const LEAVE_REDUCED_MS = 200;
// Tempo máximo esperando o vídeo começar a tocar antes de ir para o fallback.
const START_TIMEOUT_MS = 3500;
// Trava de segurança: o vídeo tem 5s; se travar no meio, não prende a pessoa.
const MAX_PLAY_MS = 9000;
const STILL_HOLD_MS = 1100;
const STILL_HOLD_REDUCED_MS = 700;

type Mode = "video" | "still";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setHtmlClass(name: string, on: boolean) {
  document.documentElement.classList.toggle(name, on);
}

export function PontIntro() {
  const [visible] = useState(shouldShowPontIntro);
  const [reduced] = useState(prefersReducedMotion);
  const [mode, setMode] = useState<Mode>(reduced ? "still" : "video");
  const [stillFailed, setStillFailed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(!visible);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playingRef = useRef(false);

  const leave = useCallback(() => setLeaving(true), []);
  const toStill = useCallback(() => setMode((current) => (current === "still" ? current : "still")), []);

  // Marca a sessão logo no início: refresh e troca de rota não repetem.
  // Enquanto a abertura está na tela o fundo da página fica preto e a barra
  // do navegador (theme-color) acompanha.
  useEffect(() => {
    if (!visible) {
      setHtmlClass("pont-intro-pending", false);
      return;
    }
    markPontIntroPlayed();
    setHtmlClass("pont-intro-active", true);
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = themeMeta?.content;
    if (themeMeta) themeMeta.content = "#000000";
    return () => {
      setHtmlClass("pont-intro-active", false);
      setHtmlClass("pont-intro-pending", false);
      if (themeMeta && previousTheme) themeMeta.content = previousTheme;
    };
  }, [visible]);

  // Vídeo: muted + playsInline + play() explícito (autoplay em iOS/Android).
  // Se o navegador recusar ou demorar demais, cai no fallback.
  useEffect(() => {
    if (!visible || mode !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    const attempt = video.play();
    // AbortError = a reprodução foi interrompida por nós mesmos (ex.: o vídeo
    // saiu da tela); qualquer outro erro é autoplay bloqueado -> fallback.
    if (attempt) attempt.catch((error: unknown) => {
      if ((error as DOMException)?.name !== "AbortError") toStill();
    });

    const startTimer = window.setTimeout(() => {
      if (!playingRef.current) toStill();
    }, START_TIMEOUT_MS);
    const maxTimer = window.setTimeout(leave, MAX_PLAY_MS);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(maxTimer);
    };
  }, [visible, mode, toStill, leave]);

  // Fallback / movimento reduzido: segura o frame final e sai.
  useEffect(() => {
    if (!visible || mode !== "still" || leaving) return;
    const timer = window.setTimeout(leave, reduced ? STILL_HOLD_REDUCED_MS : STILL_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [visible, mode, leaving, reduced, leave]);

  // Saída: fade da abertura inteira revelando o app já pronto por trás.
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setDone(true), reduced ? LEAVE_REDUCED_MS : LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, reduced]);

  // Sem rolagem por trás enquanto a abertura está na tela. Bloqueia os gestos
  // em vez de usar overflow:hidden no <html>, que tiraria a barra de rolagem e
  // faria o layout do app "pular" quando a abertura sumisse. Esc/Enter/Espaço
  // pulam a abertura.
  useEffect(() => {
    if (done) return;
    const block = (event: Event) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (["Escape", "Enter", " ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        leave();
      }
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", onKey);
    };
  }, [done, leave]);

  if (done) return null;

  return (
    <div
      className={`pont-intro ${leaving ? "is-leaving" : ""} ${mode === "still" ? "is-still" : ""}`}
      aria-hidden="true"
      onClick={leave}
    >
      <div className="pont-intro-stage">
        <div className="pont-intro-glow" />
        <div className="pont-intro-frame">
          {mode === "video" ? (
            <video
              ref={videoRef}
              className="pont-intro-media"
              src={PONT_INTRO_VIDEO}
              muted
              autoPlay
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              tabIndex={-1}
              onPlaying={() => {
                playingRef.current = true;
              }}
              onEnded={leave}
              onError={toStill}
            />
          ) : stillFailed ? (
            <div className="pont-intro-mark">
              <PontMark className="h-full w-full" />
            </div>
          ) : (
            <img
              className="pont-intro-media pont-intro-still"
              src={PONT_INTRO_STILL}
              alt=""
              decoding="async"
              onError={() => setStillFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
