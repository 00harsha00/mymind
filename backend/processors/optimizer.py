"""
Token optimization pipeline (runs when optimize_tokens toggle is ON).

Step 1 — History summarization (keep last 5 messages, summarize older)
Step 2 — spaCy cleaning (dedup sentences, strip boilerplate)
Step 3 — LLMLingua compression (target 50% reduction)
Step 4 — Smart chunking (for large documents, keep top 3 relevant chunks)
"""

import re

_nlp = None
# None = not yet attempted; "fallback" = failed to load; PromptCompressor = loaded
_compressor = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def _get_compressor():
    global _compressor
    if _compressor is None:
        try:
            from llmlingua import PromptCompressor
            _compressor = PromptCompressor(
                model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
                use_llmlingua2=True,
                device_map="cpu",
            )
        except Exception as e:
            print(f"LLMLingua unavailable, using spaCy-only compression: {e}")
            _compressor = "fallback"
    return _compressor


# ── Step 1: history summarization ─────────────────────────────────────────────

def summarize_history(messages: list[dict], keep_last: int = 5) -> list[dict]:
    """Keep the last `keep_last` messages verbatim; summarise older ones."""
    if len(messages) <= keep_last:
        return messages

    older = messages[:-keep_last]
    recent = messages[-keep_last:]

    # Simple extractive summary: take first sentence of each message
    summary_lines = []
    for m in older:
        role = m.get("role", "?")
        content = str(m.get("content", ""))
        first_sentence = re.split(r"(?<=[.!?])\s+", content.strip())[0][:200]
        summary_lines.append(f"{role}: {first_sentence}")

    summary_msg = {
        "role": "system",
        "content": f"[Earlier conversation summary]\n" + "\n".join(summary_lines),
    }
    return [summary_msg] + recent


# ── Step 2: spaCy cleaning ────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Remove duplicate sentences, excessive whitespace, and boilerplate."""
    nlp = _get_nlp()

    # Normalise whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    doc = nlp(text)
    seen: set[str] = set()
    clean_sentences: list[str] = []

    for sent in doc.sents:
        norm = sent.text.strip().lower()
        if not norm or len(norm) < 10:
            continue
        if norm in seen:
            continue
        seen.add(norm)
        clean_sentences.append(sent.text.strip())

    return " ".join(clean_sentences)


# ── Step 3: LLMLingua compression ────────────────────────────────────────────

def compress_text(text: str, target_ratio: float = 0.5) -> str:
    """Compress text to ~target_ratio of original using LLMLingua-2; falls back to spaCy result."""
    if len(text) < 200:
        return text
    compressor = _get_compressor()
    if compressor == "fallback":
        return text
    try:
        result = compressor.compress_prompt(
            text,
            rate=target_ratio,
            force_tokens=["\n", "?", "!", "."],
        )
        compressed = result.get("compressed_prompt", text)
        return compressed if compressed.strip() else text
    except Exception:
        return text


# ── Step 4: smart chunking ────────────────────────────────────────────────────

def chunk_and_select(text: str, query: str, max_chunks: int = 3, chunk_tokens: int = 500) -> str:
    """Split large text into chunks, return the top `max_chunks` most relevant."""
    words = text.split()
    total_tokens = len(words) // 1  # rough: 1 word ≈ 1.3 tokens, close enough

    if total_tokens <= chunk_tokens * max_chunks:
        return text  # small enough, return as-is

    chunk_words = chunk_tokens
    chunks = []
    for i in range(0, len(words), chunk_words):
        chunk = " ".join(words[i:i + chunk_words])
        chunks.append(chunk)

    if not chunks:
        return text

    # Score chunks by query keyword overlap
    query_words = set(query.lower().split())

    def score(chunk: str) -> int:
        cw = set(chunk.lower().split())
        return len(query_words & cw)

    ranked = sorted(chunks, key=score, reverse=True)[:max_chunks]
    # Restore original order
    selected_set = set(id(c) for c in ranked)
    ordered = [c for c in chunks if id(c) in selected_set or c in ranked][:max_chunks]
    return "\n\n[...]\n\n".join(ordered)


# ── Public API ────────────────────────────────────────────────────────────────

def optimize_text(text: str, query: str = "", target_ratio: float = 0.5) -> dict:
    """Full pipeline: clean → chunk → compress. Returns stats + result."""
    original_chars = len(text)

    # Step 2: clean
    cleaned = clean_text(text)

    # Step 4: chunk if large
    if query:
        cleaned = chunk_and_select(cleaned, query)

    # Step 3: LLMLingua compress
    compressed = compress_text(cleaned, target_ratio=target_ratio)

    compressed_chars = len(compressed)
    reduction = round((1 - compressed_chars / max(original_chars, 1)) * 100)

    return {
        "original_chars": original_chars,
        "compressed_chars": compressed_chars,
        "reduction_percent": max(0, reduction),
        "compressed_text": compressed,
    }
