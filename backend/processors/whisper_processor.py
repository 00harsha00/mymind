import shutil

_model = None


def check_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise RuntimeError(
            "ffmpeg is not installed on this server. "
            "Voice transcription is unavailable."
        )
    return path


def _get_model():
    global _model
    if _model is None:
        check_ffmpeg()
        from faster_whisper import WhisperModel
        # Run on CPU with int8 quantization — fast enough for Railway
        _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe(audio_path: str) -> str:
    """
    Transcribe audio at `audio_path` using faster-whisper.
    Returns the full transcript string.
    Raises RuntimeError with a user-friendly message on failure.
    """
    check_ffmpeg()
    model = _get_model()
    segments, _ = model.transcribe(audio_path, beam_size=5)
    text = " ".join(seg.text for seg in segments).strip()
    return text
