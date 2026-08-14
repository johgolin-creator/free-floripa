import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
          if (id.includes("@supabase")) return "vendor-data";
          if (id.includes("lucide-react")) return "vendor-icons";
          return "vendor";
        }
      }
    }
  },
  preview: {
    allowedHosts: true,
  },
});
