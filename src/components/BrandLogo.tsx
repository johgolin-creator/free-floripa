import logoUrl from "../assets/free-floripa-logo.jpg?inline";

export function BrandLogo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white ${compact ? "h-10 w-20" : "h-12 w-24"}`}>
        <img src={logoUrl} alt="Free Floripa" className="h-full w-full scale-125 object-contain" />
      </div>
      <div className="hidden min-w-0 sm:block">
        <strong className={`block truncate ${compact ? "text-base" : "text-lg"} ${inverted ? "text-white" : "text-navy-950"}`}>
          Free Floripa
        </strong>
        <span className={`block truncate text-xs font-semibold ${inverted ? "text-slate-300" : "text-slate-500"}`}>
          A equipe que você precisa
        </span>
      </div>
    </div>
  );
}
