"use client";
import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/lib/hooks/useAuth";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { ArrowLeft, Trash2, Brain, DollarSign, BarChart2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast, Toaster } from "sonner";

function SettingsApp() {
  const { user, signOut } = useAuth();
  const { model, setModel } = useStore();
  const router = useRouter();
  const [memories, setMemories] = useState<{ id: string; key: string; value: string }[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Personalization state
  const [yourName, setYourName] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [responseStyle, setResponseStyle] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [savingPersonalization, setSavingPersonalization] = useState(false);

  // Budget state
  const [budgetLimit, setBudgetLimit] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Usage stats
  const [usageStats, setUsageStats] = useState<{ totalMessages: number; totalCost: number; thisMonthCost: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingMemories(true);
    const sb = createClient();
    sb.from("memory").select("id, key, value").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setMemories(data ?? []); setLoadingMemories(false); });

    // Load personalization + model from Supabase users.settings
    sb.from("users").select("settings").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.settings?.personalization) {
          const p = data.settings.personalization;
          setYourName(p.name ?? "");
          setAboutYou(p.about ?? "");
          setCustomInstructions(p.instructions ?? "");
          setResponseStyle(p.responseStyle ?? "balanced");
        }
        if (data?.settings?.budgetLimitUsd != null) {
          setBudgetLimit(String(data.settings.budgetLimitUsd));
        }
        if (data?.settings?.model) {
          setModel(data.settings.model);
        }
      });

    // Load usage stats
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    Promise.all([
      sb.from("messages").select("cost_usd").eq("role", "assistant"),
      sb.from("messages").select("cost_usd").eq("role", "assistant").gte("created_at", start.toISOString()),
      sb.from("messages").select("id", { count: "exact", head: true }),
    ]).then(([all, month, count]) => {
      const totalCost = (all.data ?? []).reduce((s: number, m: { cost_usd?: number }) => s + (m.cost_usd ?? 0), 0);
      const thisMonthCost = (month.data ?? []).reduce((s: number, m: { cost_usd?: number }) => s + (m.cost_usd ?? 0), 0);
      setUsageStats({ totalMessages: count.count ?? 0, totalCost, thisMonthCost });
    });
  }, [user, setModel]);

  const deleteMemory = async (id: string) => {
    const sb = createClient();
    await sb.from("memory").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    toast.success("Memory deleted");
  };

  const clearAllMemory = async () => {
    if (!user) return;
    const sb = createClient();
    await sb.from("memory").delete().eq("user_id", user.id);
    setMemories([]);
    toast.success("All memories cleared");
  };

  const savePersonalization = async () => {
    if (!user) return;
    setSavingPersonalization(true);
    const sb = createClient();
    const { data } = await sb.from("users").select("settings").eq("id", user.id).single();
    const existing = data?.settings ?? {};
    await sb.from("users").upsert({
      id: user.id,
      settings: {
        ...existing,
        personalization: {
          name: yourName,
          about: aboutYou,
          instructions: customInstructions,
          responseStyle,
        },
      },
    });
    setSavingPersonalization(false);
    toast.success("Personalization saved");
  };

  const saveBudget = async () => {
    if (!user) return;
    const parsed = parseFloat(budgetLimit);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid dollar amount"); return; }
    setSavingBudget(true);
    const sb = createClient();
    const { data } = await sb.from("users").select("settings").eq("id", user.id).single();
    const existing = data?.settings ?? {};
    await sb.from("users").upsert({ id: user.id, settings: { ...existing, budgetLimitUsd: parsed } });
    setSavingBudget(false);
    toast.success(`Budget limit set to $${parsed.toFixed(2)}/month`);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mb-6">
      <h2 style={{ fontSize: "13px", color: "var(--mm-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
        {title}
      </h2>
      <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border)" }}>
        {children}
      </div>
    </section>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--mm-bg-elevated)",
    border: "1px solid var(--mm-border-strong)",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    color: "var(--mm-text-primary)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--mm-text-secondary)",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--mm-bg-base)" }}>
      <Toaster position="top-right" theme="dark" toastOptions={{ style: { background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-primary)" } }} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-8 transition-colors"
          style={{ color: "var(--mm-text-secondary)", fontSize: "14px" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--mm-text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--mm-text-secondary)")}
        >
          <ArrowLeft size={16} />
          Back to chat
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--mm-text-primary)", marginBottom: "32px" }}>
          Settings
        </h1>

        {/* Profile */}
        <Section title="Profile">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: "var(--mm-accent)", fontSize: "16px" }}
              >
                {user?.email?.slice(0, 2).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "var(--mm-text-primary)", fontWeight: 500 }} className="truncate">{user?.email}</p>
                <p style={{ color: "var(--mm-text-muted)", fontSize: "12px" }}>MyMind account</p>
              </div>
              <button
                onClick={() => { signOut(); router.push("/auth/login"); }}
                className="text-xs px-3 py-1.5 rounded-[6px] transition-colors"
                style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
              >
                Sign out
              </button>
            </div>
          </div>
        </Section>

        {/* Personalization */}
        <section className="mb-6">
          <h2 style={{ fontSize: "13px", color: "var(--mm-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Personalization
          </h2>
          <div className="rounded-[12px] p-4 flex flex-col gap-4" style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border)" }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input
                value={yourName}
                onChange={(e) => setYourName(e.target.value)}
                placeholder="e.g. Alex"
                style={inputStyle}
              />
              <p style={{ fontSize: "11px", color: "var(--mm-text-muted)", marginTop: "4px" }}>
                Claude will address you by this name.
              </p>
            </div>

            <div>
              <label style={labelStyle}>About You <span style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}>({aboutYou.length}/500)</span></label>
              <textarea
                value={aboutYou}
                onChange={(e) => setAboutYou(e.target.value.slice(0, 500))}
                placeholder="e.g. I'm a software engineer working on SaaS products. I prefer direct, technical answers."
                rows={3}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Custom Instructions <span style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}>({customInstructions.length}/1500)</span></label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value.slice(0, 1500))}
                placeholder="e.g. Always include code examples. Don't use bullet points unless asked. Prefer Python."
                rows={4}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Response Style</label>
              <div className="flex gap-2">
                {(["concise", "balanced", "detailed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setResponseStyle(s)}
                    className="flex-1 py-1.5 rounded-[8px] text-xs font-medium capitalize transition-all"
                    style={{
                      background: responseStyle === s ? "var(--mm-accent)" : "var(--mm-bg-elevated)",
                      color: responseStyle === s ? "#fff" : "var(--mm-text-secondary)",
                      border: `1px solid ${responseStyle === s ? "var(--mm-accent)" : "var(--mm-border-strong)"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: "11px", color: "var(--mm-text-muted)", marginTop: "4px" }}>
                Concise: short answers · Balanced: default · Detailed: thorough explanations
              </p>
            </div>

            <button
              onClick={savePersonalization}
              disabled={savingPersonalization}
              className="w-full py-2 rounded-[8px] text-sm font-medium transition-colors"
              style={{ background: "var(--mm-accent)", color: "#fff", opacity: savingPersonalization ? 0.6 : 1 }}
            >
              {savingPersonalization ? "Saving…" : "Save Personalization"}
            </button>
          </div>
        </section>

        {/* Budget */}
        <section className="mb-6">
          <h2 style={{ fontSize: "13px", color: "var(--mm-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Budget Alert
          </h2>
          <div className="rounded-[12px] p-4" style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} style={{ color: "var(--mm-warning)" }} />
              <p style={{ fontSize: "13px", color: "var(--mm-text-secondary)" }}>
                You&apos;ll be warned when monthly spending reaches 80% of this limit.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>$</span>
                <input
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="5.00"
                  type="number"
                  min="0"
                  step="0.50"
                  style={{ ...inputStyle, paddingLeft: "24px" }}
                />
              </div>
              <button
                onClick={saveBudget}
                disabled={savingBudget}
                className="px-4 py-2 rounded-[8px] text-sm font-medium transition-colors flex-shrink-0"
                style={{ background: "var(--mm-accent)", color: "#fff", opacity: savingBudget ? 0.6 : 1 }}
              >
                {savingBudget ? "Saving…" : "Set"}
              </button>
            </div>
          </div>
        </section>

        {/* AI Model */}
        <Section title="AI Model">
          {[
            { id: "claude-sonnet-4-6", label: "Claude Sonnet", desc: "Best quality · $3/$15 per 1M tokens" },
            { id: "claude-haiku-4-5-20251001", label: "Claude Haiku", desc: "Fastest & cheapest · $0.25/$1.25 per 1M tokens" },
          ].map((m, i) => (
            <button
              key={m.id}
              onClick={async () => {
                setModel(m.id);
                if (user) {
                  const sb = createClient();
                  const { data } = await sb.from("users").select("settings").eq("id", user.id).single();
                  await sb.from("users").upsert({ id: user.id, settings: { ...(data?.settings ?? {}), model: m.id } });
                  toast.success(`Switched to ${m.label}`);
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{
                borderTop: i > 0 ? "1px solid var(--mm-border)" : "none",
                background: model === m.id ? "var(--mm-accent-subtle)" : "transparent",
              }}
              onMouseEnter={(e) => { if (model !== m.id) e.currentTarget.style.background = "var(--mm-bg-hover)"; }}
              onMouseLeave={(e) => { if (model !== m.id) e.currentTarget.style.background = "transparent"; }}
            >
              <div>
                <p style={{ color: "var(--mm-text-primary)", fontSize: "14px", fontWeight: model === m.id ? 500 : 400 }}>{m.label}</p>
                <p style={{ color: "var(--mm-text-muted)", fontSize: "12px" }}>{m.desc}</p>
              </div>
              {model === m.id && (
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--mm-accent)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="px-2 py-1">
            <ThemeToggle />
          </div>
        </Section>

        {/* Memory */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: "13px", color: "var(--mm-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Memory ({memories.length})
            </h2>
            {memories.length > 0 && (
              <button
                onClick={clearAllMemory}
                className="text-xs px-2.5 py-1 rounded-[6px]"
                style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--mm-bg-surface)", border: "1px solid var(--mm-border)" }}>
            {loadingMemories ? (
              <p className="px-4 py-4 text-center" style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>Loading…</p>
            ) : memories.length === 0 ? (
              <div className="px-4 py-6 flex flex-col items-center gap-2">
                <Brain size={20} style={{ color: "var(--mm-text-muted)" }} />
                <p style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>No memories yet</p>
                <p style={{ color: "var(--mm-text-muted)", fontSize: "12px", textAlign: "center" }}>
                  Enable the Memory toggle in the sidebar to start saving context across sessions.
                </p>
              </div>
            ) : (
              memories.map((mem, i) => (
                <div
                  key={mem.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--mm-border)" : "none" }}
                >
                  <p style={{ color: "var(--mm-text-secondary)", fontSize: "13px", flex: 1 }}>{mem.value}</p>
                  <button
                    onClick={() => deleteMemory(mem.id)}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: "var(--mm-text-muted)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mm-text-muted)"; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Usage & Stats */}
        <Section title="Usage & Stats">
          {usageStats === null ? (
            <div className="px-4 py-4 text-center" style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>Loading…</div>
          ) : (
            <>
              {[
                { label: "Total messages", value: String(usageStats.totalMessages), icon: BarChart2 },
                { label: "Total spend (all time)", value: `$${usageStats.totalCost.toFixed(4)}`, icon: DollarSign },
                { label: "Spend this month", value: `$${usageStats.thisMonthCost.toFixed(4)}`, icon: DollarSign },
              ].map(({ label, value, icon: Icon }, i) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--mm-border)" : "none" }}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} style={{ color: "var(--mm-accent)" }} />
                    <span style={{ color: "var(--mm-text-secondary)", fontSize: "13px" }}>{label}</span>
                  </div>
                  <span style={{ color: "var(--mm-text-primary)", fontSize: "13px", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </>
          )}
        </Section>

        {/* Keyboard shortcuts */}
        <Section title="Keyboard Shortcuts">
          {[
            ["Cmd/Ctrl + K", "Open command palette"],
            ["Enter", "Send message"],
            ["Shift + Enter", "New line"],
            ["Ctrl + V", "Paste image"],
            ["/", "Open slash commands"],
          ].map(([key, desc], i) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderTop: i > 0 ? "1px solid var(--mm-border)" : "none" }}
            >
              <span style={{ color: "var(--mm-text-secondary)", fontSize: "13px" }}>{desc}</span>
              <kbd
                className="px-2 py-0.5 rounded-[5px] text-xs font-mono"
                style={{ background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-muted)" }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsApp />
    </AuthGuard>
  );
}
