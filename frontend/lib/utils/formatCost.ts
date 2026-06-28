export function formatCost(costUsd: number): string {
  if (costUsd < 0.0001) return "<$0.0001";
  return `$${costUsd.toFixed(4)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${tokens}`;
}
