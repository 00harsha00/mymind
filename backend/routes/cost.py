from fastapi import APIRouter
from pydantic import BaseModel
from services.cost_service import get_monthly_cost, get_tokens_saved_total

router = APIRouter()


class CostRequest(BaseModel):
    user_id: str


@router.post("/cost/monthly")
async def monthly_cost(body: CostRequest):
    try:
        from supabase import create_client
        from config import settings
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        monthly = get_monthly_cost(body.user_id, sb)
        tokens_saved = get_tokens_saved_total(body.user_id, sb)
        return {"success": True, "monthly_cost_usd": monthly, "tokens_saved_total": tokens_saved}
    except Exception as e:
        return {"success": False, "error": str(e), "monthly_cost_usd": 0, "tokens_saved_total": 0}
