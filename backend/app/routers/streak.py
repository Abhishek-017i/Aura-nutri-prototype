from datetime import date, datetime, timedelta, timezone
from typing import Any

import structlog
from fastapi import APIRouter, Request

from app.errors import AppError
from app.schemas import CheatDayStatus, StreakOut
from app.services.firestore_client import get_firestore_client

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["streak"])

_COOLDOWN_DAYS = 7


def _get_user_doc_or_404(uid: str) -> tuple[Any, dict[str, Any]]:
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)
    return user_ref, (user_snap.to_dict() or {})


def _evaluate_cheat_day(user_data: dict[str, Any]) -> tuple[dict[str, Any], CheatDayStatus]:
    now = datetime.now(timezone.utc)
    used_at_str = user_data.get("cheat_day_used_at")
    used_at: datetime | None = None
    if used_at_str:
        try:
            used_at = datetime.fromisoformat(used_at_str)
            if used_at.tzinfo is None:
                used_at = used_at.replace(tzinfo=timezone.utc)
        except Exception:
            used_at = None

    charms_avail = int(user_data.get("cheat_charms_available", 1))
    charms_used = int(user_data.get("cheat_charms_used_this_week", 0))

    updates: dict[str, Any] = {}
    if used_at:
        elapsed = now - used_at
        if elapsed >= timedelta(days=_COOLDOWN_DAYS):
            charms_avail = 1
            charms_used = 0
            updates["cheat_charms_available"] = charms_avail
            updates["cheat_charms_used_this_week"] = charms_used
    else:
        if charms_avail != 1:
            charms_avail = 1
            charms_used = 0
            updates["cheat_charms_available"] = 1
            updates["cheat_charms_used_this_week"] = 0

    next_on = (used_at + timedelta(days=_COOLDOWN_DAYS)) if used_at else None
    cooldown_secs = int(max((next_on - now).total_seconds(), 0)) if next_on else 0
    days_rem = round(max(cooldown_secs / 86400.0, 0), 2)

    status = CheatDayStatus(
        available=charms_avail > 0,
        used_at=used_at,
        cooldown_seconds=cooldown_secs,
        days_remaining=days_rem,
        cheat_charms_available=charms_avail,
        cheat_charms_used_this_week=charms_used,
        next_charm_available_on=next_on,
    )
    return updates, status


@router.get("/streak", response_model=StreakOut)
@router.get("/streak/{user_id}", response_model=StreakOut)
async def get_streak(request: Request, user_id: str | None = None) -> StreakOut:
    uid: str = request.state.uid
    user_ref, user_data = _get_user_doc_or_404(uid)
    updates, status = _evaluate_cheat_day(user_data)
    if updates:
        user_ref.update(updates)

    last_log_str = user_data.get("last_log_date")
    last_log_d = date.fromisoformat(last_log_str) if last_log_str else None

    logger.info("streak_checked", user_id=uid, current_streak=user_data.get("current_streak", 0))
    return StreakOut(
        user_id=uid,
        current_streak=int(user_data.get("current_streak", 0)),
        longest_streak=int(user_data.get("longest_streak", 0)),
        last_log_date=last_log_d,
        cheat_charms_available=status.cheat_charms_available,
        cheat_charms_used_this_week=status.cheat_charms_used_this_week,
        next_charm_available_on=status.next_charm_available_on,
    )


@router.get("/cheat-day", response_model=CheatDayStatus)
@router.get("/cheat-day/{user_id}", response_model=CheatDayStatus)
async def get_cheat_day_status(request: Request, user_id: str | None = None) -> CheatDayStatus:
    uid: str = request.state.uid
    user_ref, user_data = _get_user_doc_or_404(uid)
    updates, status = _evaluate_cheat_day(user_data)
    if updates:
        user_ref.update(updates)
    return status


@router.post("/cheat-day/use", response_model=CheatDayStatus)
@router.post("/cheat-day/use/{user_id}", response_model=CheatDayStatus)
@router.post("/cheat-day", response_model=CheatDayStatus)
@router.post("/cheat-day/{user_id}", response_model=CheatDayStatus)
async def post_use_cheat_day(request: Request, user_id: str | None = None) -> CheatDayStatus:
    uid: str = request.state.uid
    user_ref, user_data = _get_user_doc_or_404(uid)
    updates, status = _evaluate_cheat_day(user_data)
    if updates:
        user_data.update(updates)

    if status.cheat_charms_available <= 0:
        raise AppError(
            "cheat_charm_unavailable",
            "No cheat charm available. Complete the cooldown to earn another.",
            status=422,
        )

    now = datetime.now(timezone.utc)
    new_charms = status.cheat_charms_available - 1
    new_used = status.cheat_charms_used_this_week + 1
    user_ref.update({
        "cheat_charms_available": new_charms,
        "cheat_charms_used_this_week": new_used,
        "cheat_day_used_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })

    next_on = now + timedelta(days=_COOLDOWN_DAYS)
    return CheatDayStatus(
        available=new_charms > 0,
        used_at=now,
        cooldown_seconds=int(_COOLDOWN_DAYS * 86400),
        days_remaining=float(_COOLDOWN_DAYS),
        cheat_charms_available=new_charms,
        cheat_charms_used_this_week=new_used,
        next_charm_available_on=next_on,
    )
