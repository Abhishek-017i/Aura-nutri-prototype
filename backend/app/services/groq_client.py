"""Groq client wrapper with token-bucket rate limiting.

All production Groq calls (STT, parsing, chat) should go through this module so
that free-tier quotas are not exhausted during the demo.
"""

import asyncio
from typing import Any

import structlog
from groq import Groq

from app.config import settings
from app.errors import AppError
from app.services.rate_limiter import groq_bucket

logger = structlog.get_logger()

_CHAT_SYSTEM_PROMPT = (
    "You are AURA-Nutri, a warm, bilingual Indian nutrition assistant. "
    "Answer in English or Hinglish based on the user's language. "
    "Be concise, supportive, and never prescribe supplements or dosages. "
    "If the user reports a medical concern, tell them to consult a qualified "
    "physician or registered dietitian."
)


def _get_client() -> Groq:
    if not settings.groq_api_key:
        raise AppError(
            "groq_key_missing",
            "Groq API key is not configured.",
            status=503,
        )
    try:
        return Groq(api_key=settings.groq_api_key)
    except TypeError as exc:
        logger.error("groq_client_init_failed", error=str(exc))
        raise AppError(
            "groq_client_init_failed",
            "Groq client could not be initialised.",
            status=503,
        ) from exc


def _validate_chat_output(content: str) -> str:
    """Validate and sanitize a chat completion response."""
    if not isinstance(content, str):
        raise AppError("groq_invalid_response", "Invalid response from chat model", status=502)
    stripped = content.strip()
    if not stripped:
        raise AppError("groq_empty_response", "Chat model returned an empty response", status=502)
    return stripped


def _chat_sync(
    client: Groq,
    messages: Any,
    model: str,
    max_tokens: int,
    temperature: float,
) -> Any:
    return client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )


async def chat_completion(
    messages: list[dict[str, str]],
    model: str = "openai/gpt-oss-120b",
    max_tokens: int = 512,
    temperature: float = 0.4,
) -> str:
    """Send a chat completion request to Groq with rate-limit guard.

    Args:
        messages: OpenAI-style message list.
        model: Groq model ID.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature.

    Returns:
        The validated response content string.

    Raises:
        AppError: If rate-limited, key missing, or the response fails validation.
    """
    allowed, wait_seconds = groq_bucket.consume()
    if not allowed:
        logger.warning("groq_rate_limit_exceeded", model=model, wait_seconds=wait_seconds)
        raise AppError(
            "groq_rate_limited",
            f"Groq rate limit reached. Retry after {int(wait_seconds)} seconds.",
            status=429,
        )

    client = _get_client()
    logger.info(
        "groq_chat_request",
        model=model,
        message_count=len(messages),
        max_tokens=max_tokens,
    )

    try:
        response: Any = await asyncio.to_thread(
            _chat_sync,
            client,
            messages,
            model,
            max_tokens,
            temperature,
        )
    except Exception as exc:
        logger.error("groq_chat_error", error=str(exc), model=model)
        raise AppError(
            "groq_request_failed",
            "Chat assistant is temporarily unavailable. Please try again.",
            status=503,
        ) from exc

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError) as exc:
        logger.error("groq_malformed_response", response=str(response))
        raise AppError(
            "groq_malformed_response",
            "Unexpected response format from chat model.",
            status=502,
        ) from exc

    validated = _validate_chat_output(content)
    logger.info(
        "groq_chat_response",
        model=model,
        response_length=len(validated),
    )
    return validated


def _transcribe_sync(client: Groq, audio_bytes: bytes, filename: str) -> Any:
    return client.audio.transcriptions.create(
        file=(filename, audio_bytes),
        model="whisper-large-v3",
        response_format="text",
    )


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes with Groq Whisper.

    Args:
        audio_bytes: Raw audio file bytes.
        filename: Filename to send to the API.

    Returns:
        Transcribed text.
    """
    allowed, wait_seconds = groq_bucket.consume()
    if not allowed:
        raise AppError(
            "groq_rate_limited",
            f"Groq rate limit reached. Retry after {int(wait_seconds)} seconds.",
            status=429,
        )

    client = _get_client()
    logger.info("groq_transcribe_request", filename=filename, size_bytes=len(audio_bytes))

    try:
        response: Any = await asyncio.to_thread(
            _transcribe_sync,
            client,
            audio_bytes,
            filename,
        )
    except Exception as exc:
        logger.error("groq_transcribe_error", error=str(exc))
        raise AppError(
            "groq_transcribe_failed",
            "Voice transcription failed. Please type your meal instead.",
            status=503,
        ) from exc

    transcript = str(response).strip()
    if not transcript:
        raise AppError("groq_empty_transcript", "Transcription returned empty.", status=502)
    logger.info("groq_transcribe_response", transcript=transcript)
    return transcript
