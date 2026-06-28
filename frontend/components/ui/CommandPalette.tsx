"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageSquarePlus, Settings, Sun, Moon, Download, Zap, Globe, Quote, Brain, MessageSquare, Cpu, Code2, Bot, X } from "lucide-react";
import { useStore, type Features } from "@/lib/store";
import { useRouter } from "next/navigation";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  onNewChat: () => void;
  onExport: () => void;
}

function fuzzy(query: string, target: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = (target).toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

const FEATURE_META: { key: keyof Features; label: string; icon: React.ElementType }[] = [
  { key: "optimize_tokens", label: "Optimize tokens", icon: Zap },
  { key: "web_search", label: "Web search", icon: Globe },
  { key: "cite_sources", label: "Cite sources", icon: Quote },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "follow_ups", label: "Follow-up suggestions", icon: MessageSquare },
  { key: "auto_detect_task", label: "Auto-detect task", icon: Cpu },
  { key: "code_reviewer", label: "Code reviewer", icon: Code2 },
  { key: "agent_mode", label: "Agent mode", icon: Bot },
];

export function CommandPalette({ onNewChat, onExport }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme, toggleFeature, features } = useStore();
  const router = useRouter();

  const close = useCallback(() => { setOpen(false); setQuery(""); setSelected(0); }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const commands: Command[] = [
    {
      id: "new-chat",
      label: "New chat",
      icon: MessageSquarePlus,
      action: () => { onNewChat(); close(); },
      keywords: "start fresh clear",
    },
    {
      id: "theme",
      label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      icon: theme === "dark" ? Sun : Moon,
      action: () => { setTheme(theme === "dark" ? "light" : "dark"); close(); },
      keywords: "appearance color dark light",
    },
    {
      id: "settings",
      label: "Open settings",
      icon: Settings,
      action: () => { router.push("/settings"); close(); },
      keywords: "preferences account",
    },
    {
      id: "export",
      label: "Export chat",
      icon: Download,
      action: () => { onExport(); close(); },
      keywords: "download save markdown pdf",
    },
    ...FEATURE_META.map(({ key, label, icon }) => ({
      id: `toggle-${key}`,
      label: `${features[key] ? "Disable" : "Enable"} ${label}`,
      description: features[key] ? "Currently ON" : "Currently OFF",
      icon,
      action: () => { toggleFeature(key); close(); },
      keywords: `toggle feature ${label.toLowerCase()}`,
    })),
  ];

  const filtered = commands.filter((c) =>
    fuzzy(query, c.label + " " + (c.keywords ?? ""))
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); filtered[selected]?.action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected]);

  useEffect(() => { setSelected(0); }, [query]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              style={{ backdropFilter: "blur(4px)" }}
              onClick={close}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[20vh] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-[16px] overflow-hidden shadow-2xl"
              style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border-strong)" }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--mm-border)" }}>
                <Search size={16} style={{ color: "var(--mm-text-muted)", flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands…"
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: "var(--mm-text-primary)", fontSize: "15px" }}
                />
                <button onClick={close} style={{ color: "var(--mm-text-muted)" }}>
                  <X size={14} />
                </button>
              </div>

              {/* Results */}
              <div className="py-2 max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center" style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>
                    No commands found
                  </p>
                ) : (
                  filtered.map((cmd, i) => {
                    const Icon = cmd.icon;
                    const isSelected = i === selected;
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelected(i)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ background: isSelected ? "var(--mm-bg-hover)" : "transparent" }}
                      >
                        <div
                          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected ? "var(--mm-accent-subtle)" : "var(--mm-bg-elevated)",
                            border: "1px solid var(--mm-border)",
                          }}
                        >
                          <Icon size={14} style={{ color: isSelected ? "var(--mm-accent)" : "var(--mm-text-muted)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "var(--mm-text-primary)", fontSize: "13px", fontWeight: 500 }}>{cmd.label}</p>
                          {cmd.description && (
                            <p style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}>{cmd.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div
                className="flex items-center gap-3 px-4 py-2"
                style={{ borderTop: "1px solid var(--mm-border)", color: "var(--mm-text-muted)", fontSize: "11px" }}
              >
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
