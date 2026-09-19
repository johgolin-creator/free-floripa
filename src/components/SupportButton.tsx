import { LifeBuoy } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";
import { supportEmailUrl, supportWhatsappUrl } from "../lib/support";

export function SupportButton({ compact = false }: { compact?: boolean }) {
  const { email } = useAuth();
  const { state } = useAppStore();

  const accountType = state.activeRole === "trabalhador" ? "trabalhador" : "empresa";
  const text = `Olá! Preciso de ajuda no PONT.\nConta: ${email || "(informe seu e-mail)"} (${accountType}).`;
  const whatsapp = supportWhatsappUrl(text);
  const href = whatsapp || supportEmailUrl("Ajuda no PONT", text);
  const external = Boolean(whatsapp);

  const linkProps = {
    href,
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})
  };

  if (compact) {
    return (
      <a
        {...linkProps}
        aria-label="Falar com o suporte"
        title="Falar com o suporte"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
      >
        <LifeBuoy size={18} />
      </a>
    );
  }

  return (
    <a
      {...linkProps}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-aqua-300/40 bg-aqua-300/10 px-2.5 text-xs font-black text-aqua-300 transition hover:bg-aqua-300/20"
    >
      <LifeBuoy size={16} /> Falar com o suporte
    </a>
  );
}
