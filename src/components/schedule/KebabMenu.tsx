import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, MoreVertical } from "lucide-react";

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Link externo (WhatsApp, telefone...). */
  href?: string;
  /** Rota interna do app. */
  to?: string;
  danger?: boolean;
  disabled?: boolean;
}

/** Menu de "três pontinhos": fecha ao clicar fora, ao apertar Esc ou depois de escolher. */
export function KebabMenu({
  actions,
  label = "Mais ações",
  vertical = false
}: {
  actions: MenuAction[];
  label?: string;
  vertical?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;
  const Icon = vertical ? MoreVertical : MoreHorizontal;
  const itemClass = (action: MenuAction) =>
    `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
      action.danger ? "text-alert hover:bg-alert/10" : "text-slate-600 hover:bg-white/10"
    } ${action.disabled ? "pointer-events-none opacity-40" : ""}`;

  return (
    <div ref={box} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <Icon size={17} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-white/10 bg-brand-charcoal p-1.5 shadow-lift">
          {actions.map((action) => {
            const content = (
              <>
                {action.icon}
                {action.label}
              </>
            );
            if (action.to) {
              return (
                <Link key={action.label} role="menuitem" to={action.to} className={itemClass(action)} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            }
            if (action.href) {
              return (
                <a
                  key={action.label}
                  role="menuitem"
                  href={action.href}
                  target={action.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className={itemClass(action)}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={itemClass(action)}
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
