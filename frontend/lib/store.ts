"use client";
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

export interface Attachment {
  type: "file" | "url";
  content: string;
  filename?: string;
  url?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  tokensUsed?: number;
  costUsd?: number;
  tokensSaved?: number;
  followUps?: string[];
  sources?: string[];
  isStreaming?: boolean;
  createdAt: Date;
}

export interface Chat {
  id: string;
  title: string;
  updatedAt: Date;
  totalCostUsd: number;
  pinned?: boolean;
}

export interface Features {
  optimize_tokens: boolean;
  web_search: boolean;
  cite_sources: boolean;
  memory: boolean;
  follow_ups: boolean;
  auto_detect_task: boolean;
  code_reviewer: boolean;
  agent_mode: boolean;
}

interface AppState {
  messages: Message[];
  currentChatId: string | null;
  chats: Chat[];
  model: string;
  features: Features;
  sessionCost: number;
  isLoading: boolean;
  theme: "dark" | "light";
  user: User | null;
  sidebarOpen: boolean;

  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string, done?: boolean, cost?: { tokens: number; costUsd: number; tokensSaved?: number }, followUps?: string[], sources?: string[]) => void;
  setCurrentChat: (id: string | null) => void;
  setChats: (chats: Chat[]) => void;
  clearMessages: () => void;
  setModel: (model: string) => void;
  toggleFeature: (key: keyof Features) => void;
  setLoading: (val: boolean) => void;
  addSessionCost: (cost: number) => void;
  setTheme: (t: "dark" | "light") => void;
  setUser: (user: User | null) => void;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  messages: [],
  currentChatId: null,
  chats: [],
  model: "claude-sonnet-4-6",
  features: {
    optimize_tokens: false,
    web_search: false,
    cite_sources: false,
    memory: false,
    follow_ups: false,
    auto_detect_task: true,
    code_reviewer: false,
    agent_mode: false,
  },
  sessionCost: 0,
  isLoading: false,
  theme: "dark",
  user: null,
  sidebarOpen: true,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  updateLastMessage: (content, done, cost, followUps, sources) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...last,
          content,
          isStreaming: !done,
          ...(cost ? { tokensUsed: cost.tokens, costUsd: cost.costUsd, tokensSaved: cost.tokensSaved } : {}),
          ...(followUps ? { followUps } : {}),
          ...(sources ? { sources } : {}),
        };
      }
      return { messages: msgs };
    }),

  setCurrentChat: (id) => set({ currentChatId: id }),
  setChats: (chats) => set({ chats }),
  clearMessages: () => set({ messages: [], currentChatId: null }),
  setModel: (model) => set({ model }),
  toggleFeature: (key) =>
    set((s) => {
      const next = { ...s.features, [key]: !s.features[key] };
      // Persist to Supabase if user is logged in
      if (s.user) {
        import("@/lib/supabase").then(({ createClient }) => {
          const sb = createClient();
          sb.from("users").update({ settings: { features: next } }).eq("id", s.user!.id);
        });
      }
      return { features: next };
    }),
  setLoading: (val) => set({ isLoading: val }),
  addSessionCost: (cost) => set((s) => ({ sessionCost: s.sessionCost + cost })),
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  setUser: (user) => set({ user }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
