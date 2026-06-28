"use client";
import { Sun, Moon } from "lucide-react";
import { useStore } from "@/lib/store";

export function ThemeToggle() {
  const { theme, setTheme } = useStore();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center gap-2 px-3 py-2 rounded-[8px] transition-colors w-full"
      style={{ color: "var(--mm-text-secondary)", fontSize: "13px" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mm-bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
