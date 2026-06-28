"use client";
import { motion } from "framer-motion";

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--mm-text-muted)" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay }}
        />
      ))}
    </div>
  );
}
