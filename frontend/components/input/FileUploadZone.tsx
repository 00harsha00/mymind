"use client";
import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface FileUploadZoneProps {
  onUpload: (result: UploadResult) => void;
  onError: (msg: string) => void;
  children: React.ReactNode;
}

export interface UploadResult {
  filename: string;
  type: string;
  content: string;
  charCount: number;
  estimatedTokens: number;
}

export async function uploadFileToBackend(file: File): Promise<UploadResult> {
  if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20MB");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND}/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || data.detail || "Upload failed");
  return {
    filename: data.filename,
    type: data.type,
    content: data.content,
    charCount: data.char_count,
    estimatedTokens: data.estimated_tokens,
  };
}

export function FileUploadZone({ onUpload, onError, children }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      try {
        const result = await uploadFileToBackend(file);
        onUpload(result);
      } catch (e: unknown) {
        onError(e instanceof Error ? e.message : "Upload failed");
      }
    }
  }, [onUpload, onError]);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="relative flex flex-col flex-1 overflow-hidden"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: "rgba(10, 10, 10, 0.85)",
              border: "2px dashed var(--mm-accent)",
              borderRadius: "14px",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className="w-16 h-16 rounded-[16px] flex items-center justify-center"
                style={{ background: "var(--mm-accent-subtle)", border: "1px solid var(--mm-accent)" }}
              >
                <Upload size={28} style={{ color: "var(--mm-accent)" }} />
              </div>
              <p style={{ color: "var(--mm-text-primary)", fontSize: "17px", fontWeight: 600 }}>
                Drop files here
              </p>
              <p style={{ color: "var(--mm-text-secondary)", fontSize: "13px" }}>
                PDF, DOCX, images, code, spreadsheets · max 20MB
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
