import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import CheatDayStatus
from app.services.cheat_day import cheat_day_status, use_cheat_day

logger = structlog.get_logger()
router = APIRouter(prefix="/api/cheat-day", tags=["cheat-day"])


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        user = User(id=user_id, username=f"recovered_{user_id[:8]}", name="Recovered User", phase=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("/{user_id}", response_model=CheatDayStatus)
async def get_cheat_day_status(
    user_id: str,
    db: Session = Depends(get_db),
) -> CheatDayStatus:
    """Check the user's cheat-charm balance and cooldown."""
    user = _user_or_404(db, user_id)
    return cheat_day_status(user)


@router.post("/use/{user_id}", response_model=CheatDayStatus)
async def post_use_cheat_day(
    user_id: str,
    db: Session = Depends(get_db),
) -> CheatDayStatus:
    """Consume one cheat charm to preserve a streak across a skipped day."""
    user = _user_or_404(db, user_id)
    return use_cheat_day(db, user)


# Backwards-compatible alias kept for existing clients.
@router.post("/{user_id}", response_model=CheatDayStatus)
async def post_use_cheat_day_alias(
    user_id: str,
    db: Session = Depends(get_db),
) -> CheatDayStatus:
    """Deprecated alias for consuming a cheat charm."""
    user = _user_or_404(db, user_id)
    return use_cheat_day(db, user)
