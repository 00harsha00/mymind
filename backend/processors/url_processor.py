import trafilatura
import urllib.request
from urllib.error import URLError


def process_url(url: str) -> dict:
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            raise ValueError("Could not fetch the URL. The site may be blocking scrapers.")

        result = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=True,
            output_format="txt",
            with_metadata=True,
        )
        if not result:
            raise ValueError("Could not extract readable content from this page.")

        # trafilatura returns plain text
        content = result.strip()

        # Try to get title via metadata
        meta = trafilatura.extract(downloaded, output_format="json", with_metadata=True)
        title = url
        if meta:
            import json
            try:
                m = json.loads(meta)
                title = m.get("title") or url
            except Exception:
                pass

        return {
            "success": True,
            "url": url,
            "type": "webpage",
            "title": title,
            "content": content,
            "char_count": len(content),
            "estimated_tokens": len(content) // 4,
        }
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to scrape URL: {str(e)}")
