import type { ReactNode } from "react";

// Bloco de número compacto: ícone à esquerda, valor e rótulo ao lado.
// "primary" só destaca a borda; o valor é sempre legível.
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
      <span className="metric-card-icon">{icon}</span>
      <span className="metric-card-text">
        <strong className="metric-card-value">{value}</strong>
        <span className="metric-card-label">{label}</span>
      </span>
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
