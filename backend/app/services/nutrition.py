from datetime import date, datetime, time, timezone

import structlog
from sqlalchemy.orm import Session

from app.models import MealLog, User
from app.schemas.summary import DailySummary, NutrientSummary

logger = structlog.get_logger()

_NUTRIENTS = [
    ("iron_mg", "target_iron_mg", "iron", "mg"),
    ("calcium_mg", "target_calcium_mg", "calcium", "mg"),
    ("vit_d_iu", "target_vit_d_iu", "vit_d", "iu"),
    ("b12_mcg", "target_b12_mcg", "b12", "mcg"),
]


def _day_bounds(target_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(target_date, time.max, tzinfo=timezone.utc)
    return start, end


def calculate_daily_summary(
    db: Session, user_id: str, target_date: date
) -> DailySummary:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError(f"User not found: {user_id}")

    start, end = _day_bounds(target_date)
    logs = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id)
        .filter(MealLog.logged_at >= start)
        .filter(MealLog.logged_at <= end)
        .all()
    )

    total_energy = sum(log.energy_kcal for log in logs)
    total_protein = sum(log.protein_g for log in logs)

    nutrients: list[NutrientSummary] = []
    for column, target_attr, display_name, unit in _NUTRIENTS:
        intake = sum(getattr(log, column) for log in logs)
        target = getattr(user, target_attr)
        nutrients.append(
            NutrientSummary(
                nutrient=display_name,
                intake=round(intake, 2),
                target=round(target, 2),
                percent=round((intake / target * 100) if target > 0 else 0.0, 2),
                unit=unit,
            )
        )

    logger.info(
        "daily_summary_calculated",
        user_id=user_id,
        date=str(target_date),
        log_count=len(logs),
        energy=total_energy,
    )

    return DailySummary(
        user_id=user_id,
        date=target_date,
        total_energy_kcal=round(total_energy, 2),
        total_protein_g=round(total_protein, 2),
        nutrients=nutrients,
    )
