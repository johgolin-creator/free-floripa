export function PontMark({ className }: { className?: string }) {
  // Anel dividido em dois arcos (topo e base) com um ponto em cada lateral.
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M10.41 17.66 A15 15 0 0 1 37.59 17.66" stroke="#C8FF38" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M10.41 30.34 A15 15 0 0 0 37.59 30.34" stroke="#C8FF38" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="9" cy="24" r="3.6" fill="#C8FF38" />
      <circle cx="39" cy="24" r="3.6" fill="#C8FF38" />
    </svg>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-dark shadow-sm ring-1 ring-white/10 ${compact ? "h-10 w-10" : "h-12 w-12"}`}>
        <PontMark className="h-full w-full p-1.5" />
      </div>
      <div className="hidden min-w-0 sm:block">
        <strong className={`block truncate text-white ${compact ? "text-base" : "text-lg"}`}>
          PONT
        </strong>
        <span className="block truncate text-xs font-semibold text-slate-300">
          Conecta. Oportunidades. Talentos.
        </span>
      </div>
    </div>
  );
}
