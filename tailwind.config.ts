import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ispc: {
          blue: "#0066CC",
          light: "#3399FF",
          dark: "#003D7A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
