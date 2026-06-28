"use client";
import { Menu, Plus } from "lucide-react";
import { useStore } from "@/lib/store";

interface HeaderProps {
  onNewChat: () => void;
}

export function Header({ onNewChat }: HeaderProps) {
  const { toggleSidebar } = useStore();

  return (
    <div
      className="flex items-center justify-between px-4 py-3 md:hidden"
      style={{ borderBottom: "1px solid var(--mm-border)", background: "var(--mm-bg-surface)" }}
    >
      <button onClick={toggleSidebar} style={{ color: "var(--mm-text-secondary)" }}>
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-[6px] flex items-center justify-center"
          style={{ background: "var(--mm-accent)" }}
        >
          <span style={{ fontSize: "12px" }}>✦</span>
        </div>
        <span style={{ color: "var(--mm-text-primary)", fontSize: "15px", fontWeight: 600 }}>MyMind</span>
      </div>
      <button onClick={onNewChat} style={{ color: "var(--mm-accent)" }}>
        <Plus size={20} />
      </button>
    </div>
  );
}
