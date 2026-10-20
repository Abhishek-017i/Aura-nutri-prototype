from typing import Any

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.errors import AppError
from app.schemas.chat import ChatMessage, ChatOut
from app.services.firestore_client import get_firestore_client
from app.services.groq_client import chat_completion

logger = structlog.get_logger()
router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatIn(BaseModel):
    user_id: str | None = None
    messages: list[ChatMessage] = Field(..., min_length=1)


def _build_system_prompt(user_data: dict[str, Any]) -> str:
    name = user_data.get("name", "User")
    phase = user_data.get("phase", "general")
    iron = user_data.get("target_iron_mg", 18.0)
    calcium = user_data.get("target_calcium_mg", 1000.0)
    vit_d = user_data.get("target_vit_d_iu", 600.0)
    b12 = user_data.get("target_b12_mcg", 2.4)

    return (
        "You are AURA-Nutri, a calm Indian nutrition assistant. "
        "Respond in plain conversational English only. "
        "Do not start with greetings such as 'Hi', 'Hello', 'Namaste', or the user's name. "
        "Answer directly, clearly, and supportively. "
        "Never use markdown tables, code blocks, raw JSON, or bullet lists. "
        "Never prescribe supplements, dosages, or diagnose conditions. "
        "If the user reports a medical concern, tell them to consult a qualified "
        "physician or registered dietitian.\n"
        f"User context: name={name}, phase={phase}, "
        f"daily targets: iron={iron}mg, "
        f"calcium={calcium}mg, "
        f"vitamin D={vit_d}IU, "
        f"B12={b12}mcg."
    )


@router.post("", response_model=ChatOut)
async def post_chat(payload: ChatIn, request: Request) -> ChatOut:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_snap = db.collection("users").document(uid).get()
    user_data = user_snap.to_dict() or {} if user_snap.exists else {}

    messages = [{"role": msg.role, "content": msg.content} for msg in payload.messages]
    system_prompt = _build_system_prompt(user_data)
    from app.services.language_fallback import chat_with_fallback

    reply, provider = await chat_with_fallback(messages, system_prompt=system_prompt)

    logger.info("chat_reply_sent", user_id=uid, reply_length=len(reply), provider=provider)
    return ChatOut(reply=reply, llm_provider=provider)
