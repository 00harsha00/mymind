import os
import time
import tempfile
from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/voice")
async def transcribe_voice(audio: UploadFile = File(...)):
    try:
        content = await audio.read()
        suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            from processors.whisper_processor import transcribe
            start = time.time()
            transcript = transcribe(tmp_path)
            duration = round(time.time() - start, 2)
        finally:
            os.unlink(tmp_path)

        if not transcript:
            return {"success": False, "error": "No speech detected in audio."}

        return {"success": True, "transcript": transcript, "duration_seconds": duration}

    except RuntimeError as e:
        # ffmpeg missing or model load failure — user-readable
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Transcription failed: {str(e)}"}
