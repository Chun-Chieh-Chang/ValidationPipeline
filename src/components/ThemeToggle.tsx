"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-full bg-surface border border-border text-primary hover:bg-background transition-colors shadow-sm relative group"
      aria-label="切換主題 (Toggle Theme)"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun className={`absolute w-full h-full transition-all duration-300 ${theme === 'dark' ? 'scale-0 opacity-0 -rotate-90' : 'scale-100 opacity-100 rotate-0 text-amber-500'}`} />
        <Moon className={`absolute w-full h-full transition-all duration-300 ${theme === 'light' ? 'scale-0 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0 text-brand-accent'}`} />
      </div>
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-surface border border-border px-2 py-1 rounded text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {theme === 'light' ? '深色模式' : '淺色模式'}
      </span>
    </button>
  );
}
