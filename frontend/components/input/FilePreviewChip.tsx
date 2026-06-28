"use client";
import { X, FileText } from "lucide-react";

interface FilePreviewChipProps {
  filename: string;
  charCount: number;
  onRemove: () => void;
}

export function FilePreviewChip({ filename, charCount, onRemove }: FilePreviewChipProps) {
  const tokens = Math.ceil(charCount / 4);
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]"
      style={{
        background: "var(--mm-bg-elevated)",
        border: "1px solid var(--mm-border-strong)",
        fontSize: "12px",
        color: "var(--mm-text-secondary)",
      }}
    >
      <FileText size={12} style={{ color: "var(--mm-accent)" }} />
      <span className="max-w-[120px] truncate">{filename}</span>
      <span style={{ color: "var(--mm-text-muted)" }}>~{tokens}t</span>
      <button
        onClick={onRemove}
        style={{ color: "var(--mm-text-muted)" }}
        className="hover:text-white transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
