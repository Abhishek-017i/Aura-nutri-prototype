"""Batch meal-log confirmation endpoint.

This router implements the commit step of the parse -> preview -> confirm flow.
`/api/log-meal` takes a confirmed list of parsed items and is the only endpoint
that persists them as `MealLog` rows.
"""

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import MealLog, User
from app.schemas import LogMealIn, LogMealOut, LogMealTotals, MealLogRead
from app.services.cheat_day import refresh_charms
from app.services.streak_service import process_log_for_streak, user_state_from_model

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["log-meal"])


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    return user


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/log-meal", response_model=LogMealOut, status_code=status.HTTP_201_CREATED)
async def log_meal(payload: LogMealIn, db: Session = Depends(get_db)) -> LogMealOut:
    """Persist a confirmed list of parsed meal items.

    This is the only endpoint that writes meal logs. Callers should first use
    `/api/parse-meal` to get a structured preview, let the user review/edit, then
    send the final list here.
    """
    user = _user_or_404(db, payload.user_id)
    timestamp = payload.logged_at or _now_utc()
    # Ensure timezone-aware UTC datetime.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    logs: list[MealLog] = []
    for item in payload.items:
        log = MealLog(
            user_id=payload.user_id,
            food_id=item.food_id,
            food_name=item.food_name,
            logged_at=timestamp,
            meal_type=payload.meal_type,
            qty_g=item.qty_g,
            energy_kcal=item.energy_kcal,
            protein_g=item.protein_g,
            iron_mg=item.iron_mg,
            calcium_mg=item.calcium_mg,
            vit_d_iu=item.vit_d_iu,
            b12_mcg=item.b12_mcg,
            notes=item.notes,
        )
        db.add(log)
        logs.append(log)

    db.commit()
    for log in logs:
        db.refresh(log)

    # Apply deterministic streak/cheat state once for this meal.
    refresh_charms(user)
    update = process_log_for_streak(user_state_from_model(user), timestamp.date())
    user.current_streak = update.current_streak
    user.longest_streak = update.longest_streak
    user.last_log_date = update.last_log_date
    if update.consumed_charm:
        user.cheat_charms_available = max(0, user.cheat_charms_available - 1)
        user.cheat_charms_used_this_week += 1
        if user.cheat_day_used_at is None:
            user.cheat_day_used_at = timestamp
    db.commit()
    db.refresh(user)

    totals = LogMealTotals(
        energy_kcal=round(sum(item.energy_kcal for item in payload.items), 2),
        protein_g=round(sum(item.protein_g for item in payload.items), 2),
        iron_mg=round(sum(item.iron_mg for item in payload.items), 2),
        calcium_mg=round(sum(item.calcium_mg for item in payload.items), 2),
        vit_d_iu=round(sum(item.vit_d_iu for item in payload.items), 2),
        b12_mcg=round(sum(item.b12_mcg for item in payload.items), 2),
    )

    logger.info(
        "meal_logged",
        user_id=payload.user_id,
        log_count=len(logs),
        current_streak=user.current_streak,
        totals=totals.model_dump(),
    )

    return LogMealOut(
        logs=[MealLogRead.model_validate(log) for log in logs],
        totals=totals,
    )
