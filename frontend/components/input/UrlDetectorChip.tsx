"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Play, X, Loader2 } from "lucide-react";
import { isYouTubeUrl } from "@/lib/utils/urlDetect";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface ScrapeResult {
  filename: string;
  content: string;
  type: string;
  title: string;
  url: string;
}

interface Props {
  url: string;
  onAdd: (result: ScrapeResult) => void;
  onDismiss: () => void;
}

export function UrlDetectorChip({ url, onAdd, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isYT = isYouTubeUrl(url);

  const displayUrl = url.length > 50 ? url.slice(0, 47) + "…" : url;

  const handleAdd = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch URL");
      onAdd({
        filename: data.title || url,
        content: `[Content from: ${data.url}]\n\n${data.content}`,
        type: data.type,
        title: data.title,
        url: data.url,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm"
      style={{
        background: "var(--mm-bg-elevated)",
        border: "1px solid var(--mm-border-strong)",
      }}
    >
      <div
        className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
        style={{ background: isYT ? "rgba(220,38,38,0.15)" : "var(--mm-accent-subtle)" }}
      >
        {isYT ? (
          <Play size={12} style={{ color: "#ef4444" }} />
        ) : (
          <Link2 size={12} style={{ color: "var(--mm-accent)" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p style={{ color: "var(--mm-text-secondary)", fontSize: "12px" }} className="truncate">
          {isYT ? "YouTube" : "URL"} detected
        </p>
        <p style={{ color: "var(--mm-text-primary)", fontSize: "12px", fontWeight: 500 }} className="truncate">
          {displayUrl}
        </p>
        {error && (
          <p style={{ color: "#ef4444", fontSize: "11px" }}>{error}</p>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium disabled:opacity-50 transition-opacity"
        style={{ background: "var(--mm-accent)", color: "#fff" }}
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : null}
        {loading ? "Fetching…" : "Add"}
      </button>

      <button
        onClick={onDismiss}
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ color: "var(--mm-text-muted)" }}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
