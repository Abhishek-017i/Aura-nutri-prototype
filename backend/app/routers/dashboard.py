from datetime import date, datetime, timedelta, timezone
from typing import Any

import structlog
from fastapi import APIRouter, Request

from app.errors import AppError
from app.schemas.dashboard import DailyProgress, Dashboard
from app.schemas.risk import NutrientRisk, RiskScore, TrendDay, TrendNutrientStatus
from app.services.firestore_client import get_firestore_client
from app.services.phase_engine import DynamicRDAs, calculate_dynamic_rdas

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["dashboard-risk"])

_NUTRIENTS = [
    ("iron_mg", "target_iron_mg", "iron", "mg"),
    ("calcium_mg", "target_calcium_mg", "calcium", "mg"),
    ("vit_d_iu", "target_vit_d_iu", "vit_d", "iu"),
    ("b12_mcg", "target_b12_mcg", "b12", "mcg"),
]

_DISPLAY_NAMES = {
    "iron": "Iron",
    "calcium": "Calcium",
    "vit_d": "Vitamin D",
    "b12": "Vitamin B12",
}


def _phase_targets(user_data: dict[str, Any]) -> DynamicRDAs:
    phase = user_data.get("phase")
    age = user_data.get("age", 30)
    if not phase:
        return DynamicRDAs(
            target_iron_mg=float(user_data.get("target_iron_mg", 18.0)),
            target_calcium_mg=float(user_data.get("target_calcium_mg", 1000.0)),
            target_vit_d_mcg=float(user_data.get("target_vit_d_iu", 600.0)) / 40.0,
            target_b12_mcg=float(user_data.get("target_b12_mcg", 2.4)),
        )
    try:
        return calculate_dynamic_rdas(base_age=int(age), base_gender="female", phase=phase)
    except ValueError:
        return DynamicRDAs(
            target_iron_mg=float(user_data.get("target_iron_mg", 18.0)),
            target_calcium_mg=float(user_data.get("target_calcium_mg", 1000.0)),
            target_vit_d_mcg=float(user_data.get("target_vit_d_iu", 600.0)) / 40.0,
            target_b12_mcg=float(user_data.get("target_b12_mcg", 2.4)),
        )


def _risk_level(percent: float) -> str:
    if percent >= 80.0:
        return "LOW"
    if percent >= 50.0:
        return "MEDIUM"
    return "HIGH"


def _daily_status_color(percent: float) -> str:
    if percent >= 100.0:
        return "green"
    if percent >= 50.0:
        return "yellow"
    return "red"


def _explanation(nutrient: str, percent: float, risk_level: str) -> str:
    name = _DISPLAY_NAMES.get(nutrient, nutrient.capitalize())
    if risk_level == "LOW":
        return f"{name} intake is at {percent:.0f}% of target. Keep up the current choices."
    if risk_level == "MEDIUM":
        return f"{name} intake is at {percent:.0f}% of target. Add one {name}-rich Indian food today."
    return (
        f"{name} intake is at {percent:.0f}% of target, which is well below the goal. "
        f"Add {name}-rich foods and consider consulting a physician or dietitian."
    )


@router.get("/dashboard", response_model=Dashboard)
async def get_dashboard(request: Request) -> Dashboard:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = user_snap.to_dict() or {}
    today = date.today()
    start_iso = f"{today.isoformat()}T00:00:00"
    end_iso = f"{today.isoformat()}T23:59:59.999999Z"

    user_logs_col = db.collection("users").document(uid).collection("meal_logs")
    today_docs = list(
        user_logs_col.where("logged_at", ">=", start_iso)
        .where("logged_at", "<=", end_iso)
        .stream()
    )

    tot_energy = sum(float(d.to_dict().get("energy_kcal", 0.0)) for d in today_docs)
    tot_protein = sum(float(d.to_dict().get("protein_g", 0.0)) for d in today_docs)
    tot_iron = sum(float(d.to_dict().get("iron_mg", 0.0)) for d in today_docs)
    tot_calcium = sum(float(d.to_dict().get("calcium_mg", 0.0)) for d in today_docs)
    tot_vit_d = sum(float(d.to_dict().get("vit_d_iu", 0.0)) for d in today_docs)
    tot_b12 = sum(float(d.to_dict().get("b12_mcg", 0.0)) for d in today_docs)

    targets = _phase_targets(user_data)
    target_d_iu = targets.target_vit_d_mcg * 40.0

    progress = [
        DailyProgress(
            nutrient="iron",
            current=round(tot_iron, 2),
            target=targets.target_iron_mg,
            percent=round((tot_iron / targets.target_iron_mg * 100.0) if targets.target_iron_mg > 0 else 0.0, 1),
            unit="mg",
        ),
        DailyProgress(
            nutrient="calcium",
            current=round(tot_calcium, 2),
            target=targets.target_calcium_mg,
            percent=round((tot_calcium / targets.target_calcium_mg * 100.0) if targets.target_calcium_mg > 0 else 0.0, 1),
            unit="mg",
        ),
        DailyProgress(
            nutrient="vit_d",
            current=round(tot_vit_d, 2),
            target=target_d_iu,
            percent=round((tot_vit_d / target_d_iu * 100.0) if target_d_iu > 0 else 0.0, 1),
            unit="iu",
        ),
        DailyProgress(
            nutrient="b12",
            current=round(tot_b12, 2),
            target=targets.target_b12_mcg,
            percent=round((tot_b12 / targets.target_b12_mcg * 100.0) if targets.target_b12_mcg > 0 else 0.0, 1),
            unit="mcg",
        ),
    ]

    all_logs_count = len(list(user_logs_col.limit(100).stream()))

    return Dashboard(
        user_id=uid,
        name=user_data.get("name", "User"),
        phase=user_data.get("phase"),
        date=today,
        total_energy_kcal=round(tot_energy, 2),
        total_protein_g=round(tot_protein, 2),
        progress=progress,
        recent_logs=all_logs_count,
    )


@router.get("/risk-score", response_model=RiskScore)
async def get_risk_score(request: Request) -> RiskScore:
    uid: str = request.state.uid
    db = get_firestore_client()
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists:
        raise AppError("user_not_found", "Profile not found. Complete signup first.", status=404)

    user_data = user_snap.to_dict() or {}
    end = date.today()
    start = end - timedelta(days=13)

    start_iso = f"{start.isoformat()}T00:00:00"
    end_iso = f"{end.isoformat()}T23:59:59.999999Z"

    user_logs_col = db.collection("users").document(uid).collection("meal_logs")
    logs_stream = (
        user_logs_col.where("logged_at", ">=", start_iso)
        .where("logged_at", "<=", end_iso)
        .stream()
    )

    logs = [d.to_dict() or {} for d in logs_stream]
    targets = _phase_targets(user_data)
    target_map = {
        "iron": targets.target_iron_mg,
        "calcium": targets.target_calcium_mg,
        "vit_d": targets.target_vit_d_mcg * 40.0,
        "b12": targets.target_b12_mcg,
    }

    daily_totals: dict[date, dict[str, float]] = {}
    total_intake = {"iron": 0.0, "calcium": 0.0, "vit_d": 0.0, "b12": 0.0}

    for log in logs:
        log_dt_str = str(log.get("logged_at", ""))
        try:
            log_date = datetime.fromisoformat(log_dt_str).date()
        except Exception:
            continue

        if log_date not in daily_totals:
            daily_totals[log_date] = {"iron": 0.0, "calcium": 0.0, "vit_d": 0.0, "b12": 0.0}

        iron = float(log.get("iron_mg", 0.0))
        calcium = float(log.get("calcium_mg", 0.0))
        vit_d = float(log.get("vit_d_iu", 0.0))
        b12 = float(log.get("b12_mcg", 0.0))

        daily_totals[log_date]["iron"] += iron
        daily_totals[log_date]["calcium"] += calcium
        daily_totals[log_date]["vit_d"] += vit_d
        daily_totals[log_date]["b12"] += b12

        total_intake["iron"] += iron
        total_intake["calcium"] += calcium
        total_intake["vit_d"] += vit_d
        total_intake["b12"] += b12

    avg_intake = {k: v / 14.0 for k, v in total_intake.items()}
    nutrient_risks: list[NutrientRisk] = []
    risk_levels: dict[str, str] = {}

    for _col, _t_attr, disp_name, unit in _NUTRIENTS:
        target = target_map[disp_name]
        intake = avg_intake[disp_name]
        percent = (intake / target * 100.0) if target > 0 else 0.0
        r_level = _risk_level(percent)
        risk_levels[disp_name] = r_level
        nutrient_risks.append(
            NutrientRisk(
                nutrient=disp_name,
                intake=round(intake, 2),
                target=round(target, 2),
                percent=round(percent, 2),
                risk_level=r_level,
                unit=unit,
                explanation=_explanation(disp_name, percent, r_level),
            )
        )

    overall = (
        "HIGH"
        if any(level == "HIGH" for level in risk_levels.values())
        else "MEDIUM"
        if any(level == "MEDIUM" for level in risk_levels.values())
        else "LOW"
    )

    trend: list[TrendDay] = []
    for offset in range(14):
        day = start + timedelta(days=offset)
        totals = daily_totals.get(day, {"iron": 0.0, "calcium": 0.0, "vit_d": 0.0, "b12": 0.0})
        day_nutrients: list[TrendNutrientStatus] = []
        for _col, _t_attr, disp_name, _unit in _NUTRIENTS:
            target = target_map[disp_name]
            intake = totals[disp_name]
            percent = (intake / target * 100.0) if target > 0 else 0.0
            day_nutrients.append(
                TrendNutrientStatus(
                    nutrient=disp_name,
                    status=_daily_status_color(percent),
                    intake=round(intake, 2),
                    target=round(target, 2),
                    percent=round(percent, 2),
                )
            )
        note = "nutrients reset to 0" if day not in daily_totals and day < date.today() else None
        trend.append(TrendDay(date=day, nutrients=day_nutrients, note=note))

    return RiskScore(
        user_id=uid,
        phase=user_data.get("phase"),
        window_start=start,
        window_end=end,
        days_logged=len(daily_totals),
        targets={k: round(v, 2) for k, v in target_map.items()},
        rolling_14d={k: round(v, 2) for k, v in avg_intake.items()},
        risk=risk_levels,
        nutrients=nutrient_risks,
        overall_risk=overall,
        trend=trend,
    )
