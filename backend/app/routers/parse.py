import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import Food
from app.schemas.parse import ParseMealIn, ParsedItem, ParsedMeal, RecalculateItemIn
from app.services.firestore_client import get_firestore_client
from app.services.parser import _food_from_firestore_doc, _food_from_sqlite_model, parse_meal, recalculate_single_item

logger = structlog.get_logger()
router = APIRouter(prefix="/api", tags=["parse"])


@router.post("/parse-meal", response_model=ParsedMeal)
async def parse_meal_endpoint(
    payload: ParseMealIn,
    db: Session = Depends(get_db),
) -> ParsedMeal:
    """Parse a multilingual meal description into structured food items and nutrients."""
    logger.info("parse_meal_endpoint_called", text=payload.text)
    return await parse_meal(db, payload.text)


@router.post("/recalculate-item", response_model=ParsedItem)
async def recalculate_item_endpoint(
    payload: RecalculateItemIn,
    db: Session = Depends(get_db),
) -> ParsedItem:
    """Recalculate nutrients for a single item when slider is moved."""
    food_id = payload.food_id
    qty_g = payload.qty_g

    # Try Firestore first
    matched = None
    try:
        fs = get_firestore_client()
        doc = fs.collection("foods").document(food_id).get()
        if doc.exists:
            matched = _food_from_firestore_doc(doc.id, doc.to_dict() or {})
    except Exception as exc:
        logger.warning("firestore_fetch_failed_in_recalculate", error=str(exc))

    # Try SQLite fallback
    if matched is None:
        food_row = db.query(Food).filter(Food.id == food_id).first()
        if food_row is not None:
            matched = _food_from_sqlite_model(food_row)

    if matched is None:
        raise AppError("food_not_found", f"Food with id '{food_id}' not found.", status=404)

    return recalculate_single_item(matched, qty_g)
