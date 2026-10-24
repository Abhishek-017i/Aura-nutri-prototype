from typing import Any
import structlog
from app.services.groq_client import parse_meal_text, chat_completion
from app.services.gemini_client import parse_meal_text_gemini, chat_completion_gemini
from app.errors import AppError

logger = structlog.get_logger()

async def parse_with_fallback(text: str, catalog_hint: str | None = None) -> tuple[list[dict[str, Any]], str]:
    """Groq is primary. Gemini is the emergency fallback."""
    try:
        # 1. Try Groq first (Rotation handles the 4 keys)
        logger.info("attempting_groq_parse_primary", text=text)
        result = await parse_meal_text(text)
        return result, "groq"
    except Exception as e:
        logger.warning("groq_parse_failed_falling_back_to_gemini", error=str(e))
        try:
            # 2. Try Gemini only if Groq completely dies
            result = await parse_meal_text_gemini(text, food_catalog_hint=catalog_hint or "")
            return result, "gemini"
        except Exception as gemini_err:
            logger.error("all_llms_failed", groq_error=str(e), gemini_error=str(gemini_err))
            raise AppError(
                code="all_llms_failed",
                message="Please type your meal or try again in a minute.",
                status=503
            )

async def chat_with_fallback(messages: list[dict[str, str]], system_prompt: str) -> tuple[str, str]:
    """Groq is primary. Gemini is the emergency fallback."""
    try:
        # 1. Try Groq
        result = await chat_completion(messages, system_prompt)
        return result, "groq"
    except Exception as e:
        logger.warning("groq_chat_failed_falling_back_to_gemini", error=str(e))
        try:
            # 2. Try Gemini
            result = await chat_completion_gemini(messages, system_prompt)
            return result, "gemini"
        except Exception as gemini_err:
            logger.error("all_chat_llms_failed", groq_error=str(e), gemini_error=str(gemini_err))
            raise AppError(
                code="all_llms_failed",
                message="Chat is currently unavailable. Please try again later.",
                status=503
            )