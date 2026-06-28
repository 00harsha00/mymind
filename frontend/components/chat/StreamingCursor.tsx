"use client";
import { motion } from "framer-motion";

export function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[1em] ml-[2px] align-middle rounded-full"
      style={{ background: "var(--mm-accent)" }}
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
