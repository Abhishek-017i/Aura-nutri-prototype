"""14-day rolling micronutrient risk scorer.

Deterministic, explainable scoring: compare the user's average daily intake
over the last 14 days against phase-adjusted RDAs and classify each nutrient
as LOW, MEDIUM, or HIGH risk.
"""

from datetime import date, datetime, time, timedelta, timezone

import structlog
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import MealLog, User
from app.schemas.risk import NutrientRisk, RiskScore, TrendDay, TrendNutrientStatus
from app.services.phase_engine import DynamicRDAs, calculate_dynamic_rdas

logger = structlog.get_logger()

_NUTRIENTS = [
    ("iron_mg", "target_iron_mg", "iron", "mg"),
    ("calcium_mg", "target_calcium_mg", "calcium", "mg"),
    ("vit_d_iu", "target_vit_d_iu", "vit_d", "iu"),
    ("b12_mcg", "target_b12_mcg", "b12", "mcg"),
]


def _phase_based_targets(user: User) -> DynamicRDAs:
    """Return phase-based targets, falling back to stored user targets."""
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
            "unrecognized_phase_falling_back",
            user_id=user.id,
            phase=user.phase,
        )
        return DynamicRDAs(
            target_iron_mg=user.target_iron_mg,
            target_calcium_mg=user.target_calcium_mg,
            target_vit_d_mcg=user.target_vit_d_iu / 40.0,
            target_b12_mcg=user.target_b12_mcg,
        )


def _risk_level(percent: float) -> str:
    """Classify a percent-of-target value into a risk level."""
    if percent >= 80.0:
        return "LOW"
    if percent >= 50.0:
        return "MEDIUM"
    return "HIGH"


_DISPLAY_NAMES = {
    "iron": "Iron",
    "calcium": "Calcium",
    "vit_d": "Vitamin D",
    "b12": "Vitamin B12",
}


def _daily_status_color(percent: float) -> str:
    """Map a daily percent-of-target to a trend-view color."""
    if percent >= 100.0:
        return "green"
    if percent >= 50.0:
        return "yellow"
    return "red"


def _calculate_trend(
    db: Session,
    user_id: str,
    targets: dict[str, float],
    end: date,
) -> list[TrendDay]:
    """Return a 14-day per-day nutrient status trend.

    Each day shows the intake vs target for the four tracked nutrients with a
    red/yellow/green status. Days with no logs show 0 intake and red status.
    """
    start = end - timedelta(days=13)
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.max, tzinfo=timezone.utc)

    logs = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id)
        .filter(MealLog.logged_at >= start_dt)
        .filter(MealLog.logged_at <= end_dt)
        .all()
    )

    daily_totals: dict[date, dict[str, float]] = {}
    for log in logs:
        day = log.logged_at.date()
        if day not in daily_totals:
            daily_totals[day] = {"iron": 0.0, "calcium": 0.0, "vit_d": 0.0, "b12": 0.0}
        daily_totals[day]["iron"] += log.iron_mg
        daily_totals[day]["calcium"] += log.calcium_mg
        daily_totals[day]["vit_d"] += log.vit_d_iu
        daily_totals[day]["b12"] += log.b12_mcg

    trend: list[TrendDay] = []
    for offset in range(14):
        day = start + timedelta(days=offset)
        totals = daily_totals.get(day, {"iron": 0.0, "calcium": 0.0, "vit_d": 0.0, "b12": 0.0})
        day_nutrients: list[TrendNutrientStatus] = []
        for column, _target_attr, display_name, unit in _NUTRIENTS:
            target = targets[display_name]
            intake = totals[display_name]
            percent = (intake / target * 100.0) if target > 0 else 0.0
            day_nutrients.append(
                TrendNutrientStatus(
                    nutrient=display_name,
                    status=_daily_status_color(percent),
                    intake=round(intake, 2),
                    target=round(target, 2),
                    percent=round(percent, 2),
                )
            )
        note = "nutrients reset to 0" if day not in daily_totals and day < date.today() else None
        trend.append(TrendDay(date=day, nutrients=day_nutrients, note=note))

    return trend


def _explanation(nutrient: str, percent: float, risk_level: str, unit: str) -> str:
    """Generate a plain-language explanation for a nutrient risk level."""
    name = _DISPLAY_NAMES.get(nutrient, nutrient.capitalize())
    if risk_level == "LOW":
        return (
            f"{name} intake is at {percent:.0f}% of target. "
            f"Keep up the current choices."
        )
    if risk_level == "MEDIUM":
        return (
            f"{name} intake is at {percent:.0f}% of target. "
            f"Add one {name}-rich Indian food today."
        )
    return (
        f"{name} intake is at {percent:.0f}% of target, which is "
        f"well below the goal. Add {name}-rich foods and consider consulting a "
        f"physician or dietitian."
    )


def calculate_risk_score(
    db: Session,
    user_id: str,
    reference_date: date | None = None,
) -> RiskScore:
    """Calculate the 14-day rolling micronutrient risk score for a user.

    Args:
        db: SQLAlchemy session.
        user_id: UUID string of the user.
        reference_date: End date of the 14-day window (defaults to today).

    Returns:
        A :class:`RiskScore` with per-nutrient risk levels and explanations.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError(f"User not found: {user_id}")

    end = reference_date or date.today()
    start = end - timedelta(days=13)

    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.max, tzinfo=timezone.utc)

    logs = (
        db.query(MealLog)
        .filter(MealLog.user_id == user_id)
        .filter(MealLog.logged_at >= start_dt)
        .filter(MealLog.logged_at <= end_dt)
        .all()
    )

    targets = _phase_based_targets(user)
    target_map = {
        "iron": targets.target_iron_mg,
        "calcium": targets.target_calcium_mg,
        "vit_d": targets.target_vit_d_mcg * 40.0,  # convert mcg back to IU for comparison
        "b12": targets.target_b12_mcg,
    }

    days_logged = len({log.logged_at.date() for log in logs})
    total_intake: dict[str, float] = {
        "iron": 0.0,
        "calcium": 0.0,
        "vit_d": 0.0,
        "b12": 0.0,
    }
    for log in logs:
        for column, _target_attr, display_name, _unit in _NUTRIENTS:
            total_intake[display_name] += getattr(log, column)

    # Average per day over the 14-day window.
    window_days = 14
    avg_intake = {k: v / window_days for k, v in total_intake.items()}

    nutrient_risks: list[NutrientRisk] = []
    risk_levels: dict[str, str] = {}
    for column, target_attr, display_name, unit in _NUTRIENTS:
        target = target_map[display_name]
        intake = avg_intake[display_name]
        percent = (intake / target * 100.0) if target > 0 else 0.0
        risk_level = _risk_level(percent)
        risk_levels[display_name] = risk_level
        nutrient_risks.append(
            NutrientRisk(
                nutrient=display_name,
                intake=round(intake, 2),
                target=round(target, 2),
                percent=round(percent, 2),
                risk_level=risk_level,
                unit=unit,
                explanation=_explanation(display_name, percent, risk_level, unit),
            )
        )

    overall = (
        "HIGH"
        if any(level == "HIGH" for level in risk_levels.values())
        else "MEDIUM"
        if any(level == "MEDIUM" for level in risk_levels.values())
        else "LOW"
    )

    trend = _calculate_trend(db, user_id, target_map, end)

    logger.info(
        "risk_score_calculated",
        user_id=user_id,
        window_start=str(start),
        window_end=str(end),
        overall_risk=overall,
    )

    return RiskScore(
        user_id=user_id,
        phase=user.phase,
        window_start=start,
        window_end=end,
        days_logged=days_logged,
        targets={k: round(v, 2) for k, v in target_map.items()},
        rolling_14d={k: round(v, 2) for k, v in avg_intake.items()},
        risk=risk_levels,
        nutrients=nutrient_risks,
        overall_risk=overall,
        trend=trend,
    )
