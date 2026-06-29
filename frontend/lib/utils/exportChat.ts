import type { Message } from "@/lib/store";

export function exportAsPdf(messages: Message[], chatTitle = "MyMind Chat"): void {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = `
    <html><head><title>${chatTitle}</title><style>
      body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #111; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .date { color: #888; font-size: 13px; margin-bottom: 32px; }
      .msg { margin-bottom: 24px; }
      .role { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; }
      .user .role { color: #7C3AED; }
      .content { font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
      pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
    </style></head><body>
    <h1>${chatTitle}</h1><div class="date">${date}</div>
    ${messages.map((m) => `
      <div class="msg ${m.role}">
        <div class="role">${m.role === "user" ? "You" : "MyMind"}</div>
        <div class="content">${m.content.replace(/</g, "&lt;")}</div>
      </div>`).join("")}
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

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
