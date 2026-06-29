"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { InputBar } from "@/components/input/InputBar";
import { FileUploadZone } from "@/components/input/FileUploadZone";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useChat } from "@/lib/hooks/useChat";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { exportAsMarkdown, exportAsPdf } from "@/lib/utils/exportChat";
import type { Attachment } from "@/lib/store";
import type { UploadResult } from "@/components/input/FileUploadZone";
import { Toaster } from "sonner";

function ChatApp() {
  const { send, stop, loadChat } = useChat();
  const { user } = useAuth();
  const { messages, isLoading, clearMessages, sidebarOpen, setUser } = useStore();
  const [prefill, setPrefill] = useState("");
  const [droppedAttachments, setDroppedAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  const handleNewChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  const handleSelectChat = useCallback(async (chatId: string) => {
    await loadChat(chatId);
  }, [loadChat]);

  const handleExport = useCallback(() => {
    exportAsMarkdown(messages);
  }, [messages]);

  const handleExportPdf = useCallback(() => {
    exportAsPdf(messages);
  }, [messages]);

  const handleRegenerate = useCallback(() => {
    // Find last user message and re-send it
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.content, lastUser.attachments ?? []);
  }, [messages, send]);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--mm-bg-base)" }}
    >
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-primary)" } }}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 bg-black/50 md:hidden"
            onClick={() => useStore.getState().toggleSidebar()}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <Sidebar onNewChat={handleNewChat} onSelectChat={handleSelectChat} />
      </div>

      {/* Sidebar — mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full z-20 md:hidden"
          >
            <Sidebar onNewChat={handleNewChat} onSelectChat={handleSelectChat} />
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette onNewChat={handleNewChat} onExport={handleExport} onExportPdf={handleExportPdf} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onNewChat={handleNewChat} />
        <FileUploadZone
          onUpload={(result: UploadResult) => {
            setDroppedAttachments((prev) => [
              ...prev,
              { type: "file", content: result.content, filename: result.filename },
            ]);
          }}
          onError={(msg) => {
            import("sonner").then(({ toast }) => toast.error(msg));
          }}
        >
          <ChatWindow
            messages={messages}
            onSuggestion={(text) => setPrefill(text)}
            onRegenerate={handleRegenerate}
          />
          <InputBar
            onSend={(text, atts) => {
              setDroppedAttachments([]);
              send(text, atts);
            }}
            onStop={stop}
            isLoading={isLoading}
            prefill={prefill}
            onPrefillConsumed={() => setPrefill("")}
            droppedAttachments={droppedAttachments}
            onDroppedAttachmentsConsumed={() => setDroppedAttachments([])}
          />
        </FileUploadZone>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatApp />
    </AuthGuard>
  );
}
