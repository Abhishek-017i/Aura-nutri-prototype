"""Cheat-day mechanic: one relaxed day per rolling 7-day window.

A cheat day is intentionally simple: it records when the user last used the
relaxation and enforces a 7-day cooldown. No nutrient math changes in this
prototype; the flag is surfaced to the UI as a stateful affordance.
"""

from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import User
from app.schemas.cheat_day import CheatDayStatus

logger = structlog.get_logger()

_COOLDOWN_DAYS = 7


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _make_status(
    available: bool,
    used_at: datetime | None,
    remaining: timedelta,
) -> CheatDayStatus:
    return CheatDayStatus(
        available=available,
        used_at=used_at,
        cooldown_seconds=int(remaining.total_seconds()),
        days_remaining=round(remaining.total_seconds() / 86400.0, 2),
    )


def cheat_day_status(user: User, now: datetime | None = None) -> CheatDayStatus:
    """Return the current cheat-day availability for a user.

    Args:
        user: The user profile.
        now: Optional reference time (defaults to UTC now).

    Returns:
        A :class:`CheatDayStatus` model with availability and cooldown details.
    """
    reference = now or _now_utc()
    used_at = user.cheat_day_used_at

    if used_at is None:
        return _make_status(True, None, timedelta(seconds=0))

    # Ensure both datetimes are timezone-aware before subtraction.
    if used_at.tzinfo is None:
        used_at = used_at.replace(tzinfo=timezone.utc)

    elapsed = reference - used_at
    cooldown = timedelta(days=_COOLDOWN_DAYS)
    if elapsed >= cooldown:
        return _make_status(True, used_at, timedelta(seconds=0))

    return _make_status(False, used_at, cooldown - elapsed)


def use_cheat_day(
    db: Session,
    user: User,
    now: datetime | None = None,
) -> CheatDayStatus:
    """Mark a cheat day for the user if the cooldown has passed.

    Args:
        db: SQLAlchemy session.
        user: The user profile.
        now: Optional reference time (defaults to UTC now).

    Returns:
        Updated :class:`CheatDayStatus`.

    Raises:
        AppError: 429 if the cheat day is still on cooldown.
    """
    status = cheat_day_status(user, now)
    if not status.available:
        logger.warning(
            "cheat_day_denied",
            user_id=user.id,
            used_at=user.cheat_day_used_at.isoformat() if user.cheat_day_used_at else None,
            days_remaining=status.days_remaining,
        )
        raise AppError(
            "cheat_day_on_cooldown",
            f"Cheat day available in {status.days_remaining} days",
            status=429,
        )

    reference = now or _now_utc()
    user.cheat_day_used_at = reference
    db.commit()
    db.refresh(user)

    logger.info("cheat_day_used", user_id=user.id, used_at=reference.isoformat())
    return cheat_day_status(user, reference)
