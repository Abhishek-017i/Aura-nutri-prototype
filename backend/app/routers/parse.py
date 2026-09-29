import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ParseMealIn, ParsedMeal
from app.services.parser import parse_meal

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["parse"])


@router.post("/parse-meal", response_model=ParsedMeal)
async def parse_meal_endpoint(
    payload: ParseMealIn,
    db: Session = Depends(get_db),
) -> ParsedMeal:
    """Parse a multilingual meal description into structured food items and nutrients.

    Example request body:
        {"text": "2 roti aur 1 bowl dal"}
    """
    logger.info("parse_meal_endpoint_called", text=payload.text)
    return await parse_meal(db, payload.text)
