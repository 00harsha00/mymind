import os
import time
import tempfile
from fastapi import APIRouter, UploadFile, File

router = APIRouter()

_model = None

def _get_model():
    global _model
    if _model is None:
        import whisper
        _model = whisper.load_model("base")
    return _model


@router.post("/voice")
async def transcribe_voice(audio: UploadFile = File(...)):
    try:
        content = await audio.read()
        suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            model = _get_model()
            start = time.time()
            result = model.transcribe(tmp_path, fp16=False)
            duration = time.time() - start
        finally:
            os.unlink(tmp_path)

        transcript = result["text"].strip()
        if not transcript:
            return {"success": False, "error": "No speech detected in audio."}

        return {
            "success": True,
            "transcript": transcript,
            "duration_seconds": round(duration, 2),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
