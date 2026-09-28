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
        raise AppError("user_not_found", "User not found", status=404)
    return user


@router.get("/{user_id}", response_model=CheatDayStatus)
async def get_cheat_day_status(
    user_id: str,
    db: Session = Depends(get_db),
) -> CheatDayStatus:
    """Check whether the user can use a cheat day right now."""
    user = _user_or_404(db, user_id)
    status = cheat_day_status(user)
    logger.info("cheat_day_status_checked", user_id=user_id, available=status.available)
    return status


@router.post("/{user_id}", response_model=CheatDayStatus)
async def post_use_cheat_day(
    user_id: str,
    db: Session = Depends(get_db),
) -> CheatDayStatus:
    """Use the user's one cheat day for the current 7-day window."""
    user = _user_or_404(db, user_id)
    return use_cheat_day(db, user)
