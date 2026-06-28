"use client";
import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { Send, Square, Paperclip, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment } from "@/lib/store";
import { FilePreviewChip } from "./FilePreviewChip";
import { uploadFileToBackend } from "./FileUploadZone";
import { UrlDetectorChip, type ScrapeResult } from "./UrlDetectorChip";
import { VoiceRecorder } from "./VoiceRecorder";
import { extractUrls } from "@/lib/utils/urlDetect";
import { Toaster, toast } from "sonner";

interface InputBarProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isLoading: boolean;
  prefill?: string;
  onPrefillConsumed?: () => void;
  droppedAttachments?: Attachment[];
  onDroppedAttachmentsConsumed?: () => void;
}

const ACCEPTED = ".pdf,.docx,.pptx,.doc,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.go,.rs,.html,.css,.json,.yaml,.sql";

const SLASH_COMMANDS = [
  { command: "/summarize", description: "Summarize this conversation or document" },
  { command: "/translate", description: "Translate to another language" },
  { command: "/review", description: "Review and critique this content" },
  { command: "/explain", description: "Explain this in simple terms" },
  { command: "/fix", description: "Fix errors or bugs in this code" },
];

export function InputBar({ onSend, onStop, isLoading, prefill, onPrefillConsumed, droppedAttachments, onDroppedAttachmentsConsumed }: InputBarProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefill) {
      setText(prefill);
      onPrefillConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [prefill, onPrefillConsumed]);

  useEffect(() => {
    if (droppedAttachments && droppedAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...droppedAttachments]);
      onDroppedAttachmentsConsumed?.();
      toast.success(`${droppedAttachments.length} file(s) attached`);
    }
  }, [droppedAttachments]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [text]);

  useEffect(() => {
    const urls = extractUrls(text).filter((u) => !dismissedUrls.has(u));
    setDetectedUrls(urls);
  }, [text, dismissedUrls]);

  // Slash command: show dropdown when text starts with "/"
  const slashFiltered = SLASH_COMMANDS.filter((c) =>
    text.startsWith("/") && c.command.startsWith(text.split(" ")[0])
  );
  const showSlash = slashOpen && slashFiltered.length > 0 && !text.includes(" ");

  useEffect(() => {
    if (text === "/" || (text.startsWith("/") && !text.includes(" "))) {
      setSlashOpen(true);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  }, [text]);

  const applySlashCommand = (cmd: string) => {
    setText(cmd + " ");
    setSlashOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  const handleScrapeAdd = useCallback((result: ScrapeResult, url: string) => {
    setAttachments((prev) => [
      ...prev,
      { type: "file", content: result.content, filename: result.title || url },
    ]);
    setDismissedUrls((prev) => new Set(Array.from(prev).concat(url)));
    toast.success(`${result.type === "youtube" ? "YouTube transcript" : "Page content"} added`);
  }, []);

  const dismissUrl = useCallback((url: string) => {
    setDismissedUrls((prev) => new Set(Array.from(prev).concat(url)));
  }, []);

  const addAttachment = useCallback((result: { filename: string; content: string; type: string }) => {
    setAttachments((prev) => [
      ...prev,
      { type: "file", content: result.content, filename: result.filename },
    ]);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const result = await uploadFileToBackend(file);
        addAttachment(result);
        toast.success(`${file.name} processed (${result.estimatedTokens} tokens)`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((i) => i.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFileToBackend(file);
      addAttachment({ ...result, filename: result.filename || "pasted-image" });
      toast.success("Image pasted and processed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Paste failed");
    } finally {
      setUploading(false);
    }
  }, [addAttachment]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
    setDetectedUrls([]);
    setDismissedUrls(new Set());
    setSlashOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashFiltered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashFiltered.length) % slashFiltered.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && slashFiltered.length > 0)) {
        e.preventDefault();
        applySlashCommand(slashFiltered[slashIndex].command);
        return;
      }
      if (e.key === "Escape") {
        setSlashOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) handleSend();
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isLoading && !uploading;
  const tokenEstimate = Math.ceil(text.length / 4) + attachments.reduce((s, a) => s + Math.ceil(a.content.length / 4), 0);

  return (
    <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid var(--mm-border)" }}>
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-primary)" } }}
      />
      <div className="max-w-3xl mx-auto relative">
        {/* Slash command dropdown */}
        <AnimatePresence>
          {showSlash && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 left-0 right-0 rounded-[12px] overflow-hidden z-50"
              style={{
                background: "var(--mm-bg-elevated)",
                border: "1px solid var(--mm-border-strong)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              <div className="px-3 py-1.5" style={{ borderBottom: "1px solid var(--mm-border)" }}>
                <span style={{ fontSize: "11px", color: "var(--mm-text-muted)" }}>Slash commands · Tab or Enter to select</span>
              </div>
              {slashFiltered.map((cmd, i) => (
                <button
                  key={cmd.command}
                  onClick={() => applySlashCommand(cmd.command)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: i === slashIndex ? "var(--mm-bg-hover)" : "transparent",
                  }}
                  onMouseEnter={() => setSlashIndex(i)}
                >
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--mm-accent)", fontFamily: "monospace" }}>
                    {cmd.command}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--mm-text-muted)" }}>{cmd.description}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File preview chips */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-2"
            >
              {attachments.map((att, i) => (
                <FilePreviewChip
                  key={i}
                  filename={att.filename || "file"}
                  charCount={att.content.length}
                  onRemove={() => removeAttachment(i)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* URL detector chips */}
        <AnimatePresence>
          {detectedUrls.map((url) => (
            <UrlDetectorChip
              key={url}
              url={url}
              onAdd={(result) => handleScrapeAdd(result, url)}
              onDismiss={() => dismissUrl(url)}
            />
          ))}
        </AnimatePresence>

        {/* Upload progress */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mb-2 px-1"
            >
              <Loader2 size={13} className="animate-spin" style={{ color: "var(--mm-accent)" }} />
              <span style={{ color: "var(--mm-text-muted)", fontSize: "12px" }}>Processing file...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div
          className="flex items-end gap-2 rounded-[14px] px-3 py-2.5"
          style={{
            background: "var(--mm-bg-elevated)",
            border: "1px solid var(--mm-border-strong)",
            transition: "border-color 0.15s",
          }}
        >
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 pb-0.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ACCEPTED}
              onChange={handleFileChange}
            />
            <ToolBtn icon={Paperclip} title="Attach file (PDF, DOCX, image, code...)" onClick={() => fileInputRef.current?.click()} />
            <VoiceRecorder onTranscript={(t) => setText((prev) => prev ? prev + " " + t : t)} />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask anything… or type / for commands"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none"
            style={{
              color: "var(--mm-text-primary)",
              fontSize: "15px",
              lineHeight: "1.6",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          />

          {/* Token count + send */}
          <div className="flex items-end gap-2 pb-0.5">
            {tokenEstimate > 0 && (
              <span style={{ color: "var(--mm-text-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>
                ~{tokenEstimate > 999 ? `${(tokenEstimate / 1000).toFixed(1)}k` : tokenEstimate}t
              </span>
            )}
            <button
              onClick={isLoading ? onStop : handleSend}
              disabled={!isLoading && !canSend}
              title={isLoading ? "Stop" : "Send (Enter)"}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
              style={{ background: isLoading ? "var(--mm-danger)" : "var(--mm-accent)", color: "#fff" }}
            >
              {isLoading ? <Square size={14} fill="white" /> : <Send size={14} />}
            </button>
          </div>
        </div>

        <p className="text-center mt-1.5" style={{ color: "var(--mm-text-muted)", fontSize: "11px" }}>
          Enter to send · Shift+Enter for new line · / for commands
        </p>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors"
      style={{ color: "var(--mm-text-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--mm-bg-hover)";
        e.currentTarget.style.color = "var(--mm-text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--mm-text-muted)";
      }}
    >
      <Icon size={15} />
    </button>
  );
}
