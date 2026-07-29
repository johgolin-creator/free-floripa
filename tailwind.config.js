/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef7fb",
          100: "#d8edf6",
          700: "#174363",
          800: "#0f334d",
          900: "#08263d",
          950: "#061827"
        },
        aqua: {
          50: "#ecfffb",
          100: "#d8fff4",
          200: "#aefbea",
          300: "#73ead2",
          500: "#16c7a7",
          700: "#0d866f"
        },
        coral: "#ff6b57",
        amber: {
          50: "#fff8e7",
          100: "#ffefc1",
          200: "#ffdf88",
          DEFAULT: "#f4b740"
        },
        ice: "#f6fafb",
        alert: "#d83b3b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(8, 38, 61, 0.11)",
        lift: "0 24px 70px rgba(8, 38, 61, 0.16)",
        glow: "0 18px 45px rgba(22, 199, 167, 0.22)"
      }
    }
  },
  plugins: []
};
