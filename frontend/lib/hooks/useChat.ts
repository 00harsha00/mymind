"use client";
import { useRef } from "react";
import { useStore, type Attachment } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for HTTP (non-secure) contexts
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useChat() {
  const {
    messages, model, features, user, currentChatId,
    addMessage, updateLastMessage, setLoading, addSessionCost,
    setCurrentChat, setChats, chats,
  } = useStore();
  const abortRef = useRef<AbortController | null>(null);

  const send = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;

    const supabase = createClient();
    let chatId = currentChatId;

    // Create a new chat in Supabase if needed
    if (!chatId && user) {
      const title = text.slice(0, 60) || "New chat";
      const { data } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (data) {
        chatId = data.id;
        setCurrentChat(chatId);
        const newChat = {
          id: data.id,
          title: data.title,
          updatedAt: new Date(data.updated_at),
          totalCostUsd: 0,
        };
        setChats([newChat, ...chats]);
      }
    }

    const userMsg = {
      id: uuid(),
      role: "user" as const,
      content: text,
      attachments,
      createdAt: new Date(),
    };
    addMessage(userMsg);

    const aiMsg = {
      id: uuid(),
      role: "assistant" as const,
      content: "",
      isStreaming: true,
      createdAt: new Date(),
    };
    addMessage(aiMsg);
    setLoading(true);

    abortRef.current = new AbortController();
    let accumulated = "";
    let finalCost = 0;
    let finalTokens = 0;
    let finalTokensSaved: number | undefined;
    let finalFollowUps: string[] | undefined;
    let finalSources: string[] | undefined;

    // Load personalization settings
    let personalization: Record<string, string> | undefined;
    if (user) {
      try {
        const { data: udata } = await supabase.from("users").select("settings").eq("id", user.id).single();
        if (udata?.settings?.personalization) {
          personalization = udata.settings.personalization;
        }
      } catch { /* ignore */ }
    }

    try {
      await streamChat(
        {
          message: text,
          chat_id: chatId ?? undefined,
          user_id: user?.id,
          model,
          attachments: attachments.map((a) => ({
            type: a.type,
            content: a.content,
            filename: a.filename,
          })),
          features: features as unknown as Record<string, boolean>,
          personalization,
        },
        (token) => {
          accumulated += token;
          updateLastMessage(accumulated, false);
        },
        async (cost) => {
          finalCost = cost.cost_usd;
          finalTokens = cost.input_tokens + cost.output_tokens;
          finalTokensSaved = cost.tokens_saved;
          updateLastMessage(accumulated, true, {
            tokens: finalTokens,
            costUsd: finalCost,
            tokensSaved: finalTokensSaved,
          });
          addSessionCost(finalCost);

          // IMPROVEMENT 5: Savings toast
          if (finalTokensSaved && finalTokensSaved > 0) {
            toast.success(`Saved ~${finalTokensSaved} tokens this message`, {
              description: "Token optimizer is working",
              duration: 3000,
              style: { background: "var(--mm-bg-elevated)", border: "1px solid var(--mm-border-strong)", color: "var(--mm-text-primary)" },
            });
          }

          // IMPROVEMENT 4: Budget alert
          if (user) {
            try {
              const sb = createClient();
              const { data: udata } = await sb.from("users").select("settings").eq("id", user.id).single();
              const limit = udata?.settings?.budgetLimitUsd;
              if (limit && limit > 0) {
                // Get current month's spend
                const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
                const { data: msgs } = await sb
                  .from("messages")
                  .select("cost_usd")
                  .eq("role", "assistant")
                  .gte("created_at", start.toISOString());
                const monthlySpend = (msgs ?? []).reduce((s: number, m: { cost_usd?: number }) => s + (m.cost_usd ?? 0), 0);
                const pct = monthlySpend / limit;
                if (pct >= 0.8 && pct < 1) {
                  toast.warning(`Budget alert: ${Math.round(pct * 100)}% of $${limit.toFixed(2)} monthly limit used`, {
                    duration: 6000,
                    style: { background: "var(--mm-bg-elevated)", border: "1px solid #D97706", color: "var(--mm-text-primary)" },
                  });
                } else if (pct >= 1) {
                  toast.error(`Budget exceeded: $${monthlySpend.toFixed(4)} / $${limit.toFixed(2)} monthly limit`, {
                    duration: 8000,
                    style: { background: "var(--mm-bg-elevated)", border: "1px solid #DC2626", color: "var(--mm-text-primary)" },
                  });
                }
              }
            } catch { /* ignore budget check errors */ }
          }
        },
        () => {
          updateLastMessage(accumulated, true, undefined, finalFollowUps, finalSources);
          setLoading(false);
          // Save messages to Supabase
          if (chatId && user) {
            const sb = createClient();
            sb.from("messages").insert([
              { chat_id: chatId, role: "user", content: text, attachments: attachments },
              { chat_id: chatId, role: "assistant", content: accumulated, tokens_used: finalTokens, cost_usd: finalCost, features_used: { tokens_saved: finalTokensSaved ?? 0 } },
            ]).then(() => {
              // Update chat total cost
              sb.from("chats")
                .update({ updated_at: new Date().toISOString(), total_cost_usd: finalCost })
                .eq("id", chatId);
            });
          }
        },
        abortRef.current.signal,
        (suggestions) => { finalFollowUps = suggestions; },
        (sources) => { finalSources = sources; },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      updateLastMessage("Sorry, something went wrong. Please try again.", true);
      setLoading(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
    const msgs = useStore.getState().messages;
    const last = msgs[msgs.length - 1];
    if (last?.isStreaming) {
      updateLastMessage(last.content, true);
    }
  };

  return { messages, send, stop };
}
