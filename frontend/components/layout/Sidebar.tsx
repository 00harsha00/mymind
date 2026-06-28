"use client";
import { useEffect, useState } from "react";
import { Plus, Settings, LogOut, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { SidebarItem } from "./SidebarItem";
import { CostDashboard } from "@/components/ui/CostDashboard";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { FeatureToggles } from "@/components/chat/FeatureToggles";
import { createClient } from "@/lib/supabase";
import type { Chat } from "@/lib/store";
import { useRouter } from "next/navigation";

interface SidebarProps {
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

function groupChats(chats: Chat[]): Record<string, Chat[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 7 * 86400000);
  const groups: Record<string, Chat[]> = { Pinned: [], Today: [], Yesterday: [], "Last 7 days": [], Older: [] };
  for (const chat of chats) {
    if (chat.pinned) { groups["Pinned"].push(chat); continue; }
    const d = new Date(chat.updatedAt);
    if (d >= today) groups["Today"].push(chat);
    else if (d >= yesterday) groups["Yesterday"].push(chat);
    else if (d >= week) groups["Last 7 days"].push(chat);
    else groups["Older"].push(chat);
  }
  return groups;
}

export function Sidebar({ onNewChat, onSelectChat }: SidebarProps) {
  const { user, signOut } = useAuth();
  const { chats, setChats, currentChatId, setCurrentChat } = useStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("chats")
      .select("id, title, updated_at, total_cost_usd")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setChats(data.map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: new Date(c.updated_at),
            totalCostUsd: c.total_cost_usd || 0,
          })));
        }
      });
  }, [user, setChats]);

  const handleDeleteChat = async (chatId: string) => {
    const supabase = createClient();
    await supabase.from("chats").delete().eq("id", chatId);
    setChats(chats.filter((c) => c.id !== chatId));
    if (currentChatId === chatId) { setCurrentChat(null); onNewChat(); }
  };

  const handleRename = async (chatId: string, newTitle: string) => {
    const supabase = createClient();
    await supabase.from("chats").update({ title: newTitle }).eq("id", chatId);
    setChats(chats.map((c) => c.id === chatId ? { ...c, title: newTitle } : c));
  };

  const handlePin = (chatId: string) => {
    setChats(chats.map((c) => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
  };

  const visibleChats = search.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const groups = groupChats(visibleChats);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside
      className="w-[260px] flex-shrink-0 flex flex-col h-full"
      style={{ background: "var(--mm-bg-surface)", borderRight: "1px solid var(--mm-border)" }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--mm-border)" }}>
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: "var(--mm-accent)" }}>
          <span style={{ fontSize: "14px" }}>✦</span>
        </div>
        <span style={{ color: "var(--mm-text-primary)", fontSize: "15px", fontWeight: 600 }}>MyMind</span>
        <kbd
          className="ml-auto px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono"
          style={{ background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-muted)" }}
          title="Open command palette"
        >
          ⌘K
        </kbd>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[8px] font-medium transition-all"
          style={{ background: "var(--mm-accent)", color: "#fff", fontSize: "13px" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mm-accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--mm-accent)")}
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-[7px]"
          style={{ background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border)" }}
        >
          <Search size={12} style={{ color: "var(--mm-text-muted)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "12px", color: "var(--mm-text-primary)" }}
          />
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 px-2 overflow-y-auto" style={{ paddingBottom: "8px" }}>
        {Object.entries(groups).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label} className="mb-3">
              <p style={{
                color: "var(--mm-text-muted)", fontSize: "10px",
                textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "4px 12px 4px", fontWeight: 500,
              }}>
                {label}
              </p>
              {items.map((chat) => (
                <SidebarItem
                  key={chat.id}
                  chat={chat}
                  active={currentChatId === chat.id}
                  pinned={chat.pinned}
                  onClick={() => { setCurrentChat(chat.id); onSelectChat(chat.id); }}
                  onDelete={() => handleDeleteChat(chat.id)}
                  onRename={(title) => handleRename(chat.id, title)}
                  onPin={() => handlePin(chat.id)}
                />
              ))}
            </div>
          )
        )}
        {visibleChats.length === 0 && (
          <p style={{ color: "var(--mm-text-muted)", fontSize: "12px", padding: "8px 12px" }}>
            {search ? "No chats found." : "No chats yet. Start a conversation!"}
          </p>
        )}
      </div>

      {/* Bottom */}
      <div className="px-3 pb-3 pt-2 space-y-1" style={{ borderTop: "1px solid var(--mm-border)" }}>
        <FeatureToggles />
        <CostDashboard />
        <ThemeToggle />

        {/* User section */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] transition-colors"
            style={{ color: "var(--mm-text-secondary)", fontSize: "13px" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mm-bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium" style={{ background: "var(--mm-accent)", fontSize: "10px" }}>
              {initials}
            </div>
            <span className="flex-1 truncate text-left" style={{ fontSize: "12px" }}>
              {user?.email ?? "Guest"}
            </span>
            <ChevronDown size={12} style={{ flexShrink: 0 }} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-1 rounded-[10px] py-1 overflow-hidden"
                style={{
                  background: "var(--mm-bg-elevated)",
                  border: "1px solid var(--mm-border-strong)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                <button
                  onClick={() => { router.push("/settings"); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{ fontSize: "13px", color: "var(--mm-text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mm-bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Settings size={13} />
                  Settings
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                  style={{ fontSize: "13px", color: "var(--mm-danger)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--mm-bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
