from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

import structlog
from fastapi import APIRouter, Query, Request, status
from pydantic import BaseModel, Field

from app.errors import AppError
from app.services.firestore_client import get_firestore_client
from app.services.streak_service import StreakState, process_log_for_streak

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["logs"])


class LogMealItemIn(BaseModel):
    food_id: str | None = None
    food_name: str
    qty_g: float = Field(..., ge=0)
    energy_kcal: float = Field(0.0, ge=0)
    protein_g: float = Field(0.0, ge=0)
    iron_mg: float = Field(0.0, ge=0)
    calcium_mg: float = Field(0.0, ge=0)
    vit_d_iu: float = Field(0.0, ge=0)
    b12_mcg: float = Field(0.0, ge=0)
    notes: str | None = None


class LogMealPayload(BaseModel):
    items: list[LogMealItemIn] = Field(..., min_length=1)
    meal_type: str | None = "voice"
    logged_at: datetime | None = None


class SingleMealLogCreate(BaseModel):
    food_id: str | None = None
    food_name: str | None = None
    logged_at: datetime | None = None
    meal_type: str | None = None
    qty_g: float = 0.0
    energy_kcal: float = 0.0
    protein_g: float = 0.0
    iron_mg: float = 0.0
    calcium_mg: float = 0.0
    vit_d_iu: float = 0.0
    b12_mcg: float = 0.0
    notes: str | None = None


def _update_user_streak(user_ref: Any, user_data: dict[str, Any], log_date: date) -> None:
    last_log_str = user_data.get("last_log_date")
    last_log_d = date.fromisoformat(last_log_str) if last_log_str else None

    streak_state = StreakState(
        current_streak=int(user_data.get("current_streak", 0)),
        longest_streak=int(user_data.get("longest_streak", 0)),
        last_log_date=last_log_d,
        cheat_charms_available=int(user_data.get("cheat_charms_available", 1)),
    )
    update = process_log_for_streak(streak_state, log_date)

    fields_to_update: dict[str, Any] = {
        "current_streak": update.current_streak,
        "longest_streak": update.longest_streak,
        "last_log_date": update.last_log_date.isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if update.consumed_charm:
        fields_to_update["cheat_charms_available"] = max(0, streak_state.cheat_charms_available - 1)
        fields_to_update["cheat_charms_used_this_week"] = int(user_data.get("cheat_charms_used_this_week", 0)) + 1
        if not user_data.get("cheat_day_used_at"):
            fields_to_update["cheat_day_used_at"] = datetime.now(timezone.utc).isoformat()

    user_ref.update(fields_to_update)


@router.post("/log-meal", status_code=status.HTTP_201_CREATED)
async def log_meal_batch(payload: LogMealPayload, request: Request) -> dict[str, Any]:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = user_snap.to_dict() or {}
    ts = payload.logged_at or datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    ts_iso = ts.isoformat()
    log_date = ts.date()

    created_logs: list[dict[str, Any]] = []
    totals = {
        "energy_kcal": 0.0,
        "protein_g": 0.0,
        "iron_mg": 0.0,
        "calcium_mg": 0.0,
        "vit_d_iu": 0.0,
        "b12_mcg": 0.0,
    }

    batch = db.batch()
    user_logs_col = user_ref.collection("meal_logs")

    from app.services.parser import _apply_flags_capping

    for item in payload.items:
        log_id = str(uuid4())
        doc_ref = user_logs_col.document(log_id)

        energy_c, e_src, vit_d_c, v_src, b12_c, b_src, dq = _apply_flags_capping(
            item.food_name, item.energy_kcal, item.vit_d_iu, item.b12_mcg
        )

        log_doc: dict[str, Any] = {
            "id": log_id,
            "user_id": uid,
            "food_id": item.food_id,
            "food_name": item.food_name,
            "logged_at": ts_iso,
            "meal_type": payload.meal_type,
            "qty_g": item.qty_g,
            "energy_kcal": round(energy_c, 2),
            "protein_g": item.protein_g,
            "iron_mg": item.iron_mg,
            "calcium_mg": item.calcium_mg,
            "vit_d_iu": round(vit_d_c, 2),
            "b12_mcg": round(b12_c, 2),
            "notes": item.notes,
            "data_quality": dq,
            "energy_source": e_src,
            "vit_d_source": v_src,
            "b12_source": b_src,
            "created_at": ts_iso,
        }
        batch.set(doc_ref, log_doc)
        created_logs.append(log_doc)

        totals["energy_kcal"] += energy_c
        totals["protein_g"] += item.protein_g
        totals["iron_mg"] += item.iron_mg
        totals["calcium_mg"] += item.calcium_mg
        totals["vit_d_iu"] += vit_d_c
        totals["b12_mcg"] += b12_c

    batch.commit()
    _update_user_streak(user_ref, user_data, log_date)

    return {
        "logs": created_logs,
        "totals": {k: round(v, 2) for k, v in totals.items()},
    }


@router.post("/logs", status_code=status.HTTP_201_CREATED)
async def create_single_log(payload: SingleMealLogCreate, request: Request) -> dict[str, Any]:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = user_snap.to_dict() or {}
    ts = payload.logged_at or datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    ts_iso = ts.isoformat()

    log_id = str(uuid4())
    log_doc: dict[str, Any] = {
        "id": log_id,
        "user_id": uid,
        "food_id": payload.food_id,
        "food_name": payload.food_name or "Unknown",
        "logged_at": ts_iso,
        "meal_type": payload.meal_type,
        "qty_g": payload.qty_g,
        "energy_kcal": payload.energy_kcal,
        "protein_g": payload.protein_g,
        "iron_mg": payload.iron_mg,
        "calcium_mg": payload.calcium_mg,
        "vit_d_iu": payload.vit_d_iu,
        "b12_mcg": payload.b12_mcg,
        "notes": payload.notes,
        "created_at": ts_iso,
    }
    user_ref.collection("meal_logs").document(log_id).set(log_doc)
    _update_user_streak(user_ref, user_data, ts.date())
    return log_doc


@router.get("/logs")
async def list_logs(
    request: Request,
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[dict[str, Any]]:
    uid: str = request.state.uid
    db = get_firestore_client()
    query = db.collection("users").document(uid).collection("meal_logs").order_by(
        "logged_at", direction="DESCENDING"
    )

    if start_date:
        query = query.where("logged_at", ">=", start_date)
    if end_date:
        query = query.where("logged_at", "<=", end_date + "T23:59:59.999999Z")

    query = query.offset(offset).limit(limit)
    docs = list(query.stream())
    results: list[dict[str, Any]] = []
    for d in docs:
        item = d.to_dict() or {}
        item["id"] = d.id
        results.append(item)
    return results


@router.get("/logs/summary")
async def get_logs_summary(
    request: Request,
    target_date: str | None = Query(default=None),
) -> dict[str, Any]:
    uid: str = request.state.uid
    db = get_firestore_client()
    target = target_date or date.today().isoformat()
    start_iso = f"{target}T00:00:00"
    end_iso = f"{target}T23:59:59.999999Z"

    docs = (
        db.collection("users")
        .document(uid)
        .collection("meal_logs")
        .where("logged_at", ">=", start_iso)
        .where("logged_at", "<=", end_iso)
        .stream()
    )

    totals = {
        "energy_kcal": 0.0,
        "protein_g": 0.0,
        "iron_mg": 0.0,
        "calcium_mg": 0.0,
        "vit_d_iu": 0.0,
        "b12_mcg": 0.0,
    }
    count = 0
    for d in docs:
        item = d.to_dict() or {}
        count += 1
        for k in totals:
            totals[k] += float(item.get(k, 0.0))

    return {
        "date": target,
        "item_count": count,
        "totals": {k: round(v, 2) for k, v in totals.items()},
    }


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(log_id: str, request: Request) -> None:
    uid: str = request.state.uid
    db = get_firestore_client()
    doc_ref = db.collection("users").document(uid).collection("meal_logs").document(log_id)
    if not doc_ref.get().exists:
        raise AppError("log_not_found", "Log not found", status=404)
    doc_ref.delete()
    logger.info("meal_log_deleted", uid=uid, log_id=log_id)
