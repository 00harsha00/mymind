import re
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})",
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None


def is_youtube_url(url: str) -> bool:
    return bool(extract_video_id(url))


def process_youtube(url: str) -> dict:
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Could not extract YouTube video ID from URL.")

    try:
        # v1.x API: fetch() is an instance method, try multiple languages
        api = YouTubeTranscriptApi()
        try:
            fetched = api.fetch(video_id)
        except Exception:
            fetched = api.fetch(video_id, languages=["en", "en-US", "en-GB"])
        transcript_list = list(fetched)
    except TranscriptsDisabled:
        raise ValueError("Transcripts are disabled for this YouTube video.")
    except NoTranscriptFound:
        raise ValueError("No transcript found for this YouTube video.")
    except Exception as e:
        raise ValueError(f"Failed to fetch transcript: {str(e)}")

    full_text = " ".join(entry.text for entry in transcript_list)
    full_text = full_text.strip()

    title = f"YouTube video ({video_id})"

    return {
        "success": True,
        "url": url,
        "type": "youtube",
        "title": title,
        "content": full_text,
        "char_count": len(full_text),
        "estimated_tokens": len(full_text) // 4,
    }
