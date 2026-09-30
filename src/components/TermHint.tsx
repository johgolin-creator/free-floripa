import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { glossary, type GlossaryTermId } from "../data/glossary";
import { keepBubbleInViewport } from "../lib/keepBubbleInViewport";
import type { UserRole } from "../lib/types";

export function TermHint({ term, role, children }: { term: GlossaryTermId; role?: UserRole; children?: ReactNode }) {
  const entry = glossary[term];

  return (
    <details className="term-hint" onToggle={keepBubbleInViewport}>
      <summary className="term-hint-trigger">
        {children ?? entry.label}
        <HelpCircle size={13} />
      </summary>
      <div className="term-hint-bubble">{entry.body(role)}</div>
    </details>
  );
}
