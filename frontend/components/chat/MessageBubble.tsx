"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Copy, Check, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import { StreamingCursor } from "./StreamingCursor";
import { CodeBlock } from "./CodeBlock";
import { CostBadge } from "@/components/ui/CostBadge";
import type { Message } from "@/lib/store";

interface MessageBubbleProps {
  message: Message;
  onSuggestion?: (text: string) => void;
}


export function MessageBubble({ message, onSuggestion }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
    >
      {isUser ? (
        <div
          className="max-w-[75%] px-4 py-3 rounded-[14px]"
          style={{
            background: "var(--mm-bg-elevated)",
            color: "var(--mm-text-primary)",
            border: "1px solid var(--mm-border-strong)",
            fontSize: "15px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      ) : (
        <div className="max-w-[85%] group relative">
          <div className="mm-prose">
            <ReactMarkdown
              components={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const code = String(children).replace(/\n$/, "");
                  if (!inline && match) {
                    return <CodeBlock language={match[1]} code={code} />;
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && <StreamingCursor />}
          </div>

          {!message.isStreaming && message.content && (
            <div className="mt-2 flex flex-col gap-2">
              {/* Cost + copy + reactions row */}
              <div className="flex items-center gap-3 flex-wrap">
                {message.costUsd !== undefined && message.tokensUsed !== undefined && (
                  <CostBadge costUsd={message.costUsd} tokensUsed={message.tokensUsed} tokensSaved={message.tokensSaved} />
                )}
                <button
                  onClick={handleCopy}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  style={{ color: copied ? "var(--mm-success)" : "var(--mm-text-muted)", fontSize: "11px" }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {/* Reaction buttons */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setReaction(reaction === "up" ? null : "up")}
                    className="p-1 rounded-[5px] transition-all"
                    title="Helpful"
                    style={{
                      color: reaction === "up" ? "var(--mm-success)" : "var(--mm-text-muted)",
                      background: reaction === "up" ? "rgba(16,185,129,0.12)" : "transparent",
                    }}
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <button
                    onClick={() => setReaction(reaction === "down" ? null : "down")}
                    className="p-1 rounded-[5px] transition-all"
                    title="Not helpful"
                    style={{
                      color: reaction === "down" ? "var(--mm-danger)" : "var(--mm-text-muted)",
                      background: reaction === "down" ? "rgba(239,68,68,0.12)" : "transparent",
                    }}
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>
              </div>

              {/* Source pills */}
              <AnimatePresence>
                {message.sources && message.sources.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-1.5"
                  >
                    {message.sources.map((src, i) => {
                      let display = src;
                      try { display = new URL(src).hostname; } catch {}
                      return (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                          style={{
                            background: "var(--mm-bg-elevated)",
                            border: "1px solid var(--mm-border-strong)",
                            color: "var(--mm-text-secondary)",
                          }}
                        >
                          <ExternalLink size={10} />
                          {display}
                        </a>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Follow-up suggestion pills */}
              <AnimatePresence>
                {message.followUps && message.followUps.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-1.5 pt-1"
                  >
                    {message.followUps.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => onSuggestion?.(s)}
                        className="rounded-full px-3 py-1 text-[12px] font-medium transition-all text-left"
                        style={{
                          background: "var(--mm-accent-subtle)",
                          border: "1px solid rgba(124,58,237,0.3)",
                          color: "var(--mm-accent)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--mm-accent-subtle)"; }}
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
