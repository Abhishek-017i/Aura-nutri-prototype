"""Deprecated: migrated to Firestore in 4.0.4.
Cheat-day mechanic: one cheat charm per rolling 7-day window.

Streak-preserving cheat days are tracked as integer charms. The service is
deterministic and contains no LLM involvement.
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


def _ensure_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _next_available_on(used_at: datetime | None) -> datetime | None:
    if used_at is None:
        return None
    aware = used_at.replace(tzinfo=timezone.utc) if used_at.tzinfo is None else used_at
    return aware + timedelta(days=_COOLDOWN_DAYS)


def refresh_charms(user: User, now: datetime | None = None) -> None:
    """Reset the weekly charm allowance if the 7-day cooldown has passed.

    This is idempotent: calling it repeatedly with the same state is safe.
    """
    reference = now or _now_utc()
    used_at = _ensure_aware(user.cheat_day_used_at)

    if used_at is None:
        if user.cheat_charms_available != 1 or user.cheat_charms_used_this_week != 0:
            user.cheat_charms_available = 1
            user.cheat_charms_used_this_week = 0
        return

    elapsed = reference - used_at
    if elapsed >= timedelta(days=_COOLDOWN_DAYS):
        user.cheat_charms_available = 1
        user.cheat_charms_used_this_week = 0


def cheat_day_status(user: User, now: datetime | None = None) -> CheatDayStatus:
    """Return the current cheat-charm availability for a user.

    Refreshes the allowance automatically if the rolling cooldown has passed.
    """
    reference = now or _now_utc()
    refresh_charms(user, reference)

    used_at = _ensure_aware(user.cheat_day_used_at)
    next_on = _next_available_on(used_at)

    return CheatDayStatus(
        available=user.cheat_charms_available > 0,
        used_at=user.cheat_day_used_at,
        cooldown_seconds=int(
            max((next_on - reference).total_seconds(), 0) if next_on else 0
        ),
        days_remaining=round(
            max((next_on - reference).total_seconds() / 86400.0, 0)
            if next_on
            else 0,
            2,
        ),
        cheat_charms_available=user.cheat_charms_available,
        cheat_charms_used_this_week=user.cheat_charms_used_this_week,
        next_charm_available_on=next_on,
    )


def use_cheat_day(
    db: Session,
    user: User,
    now: datetime | None = None,
) -> CheatDayStatus:
    """Consume one cheat charm if available.

    Args:
        db: SQLAlchemy session.
        user: The user profile.
        now: Optional reference time (defaults to UTC now).

    Returns:
        Updated :class:`CheatDayStatus`.

    Raises:
        AppError: 422 if no cheat charm is available.
    """
    reference = now or _now_utc()
    refresh_charms(user, reference)

    if user.cheat_charms_available <= 0:
        status = cheat_day_status(user, reference)
        logger.warning(
            "cheat_charm_denied",
            user_id=user.id,
            used_at=user.cheat_day_used_at.isoformat() if user.cheat_day_used_at else None,
            days_remaining=status.days_remaining,
        )
        raise AppError(
            "cheat_charm_unavailable",
            "No cheat charm available. Complete the cooldown to earn another.",
            status=422,
        )

    user.cheat_charms_available -= 1
    user.cheat_charms_used_this_week += 1
    user.cheat_day_used_at = reference
    db.commit()
    db.refresh(user)

    logger.info("cheat_charm_used", user_id=user.id, used_at=reference.isoformat())
    return cheat_day_status(user, reference)
