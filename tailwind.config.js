/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--theme-paper) / <alpha-value>)",
        navy: "rgb(var(--theme-navy) / <alpha-value>)",
        gold: "rgb(var(--theme-gold) / <alpha-value>)",
        ink: "rgb(var(--theme-ink) / <alpha-value>)",
        sage: "rgb(var(--theme-sage) / <alpha-value>)",
        crimson: "rgb(var(--theme-crimson) / <alpha-value>)",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"],
        script: ['"Dancing Script"', "cursive"],
        calligraphy: ['"Great Vibes"', "cursive"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
