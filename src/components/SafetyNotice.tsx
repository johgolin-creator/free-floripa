import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function SafetyNotice({
  title,
  children,
  tone = "info"
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : ShieldCheck;
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-aqua-100 bg-aqua-50 text-navy-950";

  return (
    <div className={`grid gap-2 rounded-lg border p-3 text-sm shadow-sm sm:grid-cols-[auto_1fr] ${classes}`}>
      <Icon size={18} className={tone === "warning" ? "text-amber-700" : "text-aqua-700"} />
      <div>
        <strong className="block font-black">{title}</strong>
        <p className="mt-1 font-semibold leading-5 text-slate-600">{children}</p>
      </div>
    </div>
  );
}
