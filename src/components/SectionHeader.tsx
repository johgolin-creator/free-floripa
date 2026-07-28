import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 inline-flex min-h-7 items-center rounded-full border border-aqua-200 bg-aqua-50 px-3 text-xs font-black uppercase text-aqua-700">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-black tracking-tight text-navy-950 md:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
