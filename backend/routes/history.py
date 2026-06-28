from fastapi import APIRouter

router = APIRouter()

@router.get("/history/{user_id}")
async def get_history(user_id: str):
    # Phase 2: will connect to Supabase
    return {"chats": []}

@router.get("/history/{chat_id}/messages")
async def get_messages(chat_id: str):
    return {"messages": []}

@router.delete("/history/{chat_id}")
async def delete_chat(chat_id: str):
    return {"success": True}
