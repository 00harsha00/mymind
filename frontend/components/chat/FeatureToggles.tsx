"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Search, Quote, Brain, MessageSquarePlus, Cpu, Code2, Bot, ChevronDown, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { useStore, type Features } from "@/lib/store";
import { toast } from "sonner";

interface ToggleDef {
  key: keyof Features;
  label: string;
  description: string;
  impact: string;
  example: string;
  icon: React.ElementType;
  color: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "optimize_tokens",
    label: "Optimize Tokens",
    description: "Compresses your prompt using LLMLingua before sending. Reduces token usage by 40-60% while keeping the same meaning.",
    impact: "saves ~40–60%",
    example: "Best for: long documents, pasted articles",
    icon: Zap,
    color: "#f59e0b",
  },
  {
    key: "web_search",
    label: "Web Search",
    description: "Searches DuckDuckGo for current information before answering. Gives Claude up-to-date context.",
    impact: "~+300 tokens",
    example: "Best for: recent events, current data",
    icon: Search,
    color: "#3b82f6",
  },
  {
    key: "cite_sources",
    label: "Cite Sources",
    description: "Appends source references to Claude's answer. Best for research tasks where you need to verify information.",
    impact: "~+150 tokens",
    example: "Best for: research, fact-checking",
    icon: Quote,
    color: "#10b981",
  },
  {
    key: "memory",
    label: "Memory",
    description: "Saves key facts from your conversations and recalls them in future chats.",
    impact: "~+200 tokens",
    example: "Best for: ongoing projects, personal context",
    icon: Brain,
    color: "#8b5cf6",
  },
  {
    key: "follow_ups",
    label: "Follow-ups",
    description: "Shows 3 suggested next questions after each answer to help you explore topics more deeply.",
    impact: "~+100 tokens",
    example: "Best for: deep topic exploration",
    icon: MessageSquarePlus,
    color: "#06b6d4",
  },
  {
    key: "auto_detect_task",
    label: "Auto-detect",
    description: "Automatically detects if you're asking about code, documents, or general topics and adjusts Claude's response style.",
    impact: "~+50 tokens",
    example: "Best for: mixed conversations",
    icon: Cpu,
    color: "#ec4899",
  },
  {
    key: "code_reviewer",
    label: "Code Reviewer",
    description: "Switches to structured code review mode — analyzes bugs, suggests improvements, checks best practices.",
    impact: "~+200 tokens",
    example: "Best for: code review, debugging",
    icon: Code2,
    color: "#f97316",
  },
  {
    key: "agent_mode",
    label: "Agent Mode",
    description: "Enables multi-step reasoning. Claude breaks complex problems into steps and works through each one.",
    impact: "~+400 tokens",
    example: "Best for: complex research, planning",
    icon: Bot,
    color: "#7C3AED",
  },
];

const TOAST_STYLE = {
  style: {
    background: "var(--mm-bg-elevated)",
    border: "1px solid var(--mm-border-strong)",
    color: "var(--mm-text-primary)",
  },
};

function useSmartToggle() {
  const { features, toggleFeature } = useStore();
  return (key: keyof Features) => {
    // Enabling Cite Sources requires Web Search
    if (key === "cite_sources" && !features.cite_sources && !features.web_search) {
      toggleFeature("web_search");
      toast.info("Web Search enabled automatically — Cite Sources needs it to find references.", {
        duration: 4000,
        ...TOAST_STYLE,
      });
    }
    toggleFeature(key);
  };
}

export function FeatureToggles() {
  const { features } = useStore();
  const smartToggle = useSmartToggle();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const activeCount = Object.values(features).filter(Boolean).length;

  return (
    <>
      <div style={{ borderTop: "1px solid var(--mm-border)" }}>
        {/* Header */}
        <div className="flex items-center">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-1 flex items-center justify-between px-3 py-2.5"
            style={{ color: "var(--mm-text-secondary)" }}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Zap size={12} style={{ color: "var(--mm-accent)" }} />
              Features
              {activeCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: "var(--mm-accent)", color: "#fff" }}
                >
                  {activeCount}
                </span>
              )}
            </span>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={12} />
            </motion.span>
          </button>
          {/* Help button */}
          <button
            onClick={(e) => { e.stopPropagation(); setHelpOpen(true); }}
            className="px-2 py-2.5 transition-colors"
            style={{ color: "var(--mm-text-muted)" }}
            title="Feature guide"
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--mm-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mm-text-muted)"; }}
          >
            <HelpCircle size={13} />
          </button>
        </div>

        {/* Toggle list */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-2 pb-2 flex flex-col gap-0.5">
                {TOGGLES.map(({ key, label, description, impact, icon: Icon, color }) => {
                  const on = features[key];
                  return (
                    <div
                      key={key}
                      className="relative rounded-[8px] px-2 py-2"
                      style={{
                        background: on ? `${color}12` : "var(--mm-bg-elevated)",
                        border: `1px solid ${on ? color + "40" : "var(--mm-border)"}`,
                        minHeight: "52px",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Icon */}
                        <div
                          className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
                          style={{
                            background: on ? `${color}22` : "var(--mm-bg-hover)",
                            border: `1px solid ${on ? color + "55" : "var(--mm-border)"}`,
                          }}
                        >
                          <Icon size={12} style={{ color: on ? color : "var(--mm-text-muted)" }} />
                        </div>

                        {/* Name + impact stacked */}
                        <div className="flex-1 min-w-0">
                          <p style={{ color: on ? "var(--mm-text-primary)" : "var(--mm-text-secondary)", fontSize: "12px", fontWeight: on ? 500 : 400, lineHeight: 1.3 }}>
                            {label}
                          </p>
                          <p style={{ color: key === "optimize_tokens" ? "#f59e0b" : "var(--mm-text-muted)", fontSize: "10px", lineHeight: 1.2 }}>
                            {impact}
                          </p>
                        </div>

                        {/* ? tooltip trigger */}
                        <button
                          className="flex-shrink-0"
                          style={{ color: "var(--mm-text-muted)" }}
                          onMouseEnter={() => setTooltip(key)}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <HelpCircle size={11} />
                        </button>

                        {/* Toggle pill */}
                        <button
                          onClick={() => smartToggle(key)}
                          className="w-8 h-4 rounded-full flex-shrink-0 relative transition-colors"
                          style={{ background: on ? color : "var(--mm-border-strong)" }}
                        >
                          <motion.div
                            className="absolute top-0.5 w-3 h-3 rounded-full"
                            style={{ background: "#fff" }}
                            animate={{ left: on ? "calc(100% - 14px)" : "2px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        </button>
                      </div>

                      {/* Inline tooltip */}
                      <AnimatePresence>
                        {tooltip === key && (
                          <motion.div
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[8px] px-2.5 py-2"
                            style={{
                              background: "var(--mm-bg-elevated)",
                              border: "1px solid var(--mm-border-strong)",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                              fontSize: "11px",
                              color: "var(--mm-text-secondary)",
                              lineHeight: 1.5,
                            }}
                          >
                            {description}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feature Guide modal */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              style={{ backdropFilter: "blur(4px)" }}
              onClick={() => setHelpOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[16px]"
              style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border-strong)", boxShadow: "0 8px 48px rgba(0,0,0,0.4)" }}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--mm-border)" }}>
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: "var(--mm-accent)" }} />
                  <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--mm-text-primary)" }}>Feature Guide</h2>
                </div>
                <button onClick={() => setHelpOpen(false)} style={{ color: "var(--mm-text-muted)" }}>
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-3 flex flex-col gap-3">
                {TOGGLES.map(({ key, label, description, impact, example, icon: Icon, color }) => (
                  <div
                    key={key}
                    className="rounded-[10px] p-3"
                    style={{ background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border)" }}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--mm-text-primary)" }}>{label}</p>
                        <p style={{ fontSize: "11px", color, fontWeight: 500 }}>{impact}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--mm-text-secondary)", lineHeight: 1.6 }}>{description}</p>
                    <p style={{ fontSize: "11px", color: "var(--mm-text-muted)", marginTop: "4px" }}>{example}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
