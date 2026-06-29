import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import chat, upload, scrape, voice, optimize, cost, history

logger = logging.getLogger(__name__)


async def _warm_up_models():
    """Pre-load heavy ML models so first request is fast."""
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _load_lingua)
    except Exception as e:
        logger.warning(f"LLMLingua warmup skipped: {e}")


def _load_lingua():
    from processors.optimizer import _get_lingua
    _get_lingua()
    logger.info("LLMLingua model loaded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_warm_up_models())
    yield


app = FastAPI(title="MyMind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mymind-five.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(scrape.router)
app.include_router(voice.router)
app.include_router(optimize.router)
app.include_router(cost.router)
app.include_router(history.router)

@app.get("/")
async def root():
    return {"status": "ok", "service": "MyMind API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
