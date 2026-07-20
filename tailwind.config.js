/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef6fb",
          100: "#d9edf7",
          700: "#174569",
          800: "#103755",
          900: "#09263d",
          950: "#061b2d"
        },
        aqua: {
          100: "#d9fff6",
          300: "#75e7d3",
          500: "#23c4aa",
          700: "#128675"
        },
        alert: "#d83b3b"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(9, 38, 61, 0.12)"
      }
    }
  },
  plugins: []
};
