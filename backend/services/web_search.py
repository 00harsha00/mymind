from duckduckgo_search import DDGS


def search_web(query: str, max_results: int = 4) -> str:
    """Run a DuckDuckGo search and return formatted results."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return ""
        lines = ["[Web search results]"]
        for i, r in enumerate(results, 1):
            title = r.get("title", "")
            body = r.get("body", "")[:300]
            href = r.get("href", "")
            lines.append(f"{i}. **{title}**\n   {body}\n   Source: {href}")
        lines.append("[End of web search results]\n")
        return "\n\n".join(lines)
    except Exception:
        return ""
