import type { Config } from "tailwindcss";

// Colours that change with the theme read from CSS variables defined in globals.css
// (dark is the default, :root[data-theme="light"] overrides). Existing classes such as
// bg-gray-900 or text-gray-50 therefore adapt automatically, with no per-screen rewrite.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        black: v("c-black"),
        "on-gold": "#000000", // text that sits on the gold brand colour: always black
        "gold-fg": v("gold-fg"), // gold used as TEXT: darker in light mode so it stays readable
        "gold-fg-hover": v("gold-fg-hover"),
        bas: {
          bg: "#000000",
          gold: "#eab308",
          "gold-hover": "#ca8a04",
          card: "rgba(17, 24, 39, 0.5)",
          border: "#1f2937",
        },
        gray: {
          50: v("gray-50"),
          100: v("gray-100"),
          200: v("gray-200"),
          300: v("gray-300"),
          400: v("gray-400"),
          500: v("gray-500"),
          600: v("gray-600"),
          700: v("gray-700"),
          800: v("gray-800"),
          900: v("gray-900"),
          950: v("gray-950"),
        },
        red: { 100: v("red-100"), 200: v("red-200"), 300: v("red-300"), 400: v("red-400"), 900: v("red-900"), 950: v("red-950") },
        amber: { 200: v("amber-200"), 300: v("amber-300"), 950: v("amber-950") },
        emerald: { 400: v("emerald-400"), 950: v("emerald-950") },
        green: { 400: v("green-400") },
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
