"""Gemini client wrapper using google-genai SDK."""

import asyncio
import json
import re
from typing import Any

import structlog
from google import genai
from google.genai import errors as genai_errors

from app.config import settings
from app.errors import AppError
from app.schemas.parse import LlmParsedMeal

logger = structlog.get_logger()

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    global _client
    if not settings.gemini_api_key:
        raise AppError(code="gemini_not_configured", message="Gemini API key is not configured.", status=503)
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _strip_json_markdown(content: str) -> str:
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
    raw = _strip_json_markdown(content)
    try:
        parsed = LlmParsedMeal.model_validate_json(raw)
    except Exception as exc:
        logger.warning("gemini_parse_validation_failed", content=content, error=str(exc))
        raise AppError(
            "gemini_parse_validation_failed",
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


async def parse_meal_text_gemini(
    text: str,
    food_catalog_hint: str = "",
) -> list[dict[str, Any]]:
    """Parse meal description using Gemini."""
    client = get_gemini_client()
    system_instruction = (
        "You are a precise Indian meal parser. The user describes a meal in English, "
        "Hindi, or Hinglish. Extract each distinct food item and return ONLY a JSON "
        "object with an 'items' array. Each item must have 'food' (short normalized "
        "food name) and 'quantity' (e.g. '1 katori', '2 roti', '1 glass', '150g'). "
        "Optional 'meal' field may be 'breakfast', 'lunch', 'dinner', or 'snack'. "
        "Use standard Indian household units: roti, chapati, paratha, katori, bowl, "
        "plate, glass, cup, piece, slice, egg. Prefer cooked/preparation names where "
        "relevant. If quantity is unclear, assume '1 serving'. Do not add markdown, "
        "explanations, or code fences. Return valid JSON only."
    )
    if food_catalog_hint:
        system_instruction += f"\n\nWhen possible, map to these foods:\n{food_catalog_hint}"

    def _call() -> Any:
        return client.models.generate_content(
            model="gemini-3.8-flash",
            contents=text,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )

    try:
        response: Any = await asyncio.to_thread(_call)
    except Exception as exc:
        err_str = str(exc)
        logger.error("gemini_generate_error", error=err_str)
        if "429" in err_str or "ResourceExhausted" in err_str:
            raise AppError("gemini_rate_limited", "Gemini quota exhausted.", status=429) from exc
        raise AppError("gemini_parse_failed", f"Gemini error: {err_str}", status=502) from exc

    text_resp = getattr(response, "text", "") or ""
    return _parse_json_items(text_resp)


async def chat_completion_gemini(
    messages: list[dict[str, str]],
    system_prompt: str,
) -> str:
    """Send chat messages to Gemini."""
    client = get_gemini_client()

    contents: list[str] = []
    for m in messages:
        contents.append(f"{m.get('role', 'user')}: {m.get('content', '')}")
    prompt_text = "\n".join(contents)

    def _call() -> Any:
        return client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt_text,
            config={
                "system_instruction": system_prompt,
                "temperature": 0.4,
            },
        )

    try:
        response: Any = await asyncio.to_thread(_call)
    except Exception as exc:
        err_str = str(exc)
        logger.error("gemini_chat_error", error=err_str)
        if "429" in err_str or "ResourceExhausted" in err_str:
            raise AppError("gemini_rate_limited", "Gemini quota exhausted.", status=429) from exc
        raise AppError("gemini_chat_failed", f"Gemini error: {err_str}", status=502) from exc

    text_resp = getattr(response, "text", "") or ""
    return text_resp.strip()
