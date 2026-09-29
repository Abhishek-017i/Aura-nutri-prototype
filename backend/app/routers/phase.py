from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import PhaseOut, PhasePatch
from app.services.phase_engine import Phase, calculate_dynamic_rdas

logger = structlog.get_logger()
router = APIRouter(prefix="/api/phase", tags=["phase"])

# Logical cycle for small offset adjustments.
_PHASE_CYCLE = [Phase.MENSTRUAL.value, Phase.FOLLICULAR.value, Phase.LUTEAL.value]


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    return user


def _resolve_phase(current: str | None, patch: PhasePatch) -> str:
    """Return the new phase string, validating against the phase state machine."""
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


def _apply_phase_targets(user: User, phase: str) -> None:
    """Recalculate and store phase-aware targets for the user."""
    try:
        targets = calculate_dynamic_rdas(
            base_age=user.age or 30,
            base_gender=user.gender or "female",
            phase=phase,
        )
    except ValueError as exc:
        raise AppError("invalid_phase", str(exc), status=422) from exc

    user.target_iron_mg = targets.target_iron_mg
    user.target_calcium_mg = targets.target_calcium_mg
    user.target_vit_d_iu = targets.target_vit_d_mcg * 40.0
    user.target_b12_mcg = targets.target_b12_mcg


@router.patch("/{user_id}", response_model=PhaseOut)
async def patch_phase(
    user_id: str,
    payload: PhasePatch,
    db: Session = Depends(get_db),
) -> PhaseOut:
    """Adjust the user's phase directly or by a small cycle offset."""
    user = _user_or_404(db, user_id)
    new_phase = _resolve_phase(user.phase, payload)

    user.phase = new_phase
    user.phase_adjusted_at = datetime.now(timezone.utc)
    _apply_phase_targets(user, new_phase)

    db.commit()
    db.refresh(user)

    logger.info("phase_adjusted", user_id=user_id, new_phase=new_phase)
    return PhaseOut(
        user_id=user_id,
        phase=user.phase,
        phase_adjusted_at=user.phase_adjusted_at,
        target_iron_mg=user.target_iron_mg,
        target_calcium_mg=user.target_calcium_mg,
        target_vit_d_iu=user.target_vit_d_iu,
        target_b12_mcg=user.target_b12_mcg,
    )
