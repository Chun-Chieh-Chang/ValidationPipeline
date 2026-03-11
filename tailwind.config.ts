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
        background: "var(--bg-base)",
        foreground: "var(--text-primary)",
        "muted": "var(--text-secondary)",
        "surface": "var(--bg-surface)",
        "seafoam": "var(--accent-brand)", 
        "reef": "var(--bg-surface)",       
        "pelagic": "var(--text-primary)", 
        "abyss": "var(--text-primary)",     
        "foam": "#E8FBFF",       
        "keel": "var(--bg-base)",       
        // Semantic mappings
        "brand-primary": "var(--text-primary)",   
        "brand-secondary": "var(--accent-secondary)", 
        "brand-accent": "var(--accent-brand)",
        "brand-accent-fg": "var(--accent-brand-foreground)",
        "brand-peach": "#FFD6BC",     
        border: "var(--border-color)",            
        "royal-blue": "var(--accent-brand)",      
        "success": "var(--accent-success)",
        "danger": "var(--accent-warning)",
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
