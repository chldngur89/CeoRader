import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#195de6",
        "navy-custom": "#0f172a",
        "slate-custom": "#334155",
        "background-light": "#f8fafc",
      },
    },
  },
  plugins: [],
};
export default config;
