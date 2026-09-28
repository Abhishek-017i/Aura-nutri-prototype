from datetime import date, datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import Food, MealLog, User
from app.schemas import DailySummary, MealLogCreate, MealLogRead
from app.services.nutrition import calculate_daily_summary

logger = structlog.get_logger()
router = APIRouter(prefix="/api/logs", tags=["logs"])


def _compute_log_from_food(food: Food | None, qty_g: float) -> dict[str, float]:
    if food is None or qty_g <= 0:
        return {
            "energy_kcal": 0.0,
            "protein_g": 0.0,
            "iron_mg": 0.0,
            "calcium_mg": 0.0,
            "vit_d_iu": 0.0,
            "b12_mcg": 0.0,
        }
    ratio = qty_g / 100.0
    return {
        "energy_kcal": food.energy_kcal * ratio,
        "protein_g": food.protein_g * ratio,
        "iron_mg": food.iron_mg * ratio,
        "calcium_mg": food.calcium_mg * ratio,
        "vit_d_iu": food.vit_d_iu * ratio,
        "b12_mcg": food.b12_mcg * ratio,
    }


@router.post("", response_model=MealLogRead, status_code=status.HTTP_201_CREATED)
async def create_log(payload: MealLogCreate, db: Session = Depends(get_db)) -> MealLog:
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)

    food: Food | None = None
    if payload.food_id:
        food = db.query(Food).filter(Food.id == payload.food_id).first()
        if food is None:
            raise AppError("food_not_found", "Food not found", status=404)

    nutrients = _compute_log_from_food(food, payload.qty_g)
    log = MealLog(
        user_id=payload.user_id,
        food_id=payload.food_id,
        food_name=food.name_en if food else (payload.food_name or "Unknown"),
        logged_at=payload.logged_at.replace(tzinfo=timezone.utc)
        if payload.logged_at.tzinfo is None
        else payload.logged_at,
        meal_type=payload.meal_type,
        qty_g=payload.qty_g,
        notes=payload.notes,
        **nutrients,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info(
        "meal_log_created",
        log_id=log.id,
        user_id=payload.user_id,
        food_id=payload.food_id,
        qty_g=payload.qty_g,
    )
    return log


@router.get("", response_model=list[MealLogRead])
async def list_logs(
    user_id: str,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MealLog]:
    q = db.query(MealLog).filter(MealLog.user_id == user_id)
    if start_date:
        q = q.filter(MealLog.logged_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(MealLog.logged_at <= datetime.combine(end_date, datetime.max.time()))
    return q.order_by(MealLog.logged_at.desc()).all()


@router.get("/summary", response_model=DailySummary)
async def get_daily_summary(
    user_id: str,
    target_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
) -> DailySummary:
    return calculate_daily_summary(db, user_id, target_date)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(log_id: str, db: Session = Depends(get_db)) -> None:
    log = db.query(MealLog).filter(MealLog.id == log_id).first()
    if log is None:
        raise AppError("log_not_found", "Log not found", status=404)
    db.delete(log)
    db.commit()
    logger.info("meal_log_deleted", log_id=log_id)
