import json
from anthropic import AsyncAnthropic
from config import settings
from processors.optimizer import optimize_text, summarize_history
from services.web_search import search_web

SYSTEM_PROMPT = """You are MyMind, a premium AI assistant.
Be concise, accurate, and helpful.
Format responses in clean markdown.
For code: always use syntax-highlighted code blocks.
For lists: use clean bullet points.
Never mention that you are Claude or made by Anthropic."""

CODE_REVIEWER_ADDENDUM = """
You are in code reviewer mode. When reviewing or debugging code:
1. Identify bugs and security issues first
2. Suggest concrete fixes with code examples
3. Rate severity: Critical / High / Medium / Low
4. End with a brief summary of overall code quality
"""

AGENT_MODE_ADDENDUM = """
You are in agent mode. For complex tasks:
1. Break the problem into clear steps
2. Work through each step methodically
3. Show your reasoning at each stage
4. Verify your conclusions before presenting them
5. Proactively flag assumptions or uncertainties
"""

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

TASK_TYPES = {
    "code": ("code", "I'll focus on code quality, correctness, and best practices."),
    "document": ("document", "I'll focus on clarity, structure, and key insights."),
    "data": ("data", "I'll focus on patterns, statistics, and actionable insights."),
    "question": ("question", "I'll give a direct, well-structured answer."),
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = PRICING.get(model, PRICING["claude-sonnet-4-6"])
    return (input_tokens * pricing["input"]) + (output_tokens * pricing["output"])


def detect_task_type(message: str, attachments) -> str | None:
    msg_lower = message.lower()
    has_code_attachment = any(
        (a.filename or "").split(".")[-1] in {"py", "js", "ts", "tsx", "jsx", "go", "rs", "java", "cpp", "c", "html", "css"}
        for a in (attachments or [])
    )
    code_keywords = {"debug", "fix", "error", "bug", "code", "function", "class", "import", "syntax", "traceback"}
    doc_keywords = {"summarize", "summary", "document", "pdf", "report", "article", "explain", "what does"}
    data_keywords = {"csv", "excel", "spreadsheet", "data", "analyze", "chart", "statistics", "numbers"}

    if has_code_attachment or any(k in msg_lower for k in code_keywords):
        return TASK_TYPES["code"][1]
    if any(k in msg_lower for k in data_keywords):
        return TASK_TYPES["data"][1]
    if any(k in msg_lower for k in doc_keywords):
        return TASK_TYPES["document"][1]
    return None


async def generate_follow_ups(client: AsyncAnthropic, conversation_snippet: str) -> list[str]:
    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": (
                    f"Given this conversation, suggest 3 natural follow-up questions the user might ask. "
                    f"Return JSON array of 3 short strings only.\n\n{conversation_snippet[-800:]}"
                ),
            }],
        )
        raw = resp.content[0].text.strip()
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        suggestions: list[str] = json.loads(raw[start:end])
        return [s for s in suggestions if isinstance(s, str)][:3]
    except Exception:
        return []


async def stream_chat(request, history=None, supabase_client=None):
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    messages = list(history or [])

    # ── Build system prompt ─────────────────────────────────────────────────
    system = SYSTEM_PROMPT

    # Personalization
    p = request.personalization
    if p:
        parts = []
        if p.name:
            parts.append(f"The user's name is {p.name}. Address them by name occasionally.")
        if p.about:
            parts.append(f"About the user: {p.about}")
        if p.instructions:
            parts.append(f"Custom instructions: {p.instructions}")
        if p.responseStyle == "concise":
            parts.append("Response style: Be concise and brief. Get to the point. Avoid unnecessary elaboration.")
        elif p.responseStyle == "detailed":
            parts.append("Response style: Be thorough and detailed. Provide comprehensive explanations with examples.")
        if parts:
            system += "\n\n" + "\n".join(parts)

    # Memory: prepend user facts
    if request.features.memory and request.user_id and supabase_client:
        try:
            from services.memory_service import load_memory
            memory_ctx = await load_memory(request.user_id, supabase_client)
            if memory_ctx:
                system = memory_ctx + "\n\n" + system
        except Exception:
            pass

    # Auto-detect task type
    if request.features.auto_detect_task:
        task_hint = detect_task_type(request.message, request.attachments)
        if task_hint:
            system += f"\n\n[Task detected] {task_hint}"

    # Code reviewer mode
    if request.features.code_reviewer:
        system += CODE_REVIEWER_ADDENDUM

    # Agent mode
    if request.features.agent_mode:
        system += AGENT_MODE_ADDENDUM

    # ── Optimize history ────────────────────────────────────────────────────
    if request.features.optimize_tokens and len(messages) > 5:
        messages = summarize_history(messages, keep_last=5)

    # ── Web search ──────────────────────────────────────────────────────────
    search_context = ""
    search_sources: list[str] = []
    if request.features.web_search:
        search_context = search_web(request.message)
        # Extract source URLs for cite_sources
        if request.features.cite_sources and search_context:
            import re
            search_sources = re.findall(r"Source: (https?://\S+)", search_context)

    # ── Build user message ──────────────────────────────────────────────────
    attachment_parts = []
    orig_attachment_len = 0
    if request.attachments:
        for att in request.attachments:
            name = att.filename or "attachment"
            content = att.content
            orig_attachment_len += len(content)
            if request.features.optimize_tokens and len(content) > 500:
                result = optimize_text(content, query=request.message)
                content = result["compressed_text"]
            attachment_parts.append(f"[Attached: {name}]\n\n{content}")

    user_content = request.message
    if attachment_parts:
        user_content = "\n\n".join(attachment_parts) + f"\n\n[User question]: {request.message}"
    if search_context:
        user_content = search_context + "\n\n" + user_content

    messages.append({"role": "user", "content": user_content})

    # Tokens saved stat
    tokens_saved = None
    if request.features.optimize_tokens and attachment_parts:
        compressed_len = sum(len(p) for p in attachment_parts)
        tokens_saved = max(0, (orig_attachment_len - compressed_len) // 4)

    # ── Stream from Claude ──────────────────────────────────────────────────
    full_response = ""
    async with client.messages.stream(
        model=request.model,
        max_tokens=4096,
        messages=messages,
        system=system,
    ) as stream:
        async for text in stream.text_stream:
            full_response += text
            yield f"data: {json.dumps({'type': 'token', 'content': text})}\n\n"

        final = await stream.get_final_message()
        usage = final.usage
        cost = calculate_cost(request.model, usage.input_tokens, usage.output_tokens)

        cost_payload: dict = {
            "type": "cost",
            "input_tokens": usage.input_tokens,
            "output_tokens": usage.output_tokens,
            "cost_usd": cost,
        }
        if tokens_saved is not None:
            cost_payload["tokens_saved"] = tokens_saved
        yield f"data: {json.dumps(cost_payload)}\n\n"

    # ── Cite sources ────────────────────────────────────────────────────────
    if request.features.cite_sources and search_sources:
        yield f"data: {json.dumps({'type': 'sources', 'sources': search_sources[:5]})}\n\n"

    # ── Follow-up suggestions ───────────────────────────────────────────────
    if request.features.follow_ups:
        snippet = f"User: {request.message}\nAssistant: {full_response}"
        suggestions = await generate_follow_ups(client, snippet)
        if suggestions:
            yield f"data: {json.dumps({'type': 'follow_ups', 'suggestions': suggestions})}\n\n"

    # ── Memory: extract & save facts from user message ──────────────────────
    if request.features.memory and request.user_id and supabase_client:
        try:
            from services.memory_service import extract_and_save_memory
            await extract_and_save_memory(request.user_id, request.message, supabase_client)
        except Exception:
            pass

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
