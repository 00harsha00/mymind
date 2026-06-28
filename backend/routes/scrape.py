from fastapi import APIRouter
from pydantic import BaseModel
from processors.youtube_processor import is_youtube_url, process_youtube
from processors.url_processor import process_url

router = APIRouter()


class ScrapeRequest(BaseModel):
    url: str


@router.post("/scrape")
async def scrape_url(body: ScrapeRequest):
    try:
        url = str(body.url).strip()
        if is_youtube_url(url):
            return process_youtube(url)
        else:
            return process_url(url)
    except ValueError as e:
        return {"success": False, "error": str(e), "url": str(body.url)}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}", "url": str(body.url)}
