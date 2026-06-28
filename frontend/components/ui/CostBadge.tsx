"use client";
import { formatCost, formatTokens } from "@/lib/utils/formatCost";

interface CostBadgeProps {
  costUsd: number;
  tokensUsed: number;
  tokensSaved?: number;
}

export function CostBadge({ costUsd, tokensUsed, tokensSaved }: CostBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 mt-2 select-none"
      style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}
      title={`${tokensUsed} tokens · ${formatCost(costUsd)}${tokensSaved ? ` · saved ${tokensSaved} tokens via optimization` : ""}`}
    >
      {formatCost(costUsd)} · {formatTokens(tokensUsed)} tokens
      {tokensSaved && tokensSaved > 0 ? (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
        >
          -{tokensSaved}t saved
        </span>
      ) : null}
    </span>
  );
}
