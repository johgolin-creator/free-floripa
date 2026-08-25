import type { ReactNode } from "react";

export function StatTile({
  icon,
  label,
  value,
  variant = "secondary",
  tone = "normal",
  onClick
}: {
  icon: ReactNode;
  label: ReactNode;
  value: string | number;
  variant?: "primary" | "secondary";
  tone?: "normal" | "alert" | "positive";
  onClick?: () => void;
}) {
  const className = `metric-card ${variant === "secondary" ? "is-secondary" : ""} ${tone !== "normal" ? `is-${tone}` : ""} ${onClick ? "is-clickable" : ""}`;
  const content = (
    <>
      <div className="mb-3 text-aqua-700">{icon}</div>
      <strong className={variant === "primary" ? "block text-2xl font-black text-white" : "block text-lg font-black text-slate-200"}>
        {value}
      </strong>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}
