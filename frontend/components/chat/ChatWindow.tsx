"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import { useStore } from "@/lib/store";
import type { Message } from "@/lib/store";

interface ChatWindowProps {
  messages: Message[];
  onSuggestion: (text: string) => void;
  onRegenerate?: () => void;
}

export function ChatWindow({ messages, onSuggestion, onRegenerate }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const { isLoading, isChatsLoading } = useStore();

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.isStreaming || messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  // Chat switching spinner
  if (isChatsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--mm-accent)" }} />
        <p style={{ color: "var(--mm-text-muted)", fontSize: "13px" }}>Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <EmptyState onSuggestion={onSuggestion} />
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSuggestion={onSuggestion}
                isLast={i === messages.length - 1 && msg.role === "assistant"}
                onRegenerate={i === messages.length - 1 && msg.role === "assistant" ? onRegenerate : undefined}
              />
            ))
          )}

          {/* "Thinking..." indicator while waiting for first token */}
          {isLoading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
            <div className="flex items-center gap-2 mb-4 ml-1">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: "var(--mm-accent)",
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: "0.8s",
                    }}
                  />
                ))}
              </div>
              <span style={{ color: "var(--mm-text-muted)", fontSize: "12px" }}>Thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-2 rounded-full shadow-lg transition-all"
          style={{
            background: "var(--mm-bg-elevated)",
            border: "1px solid var(--mm-border-strong)",
            color: "var(--mm-text-secondary)",
          }}
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
