"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, X, Loader2 } from "lucide-react";
import { useVoice } from "@/lib/hooks/useVoice";

interface Props {
  onTranscript: (text: string) => void;
}

export function VoiceRecorder({ onTranscript }: Props) {
  const { state, error, start, stop, cancel } = useVoice(onTranscript);

  return (
    <div className="relative flex items-center">
      {/* Mic button */}
      <motion.button
        onClick={state === "idle" || state === "error" ? start : stop}
        whileTap={{ scale: 0.92 }}
        title={state === "recording" ? "Stop recording" : "Record voice"}
        className="w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors relative"
        style={{
          color: state === "recording" ? "#ef4444" : "var(--mm-text-muted)",
          background: state === "recording" ? "rgba(239,68,68,0.12)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (state === "idle") {
            e.currentTarget.style.background = "var(--mm-bg-hover)";
            e.currentTarget.style.color = "var(--mm-text-secondary)";
          }
        }}
        onMouseLeave={(e) => {
          if (state === "idle") {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--mm-text-muted)";
          }
        }}
      >
        {state === "processing" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : state === "recording" ? (
          <>
            <Square size={13} fill="#ef4444" style={{ color: "#ef4444" }} />
            {/* Pulse ring */}
            <motion.span
              className="absolute inset-0 rounded-[6px]"
              style={{ border: "1.5px solid #ef4444" }}
              animate={{ opacity: [1, 0], scale: [1, 1.5] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            />
          </>
        ) : (
          <Mic size={15} />
        )}
      </motion.button>

      {/* Recording panel */}
      <AnimatePresence>
        {(state === "recording" || state === "processing") && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            className="absolute left-9 bottom-0 flex items-center gap-2 rounded-[10px] px-3 py-1.5 z-10"
            style={{
              background: "var(--mm-bg-elevated)",
              border: "1px solid var(--mm-border-strong)",
              whiteSpace: "nowrap",
            }}
          >
            {state === "recording" ? (
              <>
                <RecordingDots />
                <span style={{ color: "var(--mm-text-secondary)", fontSize: "12px" }}>
                  Recording…
                </span>
                <button
                  onClick={cancel}
                  className="ml-1"
                  style={{ color: "var(--mm-text-muted)" }}
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <Loader2 size={12} className="animate-spin" style={{ color: "var(--mm-accent)" }} />
                <span style={{ color: "var(--mm-text-secondary)", fontSize: "12px" }}>
                  Transcribing…
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast-like */}
      <AnimatePresence>
        {state === "error" && error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-9 bottom-0 flex items-center gap-2 rounded-[10px] px-3 py-1.5 z-10"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#ef4444", fontSize: "12px" }}>{error}</span>
            <button onClick={cancel} style={{ color: "#ef4444" }}><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecordingDots() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: "#ef4444" }}
          animate={{ scaleY: [1, 2.5, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
