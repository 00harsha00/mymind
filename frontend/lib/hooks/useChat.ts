"use client";
import { useRef } from "react";
import { useStore, type Attachment } from "@/lib/store";
import { streamChat, ChatError } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const TOAST_STYLE = {
  style: {
    background: "var(--mm-bg-elevated)",
    border: "1px solid var(--mm-border-strong)",
    color: "var(--mm-text-primary)",
  },
};

export function useChat() {
  const {
    messages, model, features, user, currentChatId,
    addMessage, updateLastMessage, setLoading, addSessionCost,
    setCurrentChat, setChats, chats, clearMessages, setChatsLoading,
  } = useStore();
  const abortRef = useRef<AbortController | null>(null);

  // ── Load a chat's history from Supabase ──────────────────────────────────
  const loadChat = async (chatId: string) => {
    clearMessages();
    setChatsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, attachments, tokens_used, cost_usd, features_used, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      for (const row of data ?? []) {
        addMessage({
          id: row.id,
          role: row.role as "user" | "assistant",
          content: row.content,
          attachments: row.attachments ?? [],
          tokensUsed: row.tokens_used ?? undefined,
          costUsd: row.cost_usd ?? undefined,
          tokensSaved: row.features_used?.tokens_saved ?? undefined,
          createdAt: new Date(row.created_at),
        });
      }
      setCurrentChat(chatId);
    } catch {
      toast.error("Failed to load chat history.", TOAST_STYLE);
    } finally {
      setChatsLoading(false);
    }
  };

  // ── Send a message ────────────────────────────────────────────────────────
  const send = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    const supabase = createClient();
    let chatId = currentChatId;
    const isFirstMessage = !chatId;

    // Create new chat row in Supabase if needed
    if (!chatId && user) {
      const { data } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title: text.slice(0, 60) || "New chat" })
        .select()
        .single();
      if (data) {
        chatId = data.id;
        setCurrentChat(chatId);
        setChats([{ id: data.id, title: data.title, updatedAt: new Date(data.updated_at), totalCostUsd: 0 }, ...chats]);
      }
    }

    // Optimistically add messages to UI
    addMessage({ id: uuid(), role: "user", content: text, attachments, createdAt: new Date() });
    addMessage({ id: uuid(), role: "assistant", content: "", isStreaming: true, createdAt: new Date() });
    setLoading(true);

    abortRef.current = new AbortController();
    let accumulated = "";
    let finalCost = 0;
    let finalTokens = 0;
    let finalTokensSaved: number | undefined;
    let finalFollowUps: string[] | undefined;
    let finalSources: string[] | undefined;

    // Load personalization
    let personalization: Record<string, string> | undefined;
    if (user) {
      try {
        const { data: udata } = await supabase.from("users").select("settings").eq("id", user.id).single();
        if (udata?.settings?.personalization) personalization = udata.settings.personalization;
      } catch { /* ignore */ }
    }

    try {
      await streamChat(
        {
          message: text,
          chat_id: chatId ?? undefined,
          user_id: user?.id,
          model,
          attachments: attachments.map((a) => ({ type: a.type, content: a.content, filename: a.filename })),
          features: features as unknown as Record<string, boolean>,
          personalization,
          is_first_message: isFirstMessage,
        },
        // onToken
        (token) => {
          accumulated += token;
          updateLastMessage(accumulated, false);
        },
        // onCost
        async (cost) => {
          finalCost = cost.cost_usd;
          finalTokens = cost.input_tokens + cost.output_tokens;
          finalTokensSaved = cost.tokens_saved;
          updateLastMessage(accumulated, true, { tokens: finalTokens, costUsd: finalCost, tokensSaved: finalTokensSaved });
          addSessionCost(finalCost);

          // Savings toast
          if (finalTokensSaved && finalTokensSaved > 0) {
            toast.success(`Saved ~${finalTokensSaved} tokens this message`, {
              description: "Token optimizer is working",
              duration: 3000,
              ...TOAST_STYLE,
            });
          }

          // Budget alert
          if (user) {
            try {
              const sb = createClient();
              const { data: udata } = await sb.from("users").select("settings").eq("id", user.id).single();
              const limit = udata?.settings?.budgetLimitUsd;
              if (limit && limit > 0) {
                const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
                const { data: msgs } = await sb
                  .from("messages").select("cost_usd").eq("role", "assistant").gte("created_at", start.toISOString());
                const monthlySpend = (msgs ?? []).reduce((s: number, m: { cost_usd?: number }) => s + (m.cost_usd ?? 0), 0);
                const pct = monthlySpend / limit;
                if (pct >= 1) {
                  toast.error(`Budget exceeded: $${monthlySpend.toFixed(4)} / $${limit.toFixed(2)} monthly limit`, { duration: 8000, style: { background: "var(--mm-bg-elevated)", border: "1px solid #DC2626", color: "var(--mm-text-primary)" } });
                } else if (pct >= 0.8) {
                  toast.warning(`Budget alert: ${Math.round(pct * 100)}% of $${limit.toFixed(2)} monthly limit used`, { duration: 6000, style: { background: "var(--mm-bg-elevated)", border: "1px solid #D97706", color: "var(--mm-text-primary)" } });
                }
              }
            } catch { /* ignore */ }
          }
        },
        // onDone
        () => {
          updateLastMessage(accumulated, true, undefined, finalFollowUps, finalSources);
          setLoading(false);
          // Update chat in local sidebar list
          if (chatId) {
            const state = useStore.getState();
            state.setChats(state.chats.map((c) =>
              c.id === chatId ? { ...c, updatedAt: new Date(), totalCostUsd: (c.totalCostUsd || 0) + finalCost } : c
            ));
            // If title was auto-generated by backend, refresh from Supabase
            if (isFirstMessage) {
              const sb = createClient();
              sb.from("chats").select("title").eq("id", chatId).single().then(({ data }) => {
                if (data?.title) {
                  state.setChats(state.chats.map((c) => c.id === chatId ? { ...c, title: data.title } : c));
                }
              });
            }
          }
        },
        abortRef.current.signal,
        (suggestions) => { finalFollowUps = suggestions; },
        (sources) => { finalSources = sources; },
        // onError SSE
        (errMsg) => {
          updateLastMessage(errMsg, true);
          setLoading(false);
          toast.error(errMsg, { duration: 6000, ...TOAST_STYLE });
        },
      );
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof ChatError
        ? err.message
        : "Something went wrong. Please try again.";
      updateLastMessage(msg, true);
      toast.error(msg, { duration: 6000, ...TOAST_STYLE });
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
    const msgs = useStore.getState().messages;
    const last = msgs[msgs.length - 1];
    if (last?.isStreaming) updateLastMessage(last.content, true);
  };

  return { messages, send, stop, loadChat };
}
