import { Flame } from "lucide-react";

export function UrgentBadge() {
  return (
    <span className="badge urgent">
      <Flame size={14} fill="currentColor" /> URGENTE
    </span>
  );
}
