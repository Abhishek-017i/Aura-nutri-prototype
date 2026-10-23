"""Groq client wrapper with multi-key rotation and token-bucket rate limiting.

All production Groq calls (STT, parsing, chat) should go through this module so
that free-tier quotas are rotated and handled gracefully.
"""

import asyncio
import json
from typing import Any, Callable, TypeVar

import groq
import httpx
import structlog
from groq import Groq

from app.config import settings
from app.errors import AppError
from app.schemas.parse import LlmParsedMeal
from app.services.rate_limiter import KeyedRateLimiter

logger = structlog.get_logger()

T = TypeVar("T")

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
    "CRITICAL LANGUAGE LOCK: You MUST output the 'food' field using ONLY standard "
    "English letters (Latin alphabet, a-z, A-Z, 0-9, spaces). "
    "You are STRICTLY FORBIDDEN from using Devanagari, Urdu, Arabic, Cyrillic, "
    "Japanese, or ANY non-Latin script. If you use a non-Latin script, the "
    "application will CRASH. "
    "You MUST transliterate or translate the food name into English. "
    "Example: If the user says 'सब्ज़ी' or 'سبزی', you MUST output 'sabzi'. "
    "If the user says 'अफगानी चिकन', you MUST output 'afghani chicken'. "
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

_clients: dict[str, Groq] = {}
_limiter: KeyedRateLimiter | None = None


def _init_clients() -> None:
    global _clients, _limiter
    keys = settings.groq_api_keys
    if not keys:
        raise RuntimeError("No Groq API keys configured")
    _clients = {
        k: Groq(api_key=k, http_client=_HTTP_CLIENT)
        for k in keys
    }
    _limiter = KeyedRateLimiter(
        keys=keys,
        capacity=settings.groq_rate_limit_rpm,
        refill_per_minute=float(settings.groq_rate_limit_rpm),
    )


def get_limiter() -> KeyedRateLimiter:
    global _limiter
    if _limiter is None:
        _init_clients()
    if _limiter is None:
        raise RuntimeError("No Groq API keys configured")
    return _limiter


def _execute_with_rotation(fn: Callable[[Groq], T], max_attempts: int | None = None) -> T:
    global _clients, _limiter
    if not _clients or _limiter is None:
        try:
            _init_clients()
        except Exception as exc:
            logger.error("groq_init_failed", error=str(exc))
            raise AppError(
                "groq_key_missing",
                "Groq API key is not configured.",
                status=503,
            ) from exc

    assert _limiter is not None
    attempts_limit = min(max_attempts or len(_clients) * 2, 6)

    for attempt in range(attempts_limit):
        key = _limiter.acquire()
        if key is None:
            raise AppError(
                code="groq_exhausted",
                message="All Groq keys are rate-limited. Please retry in a minute.",
                status=429,
            )

        client = _clients[key]
        try:
            res = fn(client)
            _limiter.mark_success(key)
            return res
        except groq.RateLimitError as exc:
            logger.warning("groq_rate_limit_hit", key_index=settings.groq_api_keys.index(key) if key in settings.groq_api_keys else -1)
            _limiter.mark_failed(key, 60.0)
            continue
        except groq.APIStatusError as exc:
            if exc.status_code == 401 or exc.status_code >= 500:
                logger.warning("groq_api_error_failing_key", status=exc.status_code, key_index=settings.groq_api_keys.index(key) if key in settings.groq_api_keys else -1)
                _limiter.mark_failed(key, 30.0)
                continue
            raise
        except Exception:
            raise

    raise AppError(
        code="groq_exhausted",
        message="All Groq keys failed or rate-limited. Please retry in a minute.",
        status=429,
    )


def _validate_chat_output(content: str) -> str:
    """Validate and sanitize a chat completion response."""
    if not isinstance(content, str):
        raise AppError("groq_invalid_response", "Invalid response from chat model", status=502)
    stripped = content.strip()
    if not stripped:
        raise AppError("groq_empty_response", "Chat model returned an empty response", status=502)
    return stripped


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
    """Validate and extract items from an LLM parse response."""
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


async def parse_meal_text(
    text: str,
    system_prompt: str | None = None,
) -> list[dict[str, Any]]:
    """Ask the LLM to extract structured food items from free-form meal text with key rotation."""
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt or _PARSE_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]
    logger.info("groq_parse_request", text=text)

    def _call(client: Groq) -> Any:
        return client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,  # type: ignore[arg-type]
            max_tokens=512,
            temperature=0.2,
            response_format={"type": "json_object"},
        )

    try:
        response: Any = await asyncio.to_thread(_execute_with_rotation, _call)
    except Exception as exc:
        logger.error("groq_parse_error", error=str(exc), text=text)
        if isinstance(exc, AppError):
            raise
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
        response = await asyncio.to_thread(_execute_with_rotation, _call)
    except Exception as exc:
        logger.error("groq_parse_retry_error", error=str(exc), text=text)
        if isinstance(exc, AppError):
            raise
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
    """Send a chat completion request to Groq with rate-limit guard and rotation."""
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

    def _call(client: Groq) -> Any:
        return client.chat.completions.create(
            model=model,
            messages=full_messages,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            temperature=temperature,
        )

    try:
        response: Any = await asyncio.to_thread(_execute_with_rotation, _call)
    except Exception as exc:
        logger.error("groq_chat_error", error=str(exc), model=model)
        if isinstance(exc, AppError):
            raise
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


_TRANSLATE_SYSTEM_PROMPT = (
    "You are a food-name translator. The user will give you one or more food "
    "names written in any script (Devanagari, Urdu, Cyrillic, Japanese, etc.). "
    "Translate each to standard English romanized spelling as used in Indian "
    "food databases (e.g. सब्ज़ी -> sabzi, سبزی -> sabzi, दाल -> dal, "
    "रोटी -> roti, अफगानी चिकन -> afghani chicken). "
    "Output ONLY a JSON object: {\"translations\": [\"word1\", \"word2\"]} "
    "in the same order as input. Lowercase only. No explanation, no punctuation."
)


async def translate_food_names(names: list[str]) -> list[str]:
    """Translate non-ASCII food names to English romanized form via LLM.

    Falls back to returning the input unchanged if translation fails.
    """
    if not names:
        return []
    user_message = "Translate these food names to English and return JSON: " + ", ".join(names)

    def _call(client: Groq) -> Any:
        return client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": _TRANSLATE_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=200,
            temperature=0.0,
            response_format={"type": "json_object"},
        )

    try:
        response: Any = await asyncio.to_thread(_execute_with_rotation, _call)
        content = response.choices[0].message.content
        stripped = _strip_json_markdown(content)
        parsed = json.loads(stripped)
        translated = parsed.get("translations", [])
        if len(translated) != len(names):
            logger.warning("translate_count_mismatch", in_count=len(names),
                           out_count=len(translated))
            return names  # fallback to original
        return [str(t).strip().lower() for t in translated]
    except Exception as exc:
        logger.warning("translate_food_names_failed", error=str(exc), names=names)
        return names  # fallback to original


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """Transcribe audio bytes with Groq Whisper and rotation."""
    logger.info("groq_transcribe_request", filename=filename, size_bytes=len(audio_bytes))

    def _call(client: Groq) -> Any:
        return client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3",
            response_format="text",
            language="en",
            prompt="Indian meal transcript in Hinglish Latin letters: dal, roti, sabzi, chawal, paneer, chicken, egg, paratha",
        )

    try:
        response: Any = await asyncio.to_thread(_execute_with_rotation, _call)
    except Exception as exc:
        logger.error("groq_transcribe_error", error=str(exc))
        if isinstance(exc, AppError):
            raise
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
