"use client";
import { motion } from "framer-motion";
import { FileText, Code2, Globe, Play } from "lucide-react";

const SUGGESTIONS = [
  { icon: FileText, label: "Summarize a document", prompt: "Please summarize this document for me." },
  { icon: Code2, label: "Review my code", prompt: "Please review my code and suggest improvements." },
  { icon: Globe, label: "Research a topic", prompt: "Please research this topic and give me a comprehensive overview:" },
  { icon: Play, label: "Answer from a URL", prompt: "Please analyze the content at this URL and answer my questions:" },
];

interface EmptyStateProps {
  onSuggestion: (text: string) => void;
}

export function EmptyState({ onSuggestion }: EmptyStateProps) {
  return (
    <div style={{ paddingTop: "80px", paddingBottom: "40px", textAlign: "center" }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: "40px" }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            background: "var(--mm-accent-subtle)",
            border: "1px solid var(--mm-accent)",
            fontSize: "24px",
          }}
        >
          ✦
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 600, color: "var(--mm-text-primary)", marginBottom: "8px" }}>
          MyMind
        </h1>
        <p style={{ color: "var(--mm-text-secondary)", fontSize: "15px" }}>
          Your second brain. Ask anything.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => onSuggestion(prompt)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "10px",
              textAlign: "left",
              background: "rgba(124, 58, 237, 0.12)",
              border: "1px solid rgba(124, 58, 237, 0.35)",
              color: "var(--mm-text-primary)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#2D1060";
              e.currentTarget.style.borderColor = "var(--mm-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(124, 58, 237, 0.12)";
              e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.35)";
            }}
          >
            <Icon size={16} style={{ color: "var(--mm-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", lineHeight: "1.4" }}>{label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
}
