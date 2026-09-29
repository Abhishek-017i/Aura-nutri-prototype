"""Audio transcription endpoint.

Wraps Groq Whisper for server-side speech-to-text. The language parameter is
intentionally omitted so Whisper auto-detects English, Hindi, and Hinglish
input instead of forcing a single language.
"""

import structlog
from fastapi import APIRouter, File, UploadFile

from app.errors import AppError
from app.schemas.parse import TranscribeOut
from app.services import groq_client

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["transcribe"])


@router.post("/transcribe", response_model=TranscribeOut)
async def transcribe_audio_endpoint(audio: UploadFile = File(...)) -> TranscribeOut:
    """Transcribe an uploaded audio file using Groq Whisper.

    Accepts common audio formats such as webm, mp3, mp4, wav, and m4a.
    Whisper auto-detects the spoken language; no language is forced.
    """
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise AppError(
            "invalid_audio",
            "Uploaded file must be an audio file.",
            status=415,
        )

    try:
        audio_bytes = await audio.read()
    except Exception as exc:
        logger.error("audio_read_failed", filename=audio.filename, error=str(exc))
        raise AppError(
            "audio_read_failed",
            "Could not read the uploaded audio file.",
            status=400,
        ) from exc

    if not audio_bytes:
        raise AppError("empty_audio", "Audio file is empty.", status=400)

    filename = audio.filename or "audio.webm"
    transcript = await groq_client.transcribe_audio(audio_bytes, filename=filename)

    logger.info("audio_transcribed", filename=filename, transcript=transcript)
    return TranscribeOut(transcript=transcript)
