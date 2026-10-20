from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.errors import AppError
from app.schemas import PhaseOut, PhasePatch
from app.services.firestore_client import get_firestore_client
from app.services.phase_engine import Phase, calculate_dynamic_rdas

logger = structlog.get_logger()
router = APIRouter(prefix="/api/phase", tags=["phase"])


class PhaseCalculateIn(BaseModel):
    age: int
    phase: str


class PhaseCalculateOut(BaseModel):
    phase: str
    target_iron_mg: float
    target_calcium_mg: float
    target_vit_d_iu: float
    target_b12_mcg: float


_PHASE_CYCLE = [Phase.MENSTRUAL.value, Phase.FOLLICULAR.value, Phase.LUTEAL.value]


def _resolve_phase(current: str | None, patch: PhasePatch) -> str:
    if patch.phase is not None and patch.offset is not None:
        raise AppError(
            "phase_conflict",
            "Provide either 'phase' or 'offset', not both.",
            status=422,
        )

    if patch.phase is not None:
        try:
            Phase(patch.phase)
        except ValueError as exc:
            valid = ", ".join(p.value for p in Phase)
            raise AppError(
                "invalid_phase",
                f"Invalid phase '{patch.phase}'. Valid phases: {valid}",
                status=422,
            ) from exc
        return patch.phase

    if patch.offset is not None:
        if current is None or current not in _PHASE_CYCLE:
            raise AppError(
                "phase_offset_unsupported",
                "Offset adjustment is only supported for menstrual, follicular, and luteal phases.",
                status=422,
            )
        idx = _PHASE_CYCLE.index(current)
        new_idx = (idx + patch.offset) % len(_PHASE_CYCLE)
        return _PHASE_CYCLE[new_idx]

    raise AppError("phase_missing", "Provide either 'phase' or 'offset'.", status=422)


@router.patch("", response_model=PhaseOut)
@router.patch("/{user_id}", response_model=PhaseOut)
async def patch_phase(
    payload: PhasePatch,
    request: Request,
    user_id: str | None = None,
) -> PhaseOut:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_ref = db.collection("users").document(uid)
    user_snap = user_ref.get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = user_snap.to_dict() or {}
    new_phase = _resolve_phase(user_data.get("phase"), payload)
    now = datetime.now(timezone.utc)

    rdas = calculate_dynamic_rdas(int(user_data.get("age", 30)), "female", new_phase)
    target_iron = rdas.target_iron_mg
    target_calcium = rdas.target_calcium_mg
    target_vit_d = round(rdas.target_vit_d_mcg * 40.0, 2)
    target_b12 = rdas.target_b12_mcg

    update_fields = {
        "phase": new_phase,
        "phase_adjusted_at": now.isoformat(),
        "target_iron_mg": target_iron,
        "target_calcium_mg": target_calcium,
        "target_vit_d_iu": target_vit_d,
        "target_b12_mcg": target_b12,
        "updated_at": now.isoformat(),
    }
    user_ref.update(update_fields)

    logger.info("phase_adjusted", user_id=uid, new_phase=new_phase)
    return PhaseOut(
        user_id=uid,
        phase=new_phase,
        phase_adjusted_at=now,
        target_iron_mg=target_iron,
        target_calcium_mg=target_calcium,
        target_vit_d_iu=target_vit_d,
        target_b12_mcg=target_b12,
    )


@router.post("/calculate", response_model=PhaseCalculateOut)
def calculate_phase(payload: PhaseCalculateIn) -> PhaseCalculateOut:
    try:
        Phase(payload.phase)
    except ValueError as exc:
        raise AppError(
            code="invalid_phase",
            message=f"Unknown phase: {payload.phase}",
            status=422,
        ) from exc

    rdas = calculate_dynamic_rdas(payload.age, "female", payload.phase)
    return PhaseCalculateOut(
        phase=payload.phase,
        target_iron_mg=rdas.target_iron_mg,
        target_calcium_mg=rdas.target_calcium_mg,
        target_vit_d_iu=round(rdas.target_vit_d_mcg * 40.0, 2),
        target_b12_mcg=rdas.target_b12_mcg,
    )
