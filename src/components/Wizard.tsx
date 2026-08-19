import type { ReactNode } from "react";
import { useState } from "react";

export function useWizardStep(totalSteps: number) {
  const [step, setStep] = useState(0);

  return {
    step,
    isFirst: step === 0,
    isLast: step === totalSteps - 1,
    goTo: (index: number) => setStep(Math.max(0, Math.min(totalSteps - 1, index))),
    goNext: () => setStep((current) => Math.min(totalSteps - 1, current + 1)),
    goBack: () => setStep((current) => Math.max(0, current - 1))
  };
}

export function WizardProgress({ completed, total, label }: { completed: number; total: number; label: string }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="wizard-progress-card">
      <div>
        <span className="section-eyebrow">Preenchimento</span>
        <strong>{label}</strong>
      </div>
      <div className="wizard-progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function WizardSteps({ steps, current, onSelect }: { steps: readonly string[]; current: number; onSelect: (index: number) => void }) {
  return (
    <div className="wizard-steps">
      {steps.map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => {
            if (index <= current) onSelect(index);
          }}
          className={`wizard-step ${index === current ? "is-active" : ""} ${index < current ? "is-done" : ""}`}
        >
          <span>{index + 1}</span>
          {item}
        </button>
      ))}
    </div>
  );
}

export function WizardPanel({
  eyebrow,
  title,
  hint,
  hidden,
  children
}: {
  eyebrow: string;
  title: string;
  hint?: ReactNode;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`wizard-panel ${hidden ? "hidden" : ""}`} aria-hidden={hidden}>
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        {hint && <p className="wizard-panel-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function WizardActions({
  isFirst,
  isLast,
  onBack,
  onNext,
  submitLabel = "Concluir",
  pendingLabel = "Enviando...",
  pending,
  backClassName = "company-action",
  nextClassName = "company-action company-action-primary"
}: {
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  submitLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  backClassName?: string;
  nextClassName?: string;
}) {
  return (
    <div className="wizard-actions">
      <button type="button" onClick={onBack} disabled={isFirst} className={backClassName}>
        Voltar
      </button>
      {isLast ? (
        <button key="submit" type="submit" disabled={pending} className={nextClassName}>
          {pending ? pendingLabel : submitLabel}
        </button>
      ) : (
        <button key="next" type="button" onClick={onNext} className={nextClassName}>
          Continuar
        </button>
      )}
    </div>
  );
}
