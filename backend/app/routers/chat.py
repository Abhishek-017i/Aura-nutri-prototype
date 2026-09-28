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


@router.post("", response_model=ChatOut)
async def post_chat(payload: ChatIn, db: Session = Depends(get_db)) -> ChatOut:
    """Get a grounded nutrition assistant reply from Groq.

    Falls back to a deterministic, safe response if the Groq key is missing
    or the upstream service is unavailable.
    """
    user = _user_or_404(db, payload.user_id)
    messages = [{"role": msg.role, "content": msg.content} for msg in payload.messages]

    try:
        reply = await chat_completion(messages)
    except AppError as exc:
        if exc.code in ("groq_key_missing", "groq_client_init_failed"):
            logger.warning("chat_groq_unavailable", user_id=user.id, code=exc.code)
            reply = (
                "Assistant abhi configure nahi hai. Aap apna meal text box mein "
                "type karke log kar sakte hain."
            )
        else:
            raise

    logger.info("chat_reply_sent", user_id=user.id, reply_length=len(reply))
    return ChatOut(reply=reply)
