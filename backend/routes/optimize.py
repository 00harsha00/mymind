from fastapi import APIRouter
from pydantic import BaseModel
from processors.optimizer import optimize_text

router = APIRouter()


class OptimizeRequest(BaseModel):
    text: str
    target_ratio: float = 0.5
    query: str = ""


@router.post("/optimize")
async def optimize(body: OptimizeRequest):
    try:
        result = optimize_text(body.text, query=body.query, target_ratio=body.target_ratio)
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}
