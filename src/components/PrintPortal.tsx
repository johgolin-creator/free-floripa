import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Folha para imprimir. Fica direto no <body>, fora do #root: ao imprimir, o
 *  CSS esconde o app inteiro (display: none, sem ocupar espaço) e só esta folha
 *  sai no papel, no topo da primeira página. Na tela ela fica fora de vista.
 *  Antes a folha ficava dentro da página e o app escondido (visibility: hidden)
 *  continuava ocupando espaço: a impressão saía com páginas vazias e a folha
 *  perdida no canto da última. */
export function PrintPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(<div className="print-only">{children}</div>, document.body);
}
