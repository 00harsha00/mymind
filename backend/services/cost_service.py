from datetime import datetime, timezone

PRICING = {
    "claude-sonnet-4-6": {
        "input": 3.00 / 1_000_000,
        "output": 15.00 / 1_000_000,
    },
    "claude-haiku-4-5-20251001": {
        "input": 0.25 / 1_000_000,
        "output": 1.25 / 1_000_000,
    },
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = PRICING.get(model, PRICING["claude-sonnet-4-6"])
    return (input_tokens * pricing["input"]) + (output_tokens * pricing["output"])


def get_monthly_cost(user_id: str, supabase_client) -> float:
    """Sum cost_usd for all messages this calendar month."""
    try:
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        result = (
            supabase_client
            .from_("messages")
            .select("cost_usd, chats!inner(user_id)")
            .eq("chats.user_id", user_id)
            .gte("created_at", start_of_month)
            .execute()
        )
        return sum(float(r.get("cost_usd") or 0) for r in (result.data or []))
    except Exception:
        return 0.0


def get_tokens_saved_total(user_id: str, supabase_client) -> int:
    """Return total tokens_saved across all messages for the user."""
    try:
        result = (
            supabase_client
            .from_("messages")
            .select("features_used, chats!inner(user_id)")
            .eq("chats.user_id", user_id)
            .execute()
        )
        total = 0
        for r in (result.data or []):
            fu = r.get("features_used") or {}
            total += int(fu.get("tokens_saved", 0))
        return total
    except Exception:
        return 0
