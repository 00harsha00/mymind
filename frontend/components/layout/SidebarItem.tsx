"use client";
import { useState, useRef, useEffect } from "react";
import { Trash2, Pencil, Pin, PinOff, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCost } from "@/lib/utils/formatCost";
import type { Chat } from "@/lib/store";

interface SidebarItemProps {
  chat: Chat;
  active: boolean;
  pinned?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onPin: () => void;
}

function relativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function SidebarItem({ chat, active, pinned, onClick, onDelete, onRename, onPin }: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== chat.title) onRename(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") { setEditValue(chat.title); setEditing(false); }
  };

  return (
    <div
      className="group relative flex items-center gap-2 px-2 py-2 rounded-[8px] cursor-pointer transition-colors"
      style={{
        background: active ? "var(--mm-bg-hover)" : hovered ? "var(--mm-bg-hover)" : "transparent",
        borderLeft: active ? "2px solid var(--mm-accent)" : "2px solid transparent",
      }}
      onClick={() => { if (!editing && !menuOpen) onClick(); }}
      onDoubleClick={() => { setEditValue(chat.title); setEditing(true); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin indicator */}
      {pinned && (
        <Pin size={10} style={{ color: "var(--mm-accent)", flexShrink: 0 }} />
      )}

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none rounded px-1"
            style={{
              fontSize: "13px",
              color: "var(--mm-text-primary)",
              border: "1px solid var(--mm-accent)",
              padding: "1px 4px",
            }}
          />
        ) : (
          <p
            className="truncate"
            style={{
              fontSize: "13px",
              color: active ? "var(--mm-text-primary)" : "var(--mm-text-secondary)",
              fontWeight: active ? 500 : 400,
            }}
          >
            {chat.title}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span style={{ fontSize: "11px", color: "var(--mm-text-muted)" }}>
            {relativeTime(chat.updatedAt)}
          </span>
          {chat.totalCostUsd > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{ fontSize: "10px", color: "var(--mm-text-muted)", background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border)" }}
            >
              {formatCost(chat.totalCostUsd)}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons on hover */}
      {(hovered || menuOpen) && !editing && (
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setEditValue(chat.title); setEditing(true); }}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--mm-text-muted)" }}
            title="Rename"
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--mm-text-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--mm-text-muted)")}
          >
            <Pencil size={12} />
          </button>

          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--mm-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--mm-text-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--mm-text-muted)")}
            >
              <MoreHorizontal size={12} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 z-50 rounded-[8px] py-1 min-w-[130px]"
                  style={{
                    background: "var(--mm-bg-elevated)",
                    border: "1px solid var(--mm-border-strong)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  }}
                >
                  <MenuItem icon={<Pencil size={12} />} label="Rename" onClick={() => { setEditValue(chat.title); setEditing(true); setMenuOpen(false); }} />
                  <MenuItem icon={pinned ? <PinOff size={12} /> : <Pin size={12} />} label={pinned ? "Unpin" : "Pin"} onClick={() => { onPin(); setMenuOpen(false); }} />
                  <div style={{ height: 1, background: "var(--mm-border)", margin: "4px 0" }} />
                  <MenuItem icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { onDelete(); setMenuOpen(false); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
      style={{ fontSize: "12px", color: danger ? "var(--mm-danger)" : "var(--mm-text-secondary)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--mm-bg-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
      {label}
    </button>
  );
}
