from fastapi import APIRouter, HTTPException

router = APIRouter()


def _get_sb():
    from supabase import create_client
    from config import settings
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


@router.get("/history/{user_id}")
async def get_history(user_id: str):
    """Return all chats for a user, newest first."""
    try:
        sb = _get_sb()
        result = (
            sb.from_("chats")
            .select("id, title, updated_at, total_cost_usd, is_pinned")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
        return {"chats": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{chat_id}/messages")
async def get_messages(chat_id: str):
    """Return all messages for a chat, oldest first."""
    try:
        sb = _get_sb()
        result = (
            sb.from_("messages")
            .select("id, role, content, attachments, tokens_used, cost_usd, features_used, created_at")
            .eq("chat_id", chat_id)
            .order("created_at", desc=False)
            .execute()
        )
        return {"messages": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat and all its messages (messages cascade via FK or explicit delete)."""
    try:
        sb = _get_sb()
        # Delete messages first in case there's no cascade
        sb.from_("messages").delete().eq("chat_id", chat_id).execute()
        sb.from_("chats").delete().eq("id", chat_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
