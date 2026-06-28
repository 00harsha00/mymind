from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.chat import ChatRequest
from services.claude_service import stream_chat

router = APIRouter()

@router.post("/chat")
async def chat(request: ChatRequest):
    # Supabase client for memory feature (async)
    supabase_client = None
    if request.features.memory and request.user_id:
        try:
            from supabase import create_client
            from config import settings
            supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except Exception:
            pass

    return StreamingResponse(
        stream_chat(request, supabase_client=supabase_client),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
