import { build } from "vite";
import react from "@vitejs/plugin-react";

const iconNames = [
  "AlertCircle",
  "AlertTriangle",
  "ArrowLeft",
  "ArrowRight",
  "Award",
  "BadgeCheck",
  "Bell",
  "BriefcaseBusiness",
  "Building2",
  "CalendarCheck",
  "CalendarDays",
  "CheckCircle2",
  "ClipboardCheck",
  "ClipboardList",
  "Clock",
  "Clock3",
  "Cloud",
  "Copy",
  "CreditCard",
  "Edit3",
  "Filter",
  "Heart",
  "Home",
  "ImageUp",
  "Lock",
  "LogIn",
  "LogOut",
  "Mail",
  "MapPin",
  "MessageCircle",
  "MessageSquareText",
  "Phone",
  "Plus",
  "RotateCcw",
  "Save",
  "Search",
  "ShieldCheck",
  "Shirt",
  "Smartphone",
  "Square",
  "Star",
  "Trash2",
  "UserCheck",
  "UserRound",
  "Users",
  "UsersRound",
  "UserX",
  "WalletCards",
  "Waves",
  "X",
  "XCircle",
  "Zap"
];

const iconShim = {
  name: "codex-icon-shim",
  enforce: "pre",
  resolveId(id) {
    return id === "lucide-react" ? "\0lucide-react" : null;
  },
  load(id) {
    if (id !== "\0lucide-react") return null;
    const exports = iconNames.map((name) => `export const ${name}=Icon;`).join("\n");
    return `
      import React from "react";
      const Icon = React.forwardRef(function Icon(props, ref) {
        const { size = 20, style, ...rest } = props;
        return React.createElement("span", {
          ref,
          ...rest,
          style: {
            display: "inline-block",
            width: size,
            height: size,
            border: "2px solid currentColor",
            borderRadius: "4px",
            ...style
          }
        });
      });
      ${exports}
    `;
  }
};

const emptyCss = {
  name: "codex-empty-css",
  enforce: "pre",
  transform(_code, id) {
    return id.replaceAll("\\", "/").endsWith("/src/index.css") ? { code: "", map: null } : null;
  }
};

await build({
  configFile: false,
  base: "./",
  plugins: [iconShim, emptyCss, react()],
  css: { postcss: { plugins: [] } },
  build: {
    outDir: "dist-codex",
    emptyOutDir: true
  }
});
