import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bas: {
          bg: "#000000",
          gold: "#eab308",
          "gold-hover": "#ca8a04",
          card: "rgba(17, 24, 39, 0.5)", // gray-900/50
          border: "#1f2937", // gray-800
        },
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
