"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { EmptyState } from "./EmptyState";
import type { Message } from "@/lib/store";

interface ChatWindowProps {
  messages: Message[];
  onSuggestion: (text: string) => void;
}

export function ChatWindow({ messages, onSuggestion }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

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
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 100);
  };

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
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} onSuggestion={onSuggestion} />)
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
