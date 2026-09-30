import type { SyntheticEvent } from "react";

// Distância mínima entre o balão e a borda da tela.
const EDGE_GAP = 8;

/**
 * onToggle de um <details className="term-hint">: o balão abre alinhado à
 * esquerda do gatilho. Perto da borda direita (comum no celular) ele passava
 * da tela, cortava o texto e criava rolagem lateral. Ao abrir, desloca o
 * balão para a esquerda só o necessário para caber.
 */
export function keepBubbleInViewport(event: SyntheticEvent<HTMLDetailsElement>) {
  const bubble = event.currentTarget.querySelector<HTMLElement>(":scope > .term-hint-bubble");
  if (!bubble) return;
  bubble.style.left = "";
  if (!event.currentTarget.open) return;

  // Mede pela caixa de layout (offsetLeft/offsetWidth), não pelo
  // getBoundingClientRect: o balão ainda está na animação de entrada (scale
  // 0.96) e pareceria menor do que é.
  const anchor = event.currentTarget.getBoundingClientRect();
  const left = anchor.left + bubble.offsetLeft;
  const overflowRight = left + bubble.offsetWidth - (document.documentElement.clientWidth - EDGE_GAP);
  if (overflowRight > 0) {
    const shift = Math.min(overflowRight, left - EDGE_GAP);
    bubble.style.left = `${-shift}px`;
  }
}
