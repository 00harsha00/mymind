import type { Message } from "@/lib/store";

export function exportAsMarkdown(messages: Message[], chatTitle = "MyMind Chat"): void {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lines: string[] = [`# ${chatTitle}`, `*Exported on ${date}*`, ""];

  for (const msg of messages) {
    if (msg.role === "user") {
      lines.push(`## You`, msg.content, "");
    } else {
      lines.push(`## MyMind`, msg.content, "");
      if (msg.costUsd !== undefined) {
        lines.push(`*${msg.tokensUsed} tokens · $${msg.costUsd.toFixed(6)}*`, "");
      }
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mymind-chat-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
