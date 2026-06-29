from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes import chat, upload, scrape, voice, optimize, cost, history

app = FastAPI(title="MyMind API", version="1.0.0")

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
