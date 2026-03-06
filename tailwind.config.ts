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
        background: "#F8F7FF", // Lilac White
        surface: "#FFFFFF",    // Pure White for Cards
        foreground: "#1E1E2E", // Deep Charcoal for crystal clear text
        "brand-primary": "#8875F5",   // Radiant Purple
        "brand-secondary": "#B1B0FE", // Soft Lavender
        "brand-accent": "#FEE9D6",    // Warm Beige
        "brand-peach": "#FFD6BC",     // Soft Peach
        border: "#D1D1F5",            // Muted Lavender Border
        "royal-blue": "#8875F5",      // Alias for compatibility
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
