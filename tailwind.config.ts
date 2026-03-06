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
        background: "var(--background)",
        foreground: "var(--foreground)",
        "muted": "var(--text-muted)",
        "surface": "var(--surface)",
        "seafoam": "var(--seafoam)", // Mix of Teal (Pipeline) or Gray (GitHub)
        "reef": "var(--reef)",       
        "pelagic": "var(--pelagic)", 
        "abyss": "var(--abyss)",     
        "foam": "#E8FBFF",       
        "keel": "#0F1A1B",       
        // Semantic mappings
        "brand-primary": "var(--abyss)",   
        "brand-secondary": "var(--pelagic)", 
        "brand-accent": "var(--seafoam)",    
        "brand-peach": "#FFD6BC",     
        border: "var(--border)",            
        "royal-blue": "var(--abyss)",      
        "success": "var(--success)",
        "danger": "var(--danger)",
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
