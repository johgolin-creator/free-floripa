import { useState } from "react";
import { Modal } from "./Modal";

// Foto (avatar/logo) que abre em tamanho grande ao clicar. Usada nas telas
// da empresa para conferir o rosto do candidato de perto.
export function AvatarButton({
  src,
  name,
  className,
  ringClassName
}: {
  src: string;
  name: string;
  /** Classes da <img> (tamanho, formato). */
  className?: string;
  /** Classes extras no botão (ex.: ring). */
  ringClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => src && setOpen(true)}
        disabled={!src}
        aria-label={`Ver a foto de ${name} em tamanho maior`}
        className={`shrink-0 cursor-zoom-in overflow-hidden rounded-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 disabled:cursor-default ${ringClassName ?? ""}`}
      >
        <img src={src} alt="" className={className} />
      </button>
      {open && (
        <Modal title={`Foto de ${name}`} onClose={() => setOpen(false)}>
          <img
            src={src}
            alt={`Foto de ${name}`}
            className="mx-auto max-h-[70vh] w-full rounded-lg bg-slate-100 object-contain"
          />
        </Modal>
      )}
    </>
  );
}
