"use client";

import { useUI } from "@/lib/store";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const theme = useUI((s) => s.theme);
  const toggle = useUI((s) => s.toggleTheme);
  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="btn-ghost p-2 rounded-full"
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
