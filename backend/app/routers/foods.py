import structlog
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import Food
from app.schemas import FoodRead, FoodSearchResult
from app.services.food_search import search_foods

logger = structlog.get_logger()
router = APIRouter(prefix="/api/foods", tags=["foods"])


@router.get("", response_model=list[FoodSearchResult])
async def list_foods(
    q: str | None = Query(default=None, description="Search query"),
    category: str | None = Query(default=None, description="Food category"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Food]:
    return search_foods(db, query=q, category=category, limit=limit)


@router.get("/{food_id}", response_model=FoodRead)
async def get_food(food_id: str, db: Session = Depends(get_db)) -> Food:
    food = db.query(Food).filter(Food.id == food_id).first()
    if food is None:
        raise AppError("food_not_found", "Food not found", status=404)
    return food
