from datetime import date

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import MealLog, User
from app.schemas import Dashboard, DailyProgress, RiskScore
from app.services.nutrition import calculate_daily_summary
from app.services.phase_engine import DynamicRDAs, calculate_dynamic_rdas
from app.services.risk_scorer import calculate_risk_score

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["dashboard"])


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    return user


def _phase_targets(user: User) -> DynamicRDAs:
    if user.phase is None:
        return DynamicRDAs(
            target_iron_mg=user.target_iron_mg,
            target_calcium_mg=user.target_calcium_mg,
            target_vit_d_mcg=user.target_vit_d_iu / 40.0,
            target_b12_mcg=user.target_b12_mcg,
        )
    try:
        return calculate_dynamic_rdas(
            base_age=user.age or 30,
            base_gender=user.gender or "female",
            phase=user.phase,
        )
    except ValueError:
        logger.warning(
            "dashboard_unrecognized_phase",
            user_id=user.id,
            phase=user.phase,
        )
        return DynamicRDAs(
            target_iron_mg=user.target_iron_mg,
            target_calcium_mg=user.target_calcium_mg,
            target_vit_d_mcg=user.target_vit_d_iu / 40.0,
            target_b12_mcg=user.target_b12_mcg,
        )


@router.get("/dashboard/{user_id}", response_model=Dashboard)
async def get_dashboard(user_id: str, db: Session = Depends(get_db)) -> Dashboard:
    """Return today's aggregated intake and progress against phase targets."""
    user = _user_or_404(db, user_id)
    today = date.today()
    summary = calculate_daily_summary(db, user_id, today)
    targets = _phase_targets(user)

    progress = [
        DailyProgress(
            nutrient="iron",
            current=summary.nutrients[0].intake,
            target=targets.target_iron_mg,
            percent=summary.nutrients[0].percent,
            unit="mg",
        ),
        DailyProgress(
            nutrient="calcium",
            current=summary.nutrients[1].intake,
            target=targets.target_calcium_mg,
            percent=summary.nutrients[1].percent,
            unit="mg",
        ),
        DailyProgress(
            nutrient="vit_d",
            current=summary.nutrients[2].intake,
            target=targets.target_vit_d_mcg * 40.0,
            percent=summary.nutrients[2].percent,
            unit="iu",
        ),
        DailyProgress(
            nutrient="b12",
            current=summary.nutrients[3].intake,
            target=targets.target_b12_mcg,
            percent=summary.nutrients[3].percent,
            unit="mcg",
        ),
    ]

    recent_logs = db.query(MealLog).filter(MealLog.user_id == user_id).count()

    logger.info(
        "dashboard_loaded",
        user_id=user_id,
        date=str(today),
        phase=user.phase,
    )

    return Dashboard(
        user_id=user_id,
        name=user.name,
        phase=user.phase,
        date=today,
        total_energy_kcal=summary.total_energy_kcal,
        total_protein_g=summary.total_protein_g,
        progress=progress,
        recent_logs=recent_logs,
    )


@router.get("/risk-score/{user_id}", response_model=RiskScore)
async def get_risk_score(user_id: str, db: Session = Depends(get_db)) -> RiskScore:
    """Return the 14-day rolling micronutrient risk assessment."""
    _user_or_404(db, user_id)
    return calculate_risk_score(db, user_id)
