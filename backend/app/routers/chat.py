import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import ChatIn, ChatOut
from app.services.groq_client import chat_completion

logger = structlog.get_logger()
router = APIRouter(prefix="/api/chat", tags=["chat"])


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    return user


def _build_system_prompt(user: User) -> str:
    return (
        "You are AURA-Nutri, a calm Indian nutrition assistant. "
        "Respond in plain conversational English only. "
        "Do not start with greetings such as 'Hi', 'Hello', 'Namaste', or the user's name. "
        "Answer directly, clearly, and supportively. "
        "Never use markdown tables, code blocks, raw JSON, or bullet lists. "
        "Never prescribe supplements, dosages, or diagnose conditions. "
        "If the user reports a medical concern, tell them to consult a qualified "
        "physician or registered dietitian.\n"
        f"User context: phase={user.phase}, "
        f"daily targets: iron={user.target_iron_mg}mg, "
        f"calcium={user.target_calcium_mg}mg, "
        f"vitamin D={user.target_vit_d_iu}IU, "
        f"B12={user.target_b12_mcg}mcg."
    )


@router.post("", response_model=ChatOut)
async def post_chat(payload: ChatIn, db: Session = Depends(get_db)) -> ChatOut:
    """Get a grounded nutrition assistant reply from Groq.

    Uses the shared Groq client wrapper and token-bucket rate limiter. Errors
    from the upstream service are returned through the global exception handler.
    """
    user = _user_or_404(db, payload.user_id)
    messages = [{"role": msg.role, "content": msg.content} for msg in payload.messages]

    system_prompt = _build_system_prompt(user)
    reply = await chat_completion(messages, system_prompt=system_prompt)

    logger.info("chat_reply_sent", user_id=user.id, reply_length=len(reply))
    return ChatOut(reply=reply)
