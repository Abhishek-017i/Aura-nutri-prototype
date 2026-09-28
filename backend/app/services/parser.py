"""Rule-based Hinglish meal parser.

Converts colloquial Hindi-English food descriptions such as
"2 roti aur 1 bowl dal" into structured food items with nutrient estimates.
"""

import re
from dataclasses import dataclass

import structlog
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Food
from app.schemas.parse import ParsedItem, ParsedMeal

logger = structlog.get_logger()

_HINDI_NUMERALS = {
    "ek": 1,
    "do": 2,
    "teen": 3,
    "char": 4,
    "panch": 5,
    "chhe": 6,
    "saat": 7,
    "aath": 8,
    "nau": 9,
    "das": 10,
}

_CONNECTORS = {"aur", "and", "with", "plus", "saath", "ke", "ki", "ka"}

_UNIT_WEIGHTS: dict[str, float] = {
    "roti": 40.0,
    "chapati": 40.0,
    "paratha": 50.0,
    "katori": 150.0,
    "bowl": 200.0,
    "plate": 250.0,
    "glass": 250.0,
    "cup": 200.0,
    "piece": 50.0,
    "slice": 30.0,
}

_DEFAULT_SERVING_G = 100.0


@dataclass(frozen=True)
class _ParsedSegment:
    raw_text: str
    quantity: float
    unit: str | None
    food_phrase: str


def _parse_number(token: str) -> float | None:
    """Convert a numeric token (digit or Hindi word) to a float."""
    token = token.strip().lower()
    if token in _HINDI_NUMERALS:
        return float(_HINDI_NUMERALS[token])
    try:
        # Support fractions like "1.5" and integers.
        return float(token)
    except ValueError:
        return None


def _split_text_into_segments(text: str) -> list[str]:
    """Split a Hinglish meal text into candidate food segments."""
    # Split on common connectors and punctuation while keeping the connector
    # out of the segment.
    pattern = re.compile(r"[,;]|\b(aur|and|with|plus|saath)\b", re.IGNORECASE)
    segments: list[str] = []
    for segment in pattern.split(text):
        if segment is None:
            continue
        segment = segment.strip()
        if segment:
            segments.append(segment)
    return segments


def _extract_quantity_and_unit(tokens: list[str]) -> tuple[float, str | None, list[str]]:
    """Extract quantity and unit from the start of a token list.

    Returns a tuple of (quantity, unit, remaining_tokens).
    """
    quantity: float | None = None
    unit: str | None = None
    remaining = list(tokens)

    if not remaining:
        return 1.0, None, remaining

    # First token may be a number.
    if (num := _parse_number(remaining[0])) is not None:
        quantity = num
        remaining = remaining[1:]

    # Next token may be a unit (e.g., "katori", "roti", "bowl").
    if remaining:
        first = remaining[0].lower()
        if first in _UNIT_WEIGHTS:
            unit = first
            remaining = remaining[1:]

    return quantity if quantity is not None else 1.0, unit, remaining


def _parse_segment(segment: str) -> _ParsedSegment:
    """Parse a single segment into quantity, unit, and food phrase."""
    tokens = segment.split()
    # Remove connector filler words at the start.
    while tokens and tokens[0].lower() in _CONNECTORS:
        tokens = tokens[1:]

    quantity, unit, remaining = _extract_quantity_and_unit(tokens)
    food_phrase = " ".join(remaining)

    # Sometimes the unit appears after the food (e.g., "dal 1 bowl").
    if unit is None and remaining:
        last = remaining[-1].lower()
        if last in _UNIT_WEIGHTS:
            unit = last
            food_phrase = " ".join(remaining[:-1])

    # If the unit itself is the food (e.g., "2 roti", "1 bowl" when no food
    # name follows), treat the unit as the food phrase.
    if not food_phrase and unit is not None:
        food_phrase = unit

    # Clean up any trailing connectors.
    food_phrase = re.sub(r"\b(ke|ki|ka)\b$", "", food_phrase, flags=re.IGNORECASE).strip()

    return _ParsedSegment(
        raw_text=segment,
        quantity=quantity,
        unit=unit,
        food_phrase=food_phrase,
    )


def _find_best_food(db: Session, food_phrase: str) -> Food | None:
    """Return the best matching Food row for a food phrase.

    Prefers cooked variants when the phrase is ambiguous (e.g., "dal" maps
    to cooked dal, "rice" to cooked white rice).
    """
    phrase = food_phrase.strip().lower()
    if not phrase:
        return None

    # Exact match on English or Hindi name.
    exact = (
        db.query(Food)
        .filter(
            or_(
                Food.name_en.ilike(phrase),
                Food.name_hi.ilike(phrase),
            )
        )
        .first()
    )
    if exact is not None:
        return exact

    # Partial match on English name, Hindi name, or aliases.
    pattern = f"%{phrase}%"
    candidates = (
        db.query(Food)
        .filter(
            or_(
                Food.name_en.ilike(pattern),
                Food.name_hi.ilike(pattern),
                Food.aliases.ilike(pattern),
            )
        )
        .all()
    )

    if not candidates:
        return None

    # Prefer cooked variants for common words (avoid "parboiled" matching "boiled").
    cooked_pattern = re.compile(r"\b(cooked|boiled|steamed|prepared|plain)\b", re.IGNORECASE)
    for food in candidates:
        if cooked_pattern.search(food.name_en):
            return food

    # Default to the first candidate.
    return candidates[0]


def _compute_qty_g(food: Food | None, segment: _ParsedSegment) -> float:
    """Convert parsed quantity and unit into grams."""
    quantity = segment.quantity
    unit = segment.unit

    if unit == "roti" and food is not None and food.piece_g:
        return quantity * food.piece_g
    if unit in ("roti", "chapati", "paratha"):
        return quantity * _UNIT_WEIGHTS[unit]
    if unit in ("katori", "bowl", "plate", "glass", "cup"):
        if food is not None and food.serving_g:
            return quantity * food.serving_g
        return quantity * _UNIT_WEIGHTS[unit]
    if unit in ("piece", "slice"):
        if food is not None and food.piece_g:
            return quantity * food.piece_g
        return quantity * _UNIT_WEIGHTS[unit]

    if food is not None and food.serving_g:
        return quantity * food.serving_g

    return quantity * _DEFAULT_SERVING_G


def _fallback_item(segment: _ParsedSegment) -> ParsedItem:
    """Build a ParsedItem for an unmatched food phrase."""
    qty_g = _compute_qty_g(None, segment)
    return ParsedItem(
        raw_text=segment.raw_text,
        food_name=segment.food_phrase or "unknown",
        food_id=None,
        matched=False,
        qty_g=round(qty_g, 2),
        serving_description=f"{segment.quantity} {segment.unit or 'serving'} (unmatched)",
        energy_kcal=0.0,
        protein_g=0.0,
        iron_mg=0.0,
        calcium_mg=0.0,
        vit_d_iu=0.0,
        b12_mcg=0.0,
    )


def _item_from_food(food: Food, segment: _ParsedSegment) -> ParsedItem:
    """Build a ParsedItem from a matched Food row and segment."""
    qty_g = _compute_qty_g(food, segment)
    ratio = qty_g / 100.0

    unit_label = segment.unit or "serving"
    return ParsedItem(
        raw_text=segment.raw_text,
        food_name=food.name_en,
        food_id=food.id,
        matched=True,
        qty_g=round(qty_g, 2),
        serving_description=f"{segment.quantity} {unit_label} ({round(qty_g, 0)}g)",
        energy_kcal=round(food.energy_kcal * ratio, 2),
        protein_g=round(food.protein_g * ratio, 2),
        iron_mg=round(food.iron_mg * ratio, 2),
        calcium_mg=round(food.calcium_mg * ratio, 2),
        vit_d_iu=round(food.vit_d_iu * ratio, 2),
        b12_mcg=round(food.b12_mcg * ratio, 2),
    )


def parse_meal(db: Session, text: str) -> ParsedMeal:
    """Parse a Hinglish meal description and return structured nutrients.

    Args:
        db: SQLAlchemy session for food lookups.
        text: Raw Hinglish text (e.g., "2 roti aur 1 bowl dal").

    Returns:
        A :class:`ParsedMeal` with matched items and aggregated totals.
    """
    logger.info("parse_meal_started", text=text)

    segments = _split_text_into_segments(text)
    items: list[ParsedItem] = []

    for segment in segments:
        parsed = _parse_segment(segment)
        if not parsed.food_phrase:
            continue

        food = _find_best_food(db, parsed.food_phrase)
        if food is None:
            item = _fallback_item(parsed)
            logger.info(
                "food_unmatched",
                raw_text=parsed.raw_text,
                food_phrase=parsed.food_phrase,
            )
        else:
            item = _item_from_food(food, parsed)
            logger.info(
                "food_matched",
                raw_text=parsed.raw_text,
                food_id=food.id,
                food_name=food.name_en,
                qty_g=item.qty_g,
            )
        items.append(item)

    total_energy = sum(item.energy_kcal for item in items)
    total_protein = sum(item.protein_g for item in items)
    total_iron = sum(item.iron_mg for item in items)
    total_calcium = sum(item.calcium_mg for item in items)
    total_vit_d = sum(item.vit_d_iu for item in items)
    total_b12 = sum(item.b12_mcg for item in items)

    logger.info(
        "parse_meal_completed",
        text=text,
        item_count=len(items),
        total_energy=total_energy,
        total_iron=total_iron,
    )

    return ParsedMeal(
        transcript=text,
        items=items,
        total_energy_kcal=round(total_energy, 2),
        total_protein_g=round(total_protein, 2),
        total_iron_mg=round(total_iron, 2),
        total_calcium_mg=round(total_calcium, 2),
        total_vit_d_iu=round(total_vit_d, 2),
        total_b12_mcg=round(total_b12, 2),
    )
