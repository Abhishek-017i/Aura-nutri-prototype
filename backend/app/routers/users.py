from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field

from app.errors import AppError
from app.services.firestore_client import get_firestore_client
from app.services.phase_engine import Phase, calculate_dynamic_rdas

logger = structlog.get_logger()
router = APIRouter(prefix="/api/users", tags=["users"])


class CompleteSignupIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    age: int = Field(..., ge=1, le=120)
    phase: str = Field(..., min_length=1, max_length=50)


@router.post("/complete-signup", status_code=status.HTTP_201_CREATED)
async def complete_signup(payload: CompleteSignupIn, request: Request) -> dict[str, Any]:
    uid: str = request.state.uid
    email: str | None = getattr(request.state, "email", None)
    db = get_firestore_client()

    try:
        Phase(payload.phase)
    except ValueError as exc:
        raise AppError("invalid_phase", f"Unknown phase: {payload.phase}", status=422) from exc

    rdas = calculate_dynamic_rdas(payload.age, "female", payload.phase)
    now = datetime.now(timezone.utc).isoformat()

    user_data: dict[str, Any] = {
        "id": uid,
        "name": payload.name,
        "email": email or "",
        "age": payload.age,
        "gender": "female",
        "phase": payload.phase,
        "target_iron_mg": rdas.target_iron_mg,
        "target_calcium_mg": rdas.target_calcium_mg,
        "target_vit_d_iu": round(rdas.target_vit_d_mcg * 40.0, 2),
        "target_b12_mcg": rdas.target_b12_mcg,
        "current_streak": 0,
        "longest_streak": 0,
        "last_log_date": None,
        "cheat_charms_available": 1,
        "cheat_charms_used_this_week": 0,
        "cheat_day_used_at": None,
        "phase_adjusted_at": now,
        "walkthrough_completed": False,
        "created_at": now,
        "updated_at": now,
    }

    db.collection("users").document(uid).set(user_data)
    logger.info("user_complete_signup_created", uid=uid, name=payload.name, phase=payload.phase)
    return user_data


@router.get("/profile")
async def get_current_user_profile(request: Request) -> dict[str, Any]:
    uid: str = request.state.uid
    db = get_firestore_client()
    doc_snap = db.collection("users").document(uid).get()
    if not doc_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)
    data = doc_snap.to_dict() or {}
    data["id"] = uid
    return data


@router.get("/{user_id}")
async def get_user_by_id(user_id: str, request: Request) -> dict[str, Any]:
    db = get_firestore_client()
    doc_snap = db.collection("users").document(user_id).get()
    if not doc_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)
    data = doc_snap.to_dict() or {}
    data["id"] = user_id
    return data


@router.put("/{user_id}")
async def update_user(user_id: str, payload: dict[str, Any], request: Request) -> dict[str, Any]:
    db = get_firestore_client()
    doc_ref = db.collection("users").document(user_id)
    doc_snap = doc_ref.get()
    if not doc_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = doc_snap.to_dict() or {}
    now = datetime.now(timezone.utc).isoformat()
    payload["updated_at"] = now
    user_data.update(payload)
    doc_ref.set(user_data)
    user_data["id"] = user_id
    return user_data
