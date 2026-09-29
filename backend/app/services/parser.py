"""LLM-first meal parser with deterministic fallback.

Sends raw multilingual meal descriptions to a Groq LLM for extraction, then
matches the returned food names against the seeded ICMR-NIN database and
converts quantities to grams. Falls back to the deterministic rule-based parser
when Groq is unavailable so the demo path stays open.
"""

import re
from dataclasses import dataclass

import structlog
from rapidfuzz import fuzz
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Food
from app.schemas.parse import ParsedItem, ParsedMeal
from app.services import groq_client

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

_FRACTIONS = {
    "½": 0.5,
    "⅓": 1.0 / 3.0,
    "¼": 0.25,
    "¾": 0.75,
    "⅔": 2.0 / 3.0,
}

_CONNECTORS = {"aur", "and", "with", "plus", "saath", "ke", "ki", "ka"}

_STOPWORDS = _CONNECTORS | {
    "a",
    "an",
    "the",
    "of",
    "in",
    "ek",
    "do",
    "teen",
    "char",
    "panch",
    "chhe",
    "saat",
    "aath",
    "nau",
    "das",
}

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
    "egg": 50.0,
    "idli": 80.0,
    "dosa": 100.0,
    "thepla": 50.0,
}

_COUNTED_UNITS = {
    "roti",
    "chapati",
    "paratha",
    "piece",
    "slice",
    "egg",
    "idli",
    "dosa",
    "thepla",
}

_DEFAULT_SERVING_G = 100.0

_FOOD_CATALOG: list[str] | None = None


@dataclass(frozen=True)
class _ParsedSegment:
    raw_text: str
    quantity: float
    unit: str | None
    food_phrase: str


def _parse_number(token: str) -> float | None:
    """Convert a numeric token (digit, fraction, or Hindi word) to a float."""
    token = token.strip().lower()
    if token in _HINDI_NUMERALS:
        return float(_HINDI_NUMERALS[token])
    if token in _FRACTIONS:
        return _FRACTIONS[token]
    if "/" in token:
        parts = token.split("/")
        if len(parts) == 2:
            try:
                return float(parts[0]) / float(parts[1])
            except ValueError:
                return None
    try:
        return float(token)
    except ValueError:
        return None


def _parse_quantity_string(qty_str: str) -> tuple[float, str | None]:
    """Convert a free-form quantity string into (quantity, unit).

    Handles explicit grams ("150g"), digits ("2"), Hindi words ("ek"), and
    standard household units ("katori", "roti", "glass").
    """
    s = qty_str.strip().lower()
    if not s:
        return 1.0, None

    gram_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|gram|grams)\b", s)
    if gram_match:
        return float(gram_match.group(1)), "g"

    tokens = s.split()
    quantity: float | None = None
    unit: str | None = None

    for raw_token in tokens:
        token = raw_token.strip(".,;").lower()
        if not token:
            continue
        parsed = _parse_number(token)
        if parsed is not None:
            quantity = parsed
            continue
        if token in _UNIT_WEIGHTS and unit is None:
            unit = token

    return quantity if quantity is not None else 1.0, unit


def _load_food_catalog(db: Session) -> list[str]:
    """Return a cached list of English food names for the LLM prompt."""
    global _FOOD_CATALOG
    if _FOOD_CATALOG is None:
        _FOOD_CATALOG = sorted(row.name_en for row in db.query(Food.name_en).all())
    return _FOOD_CATALOG


def _find_best_food(db: Session, food_phrase: str) -> Food | None:
    """Return the best matching Food row for a free-form food phrase.

    Prefers exact name/alias matches, then scores candidates by token overlap
    and fuzzy string similarity.
    """
    phrase = food_phrase.strip().lower()
    if not phrase:
        return None

    exact = (
        db.query(Food)
        .filter(or_(Food.name_en.ilike(phrase), Food.name_hi.ilike(phrase)))
        .first()
    )
    if exact is not None:
        return exact

    alias_rows = db.query(Food).filter(Food.aliases.isnot(None)).all()
    for food in alias_rows:
        aliases = food.aliases
        if not aliases:
            continue
        for alias in re.split(r"[,;]", aliases):
            if alias.strip().lower() == phrase:
                return food

    tokens = [
        t
        for t in re.findall(r"\b\w+\b", phrase)
        if t not in _STOPWORDS and len(t) > 1
    ]
    if not tokens:
        tokens = [phrase]

    token_hits: dict[str, list[Food]] = {}
    for token in tokens:
        token_hits[token] = (
            db.query(Food)
            .filter(
                or_(
                    Food.name_en.ilike(f"%{token}%"),
                    Food.name_hi.ilike(f"%{token}%"),
                    Food.aliases.ilike(f"%{token}%"),
                )
            )
            .all()
        )

    candidates: dict[str, tuple[Food, float]] = {}
    for token, rows in token_hits.items():
        weight = 1.0 / (len(rows) + 1.0)
        for food in rows:
            previous = candidates.get(food.id)
            candidates[food.id] = (
                food,
                previous[1] + weight if previous else weight,
            )

    if not candidates:
        return None

    prepared_pattern = re.compile(
        r"\b(cooked|prepared|plain|masala|curry|sabzi|bhurji|fry|tadka|"
        r"pulao|biryani|khichdi|kadhi|sambar|poha|upma|idli|dosa|thepla|"
        r"paratha|roti|chapati|paneer|dal|rice)\b",
        re.IGNORECASE,
    )
    name_lower = phrase

    def score(item: tuple[Food, float]) -> float:
        food, weighted_matches = item
        s = weighted_matches * 10.0
        name_en_lower = food.name_en.lower()
        s += fuzz.partial_ratio(name_lower, name_en_lower) / 20.0
        if name_en_lower.startswith(name_lower):
            s += 6.0
        elif name_lower in name_en_lower:
            s += 3.0
        if prepared_pattern.search(food.name_en):
            s += 2.0
        if prepared_pattern.search(food.name_en) and prepared_pattern.search(phrase):
            s += 3.0
        s -= len(food.name_en) / 200.0
        return s

    return max(candidates.values(), key=score)[0]


def _compute_qty_g(food: Food | None, segment: _ParsedSegment) -> float:
    """Convert parsed quantity and unit into grams."""
    quantity = segment.quantity
    unit = segment.unit

    if unit == "g":
        return quantity

    if unit in _COUNTED_UNITS and food is not None and food.piece_g:
        return quantity * food.piece_g
    if unit in _COUNTED_UNITS:
        return quantity * _UNIT_WEIGHTS[unit]

    if unit in ("katori", "bowl", "plate", "glass", "cup"):
        if food is not None and food.serving_g:
            return quantity * food.serving_g
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
        per_100g_energy_kcal=0.0,
        per_100g_protein_g=0.0,
        per_100g_iron_mg=0.0,
        per_100g_calcium_mg=0.0,
        per_100g_vit_d_iu=0.0,
        per_100g_b12_mcg=0.0,
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
        per_100g_energy_kcal=round(food.energy_kcal, 2),
        per_100g_protein_g=round(food.protein_g, 2),
        per_100g_iron_mg=round(food.iron_mg, 2),
        per_100g_calcium_mg=round(food.calcium_mg, 2),
        per_100g_vit_d_iu=round(food.vit_d_iu, 2),
        per_100g_b12_mcg=round(food.b12_mcg, 2),
    )


def _build_llm_system_prompt(catalog: list[str]) -> str:
    """Build a system prompt that includes the available food catalog."""
    catalog_text = "\n".join(f"- {name}" for name in catalog)
    return (
        "You are a precise Indian meal parser. The user describes a meal in English, "
        "Hindi, or Hinglish. Extract each distinct food item and return ONLY a JSON "
        "object with an 'items' array. Each item must have 'food' (short normalized "
        "food name) and 'quantity' (e.g. '1 katori', '2 roti', '1 glass', '150g'). "
        "Optional 'meal' field may be 'breakfast', 'lunch', 'dinner', or 'snack'. "
        "Use standard Indian household units: roti, chapati, paratha, katori, bowl, "
        "plate, glass, cup, piece, slice, egg. Prefer cooked/preparation names where "
        "relevant. If quantity is unclear, assume '1 serving'. Do not add markdown, "
        "explanations, or code fences. Return valid JSON only.\n\n"
        "When possible, map each food to one of these exact names from our database:\n"
        f"{catalog_text}\n\n"
        "If none matches closely, use a short normalized food name and quantity."
    )


async def parse_meal(db: Session, text: str) -> ParsedMeal:
    """Parse a multilingual meal description and return structured nutrients.

    Uses Groq LLM extraction as the primary path and falls back to the
    deterministic rule-based parser if Groq is unavailable or fails twice.
    """
    logger.info("parse_meal_started", text=text)

    try:
        catalog = _load_food_catalog(db)
        system_prompt = _build_llm_system_prompt(catalog)
        llm_items = await groq_client.parse_meal_text(text, system_prompt=system_prompt)
    except Exception as exc:
        logger.warning("llm_parse_failed_fallback", error=str(exc), text=text)
        return _legacy_parse_meal(db, text)

    items: list[ParsedItem] = []
    for raw in llm_items:
        food_name = str(raw.get("food", "")).strip()
        quantity_str = str(raw.get("quantity", "")).strip()
        if not food_name:
            continue

        quantity, unit = _parse_quantity_string(quantity_str)
        segment = _ParsedSegment(
            raw_text=f"{quantity_str} {food_name}".strip(),
            quantity=quantity,
            unit=unit,
            food_phrase=food_name,
        )
        food = _find_best_food(db, food_name)
        if food is None:
            item = _fallback_item(segment)
            logger.info("food_unmatched", raw_text=segment.raw_text, food_phrase=food_name)
        else:
            item = _item_from_food(food, segment)
            logger.info(
                "food_matched",
                raw_text=segment.raw_text,
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


# ---------------------------------------------------------------------------
# Deterministic fallback parser (kept for offline tests and Groq outages)
# ---------------------------------------------------------------------------


def _split_text_into_segments(text: str) -> list[str]:
    """Split a Hinglish meal text into candidate food segments."""
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
    """Extract quantity and unit from the start of a token list."""
    quantity: float | None = None
    unit: str | None = None
    remaining = list(tokens)

    if not remaining:
        return 1.0, None, remaining

    if (num := _parse_number(remaining[0])) is not None:
        quantity = num
        remaining = remaining[1:]

    if remaining:
        first = remaining[0].lower()
        if first in _UNIT_WEIGHTS:
            unit = first
            remaining = remaining[1:]

    return quantity if quantity is not None else 1.0, unit, remaining


def _parse_segment(segment: str) -> _ParsedSegment:
    """Parse a single segment into quantity, unit, and food phrase."""
    tokens = segment.split()
    while tokens and tokens[0].lower() in _CONNECTORS:
        tokens = tokens[1:]

    quantity, unit, remaining = _extract_quantity_and_unit(tokens)
    food_phrase = " ".join(remaining)

    if unit is None and remaining:
        last = remaining[-1].lower()
        if last in _UNIT_WEIGHTS:
            unit = last
            food_phrase = " ".join(remaining[:-1])

    if not food_phrase and unit is not None:
        food_phrase = unit

    food_phrase = re.sub(r"\b(ke|ki|ka)\b$", "", food_phrase, flags=re.IGNORECASE).strip()

    return _ParsedSegment(
        raw_text=segment,
        quantity=quantity,
        unit=unit,
        food_phrase=food_phrase,
    )


def _legacy_parse_meal(db: Session, text: str) -> ParsedMeal:
    """Original rule-based Hinglish meal parser.

    Used as a fallback when the LLM parser is unavailable.
    """
    logger.info("legacy_parse_meal_started", text=text)

    segments = _split_text_into_segments(text)
    items: list[ParsedItem] = []

    for segment in segments:
        parsed = _parse_segment(segment)
        if not parsed.food_phrase:
            continue

        food = _find_best_food(db, parsed.food_phrase)
        if food is None:
            item = _fallback_item(parsed)
            logger.info("legacy_food_unmatched", raw_text=parsed.raw_text, food_phrase=parsed.food_phrase)
        else:
            item = _item_from_food(food, parsed)
            logger.info(
                "legacy_food_matched",
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
        "legacy_parse_meal_completed",
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
