"""Groq client wrapper with token-bucket rate limiting.

All production Groq calls (STT, parsing, chat) should go through this module so
that free-tier quotas are not exhausted during the demo.
"""

import asyncio
from typing import Any

import httpx
import structlog
from groq import Groq

from app.config import settings
from app.errors import AppError
from app.schemas.parse import LlmParsedMeal
from app.services.rate_limiter import groq_bucket

logger = structlog.get_logger()

_CHAT_SYSTEM_PROMPT = (
    "You are AURA-Nutri, a calm Indian nutrition assistant. "
    "Respond in plain conversational English only. "
    "Do not start with greetings such as 'Hi', 'Hello', 'Namaste', or the user's name. "
    "Answer directly, clearly, and supportively. "
    "Never use markdown tables, code blocks, raw JSON, or bullet lists. "
    "Never prescribe supplements, dosages, or diagnose conditions. "
    "If the user reports a medical concern, tell them to consult a qualified "
    "physician or registered dietitian."
)

_PARSE_SYSTEM_PROMPT = (
    "You are a precise Indian meal parser. The user describes a meal in English, "
    "Hindi, or Hinglish. Extract each distinct food item and return ONLY a JSON "
    "object with an 'items' array. Each item must have 'food' (short normalized "
    "food name) and 'quantity' (e.g. '1 katori', '2 roti', '1 glass', '150g'). "
    "Optional 'meal' field may be 'breakfast', 'lunch', 'dinner', or 'snack'. "
    "Use standard Indian household units: roti, chapati, paratha, katori, bowl, "
    "plate, glass, cup, piece, slice, egg. Prefer cooked/preparation names where "
    "relevant (e.g. 'dal', 'rice', 'doodh' -> milk). If quantity is unclear, "
    "assume '1 serving'. Do not add markdown, explanations, or code fences. "
    "Return valid JSON only."
)

_PARSE_RETRY_PROMPT = (
    "Your previous response was not valid JSON or did not match the required "
    'schema. Return ONLY a JSON object: {"items":[{"food":"...","quantity":"..."}]}. '
    "No other text."
)

# Shared httpx client avoids the Groq SDK's default client, which is incompatible
# with httpx >= 0.28 because it passes the deprecated ``proxies`` argument.
_HTTP_CLIENT = httpx.Client(timeout=60.0)


def _get_client() -> Groq:
    if not settings.groq_api_key:
        raise AppError(
            "groq_key_missing",
            "Groq API key is not configured.",
            status=503,
        )
    try:
        return Groq(api_key=settings.groq_api_key, http_client=_HTTP_CLIENT)
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


def _strip_json_markdown(content: str) -> str:
    """Remove markdown code fences from a JSON response."""
    stripped = content.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()
    return stripped


def _parse_json_items(content: str) -> list[dict[str, Any]]:
    """Validate and extract items from an LLM parse response.

    Returns the items list if the response matches the expected schema, or
    raises :class:`AppError` otherwise.
    """
    raw = _strip_json_markdown(content)
    try:
        parsed = LlmParsedMeal.model_validate_json(raw)
    except Exception as exc:
        logger.warning("parse_response_validation_failed", content=content, error=str(exc))
        raise AppError(
            "groq_parse_validation_failed",
            "Meal parse response did not match the required schema.",
            status=502,
        ) from exc

    items: list[dict[str, Any]] = []
    for item in parsed.items:
        items.append({
            "food": item.food.strip(),
            "quantity": item.quantity.strip(),
            "meal": item.meal.strip() if item.meal else None,
        })
    return items


def _parse_sync(
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
        response_format={"type": "json_object"},
    )


async def parse_meal_text(
    text: str,
    system_prompt: str | None = None,
) -> list[dict[str, Any]]:
    """Ask the LLM to extract structured food items from free-form meal text.

    Consumes one token from the shared Groq bucket. Validates the response
    against :class:`LlmParsedMeal` and retries once with a stricter prompt on
    validation failure.

    Args:
        text: Raw meal description in English, Hindi, or Hinglish.
        system_prompt: Optional system prompt. Defaults to the parser system
            prompt.

    Returns:
        A list of parsed item dictionaries with ``food``, ``quantity`` and
        optional ``meal`` keys.

    Raises:
        AppError: If rate-limited, the key is missing, or parsing fails twice.
    """
    allowed, wait_seconds = groq_bucket.consume()
    if not allowed:
        logger.warning("groq_rate_limit_exceeded", model="openai/gpt-oss-20b", wait_seconds=wait_seconds)
        raise AppError(
            "groq_rate_limited",
            f"Groq rate limit reached. Retry after {int(wait_seconds)} seconds.",
            status=429,
        )

    client = _get_client()
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt or _PARSE_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]
    logger.info("groq_parse_request", text=text)

    try:
        response: Any = await asyncio.to_thread(
            _parse_sync,
            client,
            messages,
            "openai/gpt-oss-20b",
            512,
            0.2,
        )
    except Exception as exc:
        logger.error("groq_parse_error", error=str(exc), text=text)
        raise AppError(
            "groq_parse_failed",
            "Meal parsing failed. Please rephrase or type your meal.",
            status=503,
        ) from exc

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError) as exc:
        logger.error("groq_malformed_response", response=str(response))
        raise AppError(
            "groq_malformed_response",
            "Unexpected response format from parse model.",
            status=502,
        ) from exc

    try:
        return _parse_json_items(content)
    except AppError:
        logger.warning("groq_parse_retry", text=text)

    messages.append({"role": "assistant", "content": content})
    messages.append({"role": "system", "content": _PARSE_RETRY_PROMPT})

    try:
        response = await asyncio.to_thread(
            _parse_sync,
            client,
            messages,
            "openai/gpt-oss-20b",
            512,
            0.2,
        )
    except Exception as exc:
        logger.error("groq_parse_retry_error", error=str(exc), text=text)
        raise AppError(
            "groq_parse_failed",
            "Meal parsing failed. Please rephrase or type your meal.",
            status=503,
        ) from exc

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError) as exc:
        logger.error("groq_malformed_response_retry", response=str(response))
        raise AppError(
            "groq_malformed_response",
            "Unexpected response format from parse model.",
            status=502,
        ) from exc

    return _parse_json_items(content)


async def chat_completion(
    messages: list[dict[str, str]],
    system_prompt: str | None = None,
    model: str = "openai/gpt-oss-120b",
    max_tokens: int = 512,
    temperature: float = 0.4,
) -> str:
    """Send a chat completion request to Groq with rate-limit guard.

    Args:
        messages: OpenAI-style message list.
        system_prompt: Optional system prompt. Defaults to the AURA assistant
            system prompt.
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
    full_messages = [
        {"role": "system", "content": system_prompt or _CHAT_SYSTEM_PROMPT},
        *messages,
    ]
    logger.info(
        "groq_chat_request",
        model=model,
        message_count=len(full_messages),
        max_tokens=max_tokens,
    )

    try:
        response: Any = await asyncio.to_thread(
            _chat_sync,
            client,
            full_messages,
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
    # Intentionally omit the `language` parameter so Whisper auto-detects
    # English, Hindi, and Hinglish rather than forcing a single language.
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
