import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import StreakOut
from app.services.cheat_day import cheat_day_status

logger = structlog.get_logger()
router = APIRouter(prefix="/api/streak", tags=["streak"])


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        user = User(id=user_id, username=f"recovered_{user_id[:8]}", name="Recovered User", phase=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("/{user_id}", response_model=StreakOut)
async def get_streak(user_id: str, db: Session = Depends(get_db)) -> StreakOut:
    """Return the user's current streak and cheat-charm balance."""
    user = _user_or_404(db, user_id)
    status = cheat_day_status(user)
    logger.info(
        "streak_checked",
        user_id=user_id,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
    )
    return StreakOut(
        user_id=user_id,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_log_date=user.last_log_date,
        cheat_charms_available=status.cheat_charms_available,
        cheat_charms_used_this_week=status.cheat_charms_used_this_week,
        next_charm_available_on=status.next_charm_available_on,
    )
