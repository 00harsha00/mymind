"use client";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative rounded-[10px] overflow-hidden my-3"
      style={{ border: "1px solid var(--mm-border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--mm-bg-surface)", borderBottom: "1px solid var(--mm-border)" }}
      >
        <span style={{ color: "var(--mm-text-muted)", fontSize: "11px", fontFamily: "var(--font-geist-mono)" }}>
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 transition-colors"
          style={{ color: copied ? "var(--mm-success)" : "var(--mm-text-muted)", fontSize: "11px" }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "16px",
          background: "#0D0D0D",
          fontSize: "13px",
          lineHeight: "1.6",
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
