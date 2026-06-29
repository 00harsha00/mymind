const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface ChatRequest {
  message: string;
  chat_id?: string;
  user_id?: string;
  model: string;
  attachments?: Array<{ type: string; content: string; filename?: string }>;
  features: Record<string, boolean>;
  personalization?: Record<string, string>;
  is_first_message?: boolean;
}

export class ChatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatError";
  }
}

export async function streamChat(
  req: ChatRequest,
  onToken: (text: string) => void,
  onCost: (data: { input_tokens: number; output_tokens: number; cost_usd: number; tokens_saved?: number }) => void,
  onDone: () => void,
  signal?: AbortSignal,
  onFollowUps?: (suggestions: string[]) => void,
  onSources?: (sources: string[]) => void,
  onError?: (message: string) => void,
) {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new ChatError("Cannot connect to server. Make sure the backend is running.");
  }

  if (res.status === 401) throw new ChatError("Please sign in again — your session has expired.");
  if (res.status === 429) throw new ChatError("API rate limit reached. Please wait a moment and try again.");
  if (!res.ok) throw new ChatError(`Server error (${res.status}). Please try again.`);
  if (!res.body) throw new ChatError("No response from server.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const evt = JSON.parse(raw);
        if (evt.type === "token") onToken(evt.content);
        else if (evt.type === "cost") onCost(evt);
        else if (evt.type === "follow_ups") onFollowUps?.(evt.suggestions);
        else if (evt.type === "sources") onSources?.(evt.sources);
        else if (evt.type === "error") onError?.(evt.message);
        else if (evt.type === "done") onDone();
      } catch { /* malformed JSON line — skip */ }
    }
  }
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function scrapeUrl(url: string) {
  const res = await fetch(`${BACKEND}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Scrape failed");
  return res.json();
}
