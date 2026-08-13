/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Space Grotesk",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        brand: {
          green: "#C8FF38",
          dark: "#111318",
          charcoal: "#292D35",
          white: "#FFFFFF"
        },
        // "navy" is the app's dark-surface scale: hero/header backgrounds, dark
        // buttons and icon chips. 950 is pinned to brand.dark so every surface
        // that used to be "the one dark block on a light page" now matches the
        // app's base background.
        navy: {
          50: "#B9BEC9",
          100: "#9AA0AE",
          200: "#7C8494",
          700: "#1B1E24",
          800: "#161920",
          900: "#14161B",
          950: "#111318"
        },
        // "aqua" is the app's accent scale (was teal, now brand green). 500 is
        // the primary CTA fill, 300 is the icon accent on dark chips, and
        // 50/100/200 are the dark-tinted "highlighted panel" backgrounds.
        aqua: {
          50: "#1B2116",
          100: "#232B1B",
          200: "#2E3A20",
          300: "#C8FF38",
          500: "#C8FF38",
          700: "#A8E62E",
          800: "#8FCC26"
        },
        coral: "#FF6B57",
        amber: {
          50: "#2B2416",
          100: "#3A301C",
          200: "#4A3D22",
          700: "#F2C94C",
          800: "#E0B23D",
          900: "#C89A2E",
          DEFAULT: "#F4B740"
        },
        red: {
          50: "#2A1414",
          100: "#3A1A1A",
          200: "#4A2020"
        },
        emerald: {
          50: "#12251C",
          100: "#173322",
          700: "#4ADE80"
        },
        sky: {
          50: "#12212B",
          100: "#183042",
          700: "#7DD3FC"
        },
        // Tailwind's default gray scale is used throughout the app for body
        // text, muted labels, tile backgrounds and borders. Overriding it here
        // (instead of only in custom classes) makes every inline `text-slate-*`
        // / `bg-slate-*` / `border-slate-*` utility in the .tsx files pick up
        // the dark theme automatically.
        slate: {
          50: "#20232A",
          100: "#333844",
          200: "#3A3F4A",
          300: "#B8BEC9",
          400: "#7D8494",
          500: "#8A90A0",
          600: "#CBD0D9",
          700: "#D6DAE1",
          900: "#F5F6F8"
        },
        ice: "#111318",
        alert: "#FF5252"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0, 0, 0, 0.35)",
        lift: "0 24px 70px rgba(0, 0, 0, 0.45)",
        glow: "0 18px 45px rgba(200, 255, 56, 0.22)"
      }
    }
  },
  plugins: []
};
