import json
from anthropic import AsyncAnthropic
from config import settings


async def extract_and_save_memory(user_id: str, message: str, supabase_client) -> None:
    """Extract key facts from user message and save to memory table."""
    if not user_id or not message.strip():
        return
    try:
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = (
            f'Extract 3-5 key facts the user revealed about themselves, their work, or preferences. '
            f'Return JSON array of strings only, no explanation. '
            f'If no personal facts, return [].\n\nUser message: "{message[:500]}"'
        )
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Parse JSON array
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return
        facts: list[str] = json.loads(raw[start:end])
        if not facts:
            return
        # Save to Supabase memory table (key=hash, value=fact)
        import hashlib
        rows = []
        for fact in facts:
            key = "fact_" + hashlib.md5(fact.encode()).hexdigest()[:12]
            rows.append({"user_id": user_id, "key": key, "value": fact})
        # Use upsert so duplicate facts don't error
        supabase_client.from_("memory").upsert(rows, on_conflict="user_id,key").execute()
    except Exception:
        pass


async def load_memory(user_id: str, supabase_client) -> str:
    """Load all memory items for a user and format as context string."""
    try:
        result = supabase_client.from_("memory").select("value").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
        items = [r["value"] for r in (result.data or [])]
        if not items:
            return ""
        return "What you know about this user:\n" + "\n".join(f"- {item}" for item in items)
    except Exception:
        return ""
