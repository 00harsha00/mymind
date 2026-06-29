from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.chat import ChatRequest
from services.claude_service import stream_chat

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    from supabase import create_client
    from config import settings
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # ── Auto-generate title for brand-new chats ─────────────────────────────
    if request.chat_id and request.is_first_message:
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=20,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Generate a 4-5 word title for this conversation. "
                        f"Return ONLY the title, no punctuation, no quotes:\n\n{request.message[:300]}"
                    ),
                }],
            )
            title = resp.content[0].text.strip().strip('"').strip("'")
            if title:
                sb.from_("chats").update({"title": title}).eq("id", request.chat_id).execute()
        except Exception:
            pass  # title stays as default, not a fatal error

    # ── Save user message to Supabase BEFORE calling Claude ─────────────────
    if request.chat_id and request.user_id:
        try:
            sb.from_("messages").insert({
                "chat_id": request.chat_id,
                "role": "user",
                "content": request.message,
                "attachments": [a.dict() for a in request.attachments] if request.attachments else [],
            }).execute()
        except Exception:
            pass  # non-fatal — continue even if save fails

    # ── Load conversation history ────────────────────────────────────────────
    history = []
    if request.chat_id:
        try:
            result = (
                sb.from_("messages")
                .select("role, content")
                .eq("chat_id", request.chat_id)
                .order("created_at", desc=False)
                .execute()
            )
            for row in (result.data or []):
                if row["role"] in ("user", "assistant") and row["content"]:
                    history.append({"role": row["role"], "content": row["content"]})
        except Exception:
            pass

    return StreamingResponse(
        stream_chat(request, history=history, supabase_client=sb),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
