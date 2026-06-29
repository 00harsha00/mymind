"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, DollarSign, TrendingDown } from "lucide-react";
import { formatCost } from "@/lib/utils/formatCost";
import { useStore } from "@/lib/store";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function CostDashboard() {
  const { sessionCost, user, messages } = useStore();
  const [open, setOpen] = useState(false);
  const [monthlyCost, setMonthlyCost] = useState<number | null>(null);
  const [tokensSavedTotal, setTokensSavedTotal] = useState(0);

  // Fetch monthly cost once on mount (when user is known)
  useEffect(() => {
    if (!user) return;
    fetch(`${BACKEND}/cost/monthly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMonthlyCost(d.monthly_cost_usd);
          setTokensSavedTotal(d.tokens_saved_total);
        }
      })
      .catch(() => {});
  }, [user]); // only re-fetch if user identity changes, not on every message

  // Session stats
  const sessionMessages = messages.filter((m) => m.role === "assistant" && m.costUsd !== undefined);
  const sessionTokens = sessionMessages.reduce((s, m) => s + (m.tokensUsed ?? 0), 0);
  const sessionTokensSaved = sessionMessages.reduce((s, m) => s + (m.tokensSaved ?? 0), 0);

  const savingsPercent =
    sessionTokensSaved > 0 && sessionTokens > 0
      ? Math.round((sessionTokensSaved / (sessionTokens + sessionTokensSaved)) * 100)
      : 0;

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border)" }}
    >
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5"
      >
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} style={{ color: "var(--mm-accent)" }} />
          <span style={{ color: "var(--mm-text-muted)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Cost
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--mm-text-primary)", fontSize: "13px", fontWeight: 600 }}>
            {formatCost(sessionCost)}
          </span>
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={12} style={{ color: "var(--mm-text-muted)" }} />
          </motion.span>
        </div>
      </button>

      {/* Expandable breakdown */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", borderTop: "1px solid var(--mm-border)" }}
          >
            <div className="px-3 py-2.5 flex flex-col gap-2">
              {/* Session */}
              <Row
                icon={<Zap size={10} style={{ color: "#f59e0b" }} />}
                label="This session"
                value={formatCost(sessionCost)}
                sub={sessionTokens > 0 ? `${sessionTokens.toLocaleString()} tokens` : undefined}
              />

              {/* Monthly */}
              <Row
                icon={<TrendingDown size={10} style={{ color: "#3b82f6" }} />}
                label="This month"
                value={monthlyCost !== null ? formatCost(monthlyCost) : "—"}
                sub={monthlyCost !== null && monthlyCost > 0 ? "calendar month" : undefined}
              />

              {/* Tokens saved */}
              {(savingsPercent > 0 || tokensSavedTotal > 0) && (
                <div
                  className="flex items-center justify-between rounded-[6px] px-2 py-1.5"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <span style={{ color: "#f59e0b", fontSize: "11px" }}>Tokens saved</span>
                  <div className="flex flex-col items-end gap-0.5">
                    {savingsPercent > 0 && (
                      <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
                        {savingsPercent}% this session
                      </span>
                    )}
                    {tokensSavedTotal > 0 && (
                      <span style={{ color: "#f59e0b", fontSize: "10px", opacity: 0.7 }}>
                        {tokensSavedTotal.toLocaleString()} total
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Per-message breakdown */}
              {sessionMessages.length > 0 && (
                <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid var(--mm-border)" }}>
                  <p style={{ color: "var(--mm-text-muted)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    This session
                  </p>
                  {sessionMessages.slice(-5).map((m, i) => (
                    <div key={m.id ?? i} className="flex items-center justify-between">
                      <span style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}>
                        Message {i + 1}
                      </span>
                      <span style={{ color: "var(--mm-text-secondary)", fontSize: "11px" }}>
                        {formatCost(m.costUsd!)} · {(m.tokensUsed ?? 0).toLocaleString()}t
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span style={{ color: "var(--mm-text-secondary)", fontSize: "12px" }}>{label}</span>
      </div>
      <div className="flex flex-col items-end">
        <span style={{ color: "var(--mm-text-primary)", fontSize: "12px", fontWeight: 500 }}>{value}</span>
        {sub && <span style={{ color: "var(--mm-text-muted)", fontSize: "10px" }}>{sub}</span>}
      </div>
    </div>
  );
}
