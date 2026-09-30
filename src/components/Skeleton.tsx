import type { ReactNode } from "react";

/**
 * Skeleton screens: blocos no formato do conteúdo que ainda vai chegar, no
 * lugar de textos de "Carregando...". O `.skeleton-screen` só aparece se a
 * espera passar de ~150ms, para carregamentos rápidos não piscarem.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

function SkeletonScreen({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={`skeleton-screen ${className}`}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Linhas de uma lista (tabelas do admin, extrato, contatos...). */
export function SkeletonRows({ rows = 3, label = "Carregando" }: { rows?: number; label?: string }) {
  return (
    <SkeletonScreen label={label} className="grid gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="grid flex-1 gap-2">
            <Skeleton className={`h-3 ${index % 2 ? "w-2/5" : "w-1/2"}`} />
            <Skeleton className={`h-2.5 ${index % 2 ? "w-3/5" : "w-1/3"}`} />
          </div>
        </div>
      ))}
    </SkeletonScreen>
  );
}

function SkeletonCard() {
  return (
    <div className="card grid gap-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 shrink-0" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="h-2.5 w-4/5" />
    </div>
  );
}

/** Conteúdo de uma tela do app (título, indicadores e cards). */
export function PageSkeleton({ label = "Carregando esta tela" }: { label?: string }) {
  return (
    <SkeletonScreen label={label} className="grid gap-5">
      <div className="grid gap-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="card grid gap-3 p-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-2.5 w-3/4" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </SkeletonScreen>
  );
}

/** Tela cheia: casca do app (menu lateral no desktop, cabeçalho no celular) + conteúdo. */
export function AppShellSkeleton({ label = "Carregando sua conta" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-ice md:grid md:grid-cols-[264px_1fr]">
      <aside className="hidden border-r border-white/10 p-4 md:flex md:h-screen md:flex-col md:gap-2">
        <Skeleton className="mb-4 h-10 w-32" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </aside>
      <main className="min-w-0">
        <div className="border-b border-white/10 px-4 py-4 md:px-8">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-8 md:py-7">
          <PageSkeleton label={label} />
        </div>
      </main>
    </div>
  );
}

/** Tela pública (home, login, convite) ainda baixando. */
export function PublicPageSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-ice px-4">
      <SkeletonScreen label="Carregando" className="grid w-full max-w-sm gap-4">
        <Skeleton className="mx-auto h-12 w-12 rounded-xl" />
        <Skeleton className="mx-auto h-4 w-40" />
        <div className="card grid gap-3 p-5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="mt-2 h-11 w-full" />
        </div>
      </SkeletonScreen>
    </div>
  );
}
