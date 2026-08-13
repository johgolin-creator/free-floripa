export function PontMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M31.5 37 A15 15 0 1 1 16.5 37" stroke="#C8FF38" strokeWidth="5" strokeLinecap="round" />
      <circle cx="16.5" cy="37" r="4" fill="#C8FF38" />
      <circle cx="31.5" cy="37" r="4" fill="#C8FF38" />
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
