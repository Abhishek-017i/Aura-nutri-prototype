"""LLM-first meal parser with deterministic fallback and quantity ladder.

Sends raw multilingual meal descriptions to a fallback chain (Gemini -> Groq -> rule-based),
matches food items against the food database, computes nutrients with quantity resolution ladder,
applies data quality capping, and generates quantity slider options.
"""

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import structlog
import unicodedata
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate
from rapidfuzz import fuzz
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Food
from app.schemas.parse import ParsedItem, ParsedMeal, QuantityOption
from app.services.firestore_client import get_firestore_client
from app.services.groq_client import translate_food_names
from app.services.language_fallback import parse_with_fallback

logger = structlog.get_logger()

# ---------------------------------------------------------------------------
# Flags from dish_flags.csv (Gulam's dataset)
# ---------------------------------------------------------------------------
_DISH_FLAGS: dict[str, dict[str, bool]] = {}


def _load_dish_flags() -> dict[str, dict[str, bool]]:
    global _DISH_FLAGS
    if not _DISH_FLAGS:
        flags_path = Path(__file__).resolve().parent.parent / "data" / "dish_flags.csv"
        if flags_path.exists():
            try:
                df = pd.read_csv(flags_path)
                for _, row in df.iterrows():
                    name = str(row.get("food_name", "")).strip().lower()
                    if name:
                        _DISH_FLAGS[name] = {
                            "flag_oil_suspect": bool(row.get("flag_oil_suspect", False)),
                            "flag_vitd_implausible": bool(row.get("flag_vitd_implausible", False)),
                            "flag_b12_zero_animal": bool(row.get("flag_b12_zero_animal", False)),
                        }
            except Exception as exc:
                logger.error("failed_to_load_dish_flags", error=str(exc))
    return _DISH_FLAGS


_HINDI_NUMERALS = {
    "ek": 1.0,
    "do": 2.0,
    "teen": 3.0,
    "char": 4.0,
    "panch": 5.0,
    "chhe": 6.0,
    "saat": 7.0,
    "aath": 8.0,
    "nau": 9.0,
    "das": 10.0,
    "half": 0.5,
    "aadha": 0.5,
    "adhey": 0.5,
    "adho": 0.5,
    "thoda": 1.0,
    "thodi": 1.0,
    "thode": 1.0,
    "kuch": 1.0,
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

_FOOD_CATALOG: list[str] | None = None


@dataclass(frozen=True)
class _ParsedSegment:
    raw_text: str
    quantity: float
    unit: str | None
    food_phrase: str
    explicit_grams: bool = False
    is_unclear_quantity: bool = False


@dataclass
class MatchedFood:
    id: str
    name_en: str
    name_hi: str | None
    energy_kcal: float
    protein_g: float
    iron_mg: float
    calcium_mg: float
    vit_d_iu: float
    b12_mcg: float
    serving_g: float
    piece_g: float | None
    aliases: list[str]
    state: str = "prepared"


def _infer_state(name_en: str) -> str:
    """Infer food state from its English name."""
    lower = name_en.lower()
    if re.search(r"\b(raw|uncooked)\b", lower):
        return "raw"
    if re.search(r"\b(cooked|boiled|prepared|fried|roasted|baked|steamed)\b", lower):
        return "cooked"
    return "prepared"


def _parse_number(token: str) -> float | None:
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


def _parse_quantity_string(qty_str: str) -> tuple[float, str | None, bool, bool]:
    """Convert quantity string into (quantity, unit, explicit_grams, is_unclear_quantity)."""
    s = qty_str.strip().lower()
    if not s:
        return 1.0, None, False, False

    # Check for unclear quantity indicators
    unclear = any(w in s for w in ["thoda", "thodi", "thode", "kuch", "some", "little"])

    # Explicit grams match: 100g, 100 g, 100gm, 100 grams
    gram_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|gm|gram|grams)\b", s)
    if gram_match:
        return float(gram_match.group(1)), "g", True, unclear

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

    return (quantity if quantity is not None else 1.0), unit, False, unclear


def _load_food_catalog(db: Session) -> list[str]:
    """Return a cached list of food names from Firestore / SQLite for prompt hints."""
    global _FOOD_CATALOG
    if _FOOD_CATALOG is None:
        names: set[str] = set()
        try:
            fs = get_firestore_client()
            for doc in fs.collection("foods").limit(300).stream():
                d = doc.to_dict() or {}
                if d.get("name_en"):
                    names.add(d["name_en"])
        except Exception:
            pass
        if not names:
            names = set(row.name_en for row in db.query(Food.name_en).all())
        _FOOD_CATALOG = sorted(names)
    return _FOOD_CATALOG


def _food_from_firestore_doc(doc_id: str, data: dict[str, Any]) -> MatchedFood:
    name_en = data.get("name_en", "")
    aliases_raw = data.get("aliases", [])
    aliases = aliases_raw if isinstance(aliases_raw, list) else []
    return MatchedFood(
        id=doc_id,
        name_en=name_en,
        name_hi=data.get("name_hi"),
        energy_kcal=float(data.get("energy_kcal", 0.0) or 0.0),
        protein_g=float(data.get("protein_g", 0.0) or 0.0),
        iron_mg=float(data.get("iron_mg", 0.0) or 0.0),
        calcium_mg=float(data.get("calcium_mg", 0.0) or 0.0),
        vit_d_iu=float(data.get("vit_d_iu", 0.0) or 0.0),
        b12_mcg=float(data.get("b12_mcg", 0.0) or 0.0),
        serving_g=float(data.get("serving_g", 150.0) or 150.0),
        piece_g=float(data["piece_g"]) if data.get("piece_g") is not None else None,
        aliases=aliases,
        state=_infer_state(name_en),
    )


def _food_from_sqlite_model(f: Food) -> MatchedFood:
    aliases = [a.strip() for a in re.split(r"[,;]", f.aliases)] if f.aliases else []
    return MatchedFood(
        id=str(f.id),
        name_en=f.name_en,
        name_hi=f.name_hi,
        energy_kcal=float(f.energy_kcal or 0.0),
        protein_g=float(f.protein_g or 0.0),
        iron_mg=float(f.iron_mg or 0.0),
        calcium_mg=float(f.calcium_mg or 0.0),
        vit_d_iu=float(f.vit_d_iu or 0.0),
        b12_mcg=float(f.b12_mcg or 0.0),
        serving_g=float(f.serving_g or 150.0),
        piece_g=float(f.piece_g) if f.piece_g is not None else None,
        aliases=aliases,
        state=_infer_state(f.name_en),
    )


_CACHED_CATALOG: list[MatchedFood] | None = None


def _get_all_foods_catalog(db: Session) -> list[MatchedFood]:
    global _CACHED_CATALOG
    if _CACHED_CATALOG is not None:
        return _CACHED_CATALOG

    foods: list[MatchedFood] = []
    seen_ids: set[str] = set()

    # 1. Load from foods_import.csv (1012 dishes)
    csv_1012 = Path(__file__).resolve().parent.parent / "data" / "foods_import.csv"
    if csv_1012.exists():
        try:
            df2 = pd.read_csv(csv_1012)
            for idx, row in df2.iterrows():
                name_en = str(row.get("name_en", "")).strip()
                if not name_en:
                    continue
                slug = re.sub(r"[\s_-]+", "-", re.sub(r"[^\w\s-]", "", name_en.lower())).strip("-")[:40]
                food_id = f"{slug}-{idx+1:03d}"
                seen_ids.add(food_id)
                aliases_raw = row.get("aliases")
                aliases = [a.strip() for a in str(aliases_raw).split(",") if a.strip()] if pd.notna(aliases_raw) else []
                piece = row.get("piece_g")
                piece_g = float(piece) if pd.notna(piece) else None
                serving = row.get("serving_g")
                serving_g = float(serving) if pd.notna(serving) else 150.0

                foods.append(
                    MatchedFood(
                        id=food_id,
                        name_en=name_en,
                        name_hi=str(row.get("name_hi", "")) if pd.notna(row.get("name_hi")) else None,
                        energy_kcal=float(row.get("energy_kcal", 0.0) or 0.0),
                        protein_g=float(row.get("protein_g", 0.0) or 0.0),
                        iron_mg=float(row.get("iron_mg", 0.0) or 0.0),
                        calcium_mg=float(row.get("calcium_mg", 0.0) or 0.0),
                        vit_d_iu=float(row.get("vit_d_iu", 0.0) or 0.0),
                        b12_mcg=float(row.get("b12_mcg", 0.0) or 0.0),
                        serving_g=serving_g,
                        piece_g=piece_g,
                        aliases=aliases,
                        state=_infer_state(name_en),
                    )
                )
        except Exception as exc:
            logger.warning("failed_to_load_foods_import_csv", error=str(exc))

    # 2. Load from ifct_seed_v2.csv (166 core foods)
    csv_166 = Path(__file__).resolve().parent.parent / "data" / "ifct_seed_v2.csv"
    if csv_166.exists():
        try:
            df1 = pd.read_csv(csv_166)
            for idx, row in df1.iterrows():
                name_en = str(row.get("name_en", "")).strip()
                if not name_en:
                    continue
                slug = re.sub(r"[\s_-]+", "-", re.sub(r"[^\w\s-]", "", name_en.lower())).strip("-")[:40]
                food_id = f"ifct-{slug}-{idx+1:03d}"
                seen_ids.add(food_id)
                aliases_raw = row.get("aliases")
                aliases = [a.strip() for a in str(aliases_raw).split(",") if a.strip()] if pd.notna(aliases_raw) else []
                piece = row.get("piece_g")
                piece_g = float(piece) if pd.notna(piece) else None
                serving = row.get("serving_g")
                serving_g = float(serving) if pd.notna(serving) else 150.0

                foods.append(
                    MatchedFood(
                        id=food_id,
                        name_en=name_en,
                        name_hi=str(row.get("name_hi", "")) if pd.notna(row.get("name_hi")) else None,
                        energy_kcal=float(row.get("energy_kcal", 0.0) or 0.0),
                        protein_g=float(row.get("protein_g", 0.0) or 0.0),
                        iron_mg=float(row.get("iron_mg", 0.0) or 0.0),
                        calcium_mg=float(row.get("calcium_mg", 0.0) or 0.0),
                        vit_d_iu=float(row.get("vit_d_iu", 0.0) or 0.0),
                        b12_mcg=float(row.get("b12_mcg", 0.0) or 0.0),
                        serving_g=serving_g,
                        piece_g=piece_g,
                        aliases=aliases,
                        state=_infer_state(name_en),
                    )
                )
        except Exception as exc:
            logger.warning("failed_to_load_ifct_seed_v2_csv", error=str(exc))

    # 3. Supplement with SQLite database rows if any missing
    try:
        sqlite_foods = db.query(Food).all()
        for f in sqlite_foods:
            if str(f.id) not in seen_ids:
                foods.append(_food_from_sqlite_model(f))
                seen_ids.add(str(f.id))
    except Exception:
        pass

    _CACHED_CATALOG = foods
    return _CACHED_CATALOG


def _find_best_food_all(db: Session, food_phrase: str) -> MatchedFood | None:
    """Find the best food matching the phrase, preferring cooked/prepared over raw."""
    phrase = food_phrase.strip().lower()
    if not phrase:
        return None

    catalog = _get_all_foods_catalog(db)

    # 1. Exact or alias match
    exact_candidates: list[MatchedFood] = []
    partial_candidates: list[MatchedFood] = []

    for food in catalog:
        n_en = food.name_en.lower()
        n_hi = (food.name_hi or "").lower()
        al = [a.lower() for a in food.aliases]

        if phrase == n_en or phrase == n_hi or phrase in al:
            exact_candidates.append(food)
        elif phrase in n_en or any(phrase in a for a in al):
            partial_candidates.append(food)

    candidates = exact_candidates if exact_candidates else partial_candidates

    if not candidates:
        # Fuzzy matching
        scored: list[tuple[float, MatchedFood]] = []
        for food in catalog:
            score = fuzz.token_set_ratio(phrase, food.name_en.lower())
            if score >= 50:
                scored.append((score, food))
        scored.sort(key=lambda x: x[0], reverse=True)
        candidates = [x[1] for x in scored[:15]]

    if not candidates:
        return None

    # Cooked vs Raw preference ladder
    dish_tokens = {"dal", "rice", "chawal", "roti", "chapati"}
    is_dish_request = any(dt in phrase for dt in dish_tokens)

    def candidate_score(c: MatchedFood) -> float:
        s = fuzz.token_sort_ratio(phrase, c.name_en.lower())
        if c.name_en.lower() == phrase:
            s += 50
        elif c.name_en.lower().startswith(phrase):
            s += 20

        if is_dish_request:
            if c.state in ("cooked", "prepared"):
                s += 40
            elif c.state == "raw":
                s -= 50
        return float(s)

    candidates.sort(key=candidate_score, reverse=True)
    return candidates[0]


def _resolve_quantity_g(food: MatchedFood | None, segment: _ParsedSegment) -> tuple[float, list[str]]:
    """Quantity resolution ladder:

    1. Explicit grams (highest priority): "100g" -> 100
    2. Explicit unit conversion:
       - "katori": if cooked/prepared -> serving_g (default 150); if raw -> warn & serving_g
       - "roti": count * piece_g (default 40 each)
       - "bowl": serving_g * 1.0 (or 200.0)
       - "plate": serving_g * 2.0 (or 250.0)
       - "glass": serving_g * 1.2 (or 250.0)
       - "cup": serving_g * 1.0 (or 200.0)
    3. Fallback if piece_g is null: qty_g = serving_g
    4. Final fallback: qty_g = 100.0 (never 0)
    """
    warnings: list[str] = []
    qty = segment.quantity
    unit = segment.unit

    if segment.explicit_grams or unit == "g":
        return max(qty, 1.0), warnings

    serving_g = (food.serving_g if food and food.serving_g else None)
    piece_g = (food.piece_g if food and food.piece_g else None)

    if unit in ("roti", "chapati", "paratha", "thepla", "egg", "idli", "dosa", "piece", "slice"):
        item_weight = piece_g or _UNIT_WEIGHTS.get(unit, 40.0)
        return max(qty * item_weight, 1.0), warnings

    if unit == "katori":
        base = serving_g if serving_g else 150.0
        if food and food.state == "raw":
            warnings.append(f"raw form '{food.name_en}', using serving_g as fallback")
        return max(qty * base, 1.0), warnings

    if unit == "bowl":
        base = (serving_g * 1.0) if serving_g else 200.0
        return max(qty * base, 1.0), warnings

    if unit == "plate":
        base = (serving_g * 2.0) if serving_g else 250.0
        return max(qty * base, 1.0), warnings

    if unit == "glass":
        base = (serving_g * 1.2) if serving_g else 250.0
        return max(qty * base, 1.0), warnings

    if unit == "cup":
        base = (serving_g * 1.0) if serving_g else 200.0
        return max(qty * base, 1.0), warnings

    # Fallbacks
    if piece_g is not None and qty > 0:
        return max(qty * piece_g, 1.0), warnings
    if serving_g is not None:
        return max(qty * serving_g, 1.0), warnings

    return max(qty * 100.0, 1.0), warnings


def _generate_quantity_options(
    food: MatchedFood,
    current_qty_g: float,
    unit: str | None,
    quantity_num: float,
) -> list[QuantityOption]:
    """Generate 3 slider choices (small, medium, large) around serving or pieces."""
    options: list[QuantityOption] = []
    is_counted = unit in _COUNTED_UNITS or (food.piece_g is not None and food.piece_g > 0)

    if is_counted:
        count = max(int(round(quantity_num)), 1)
        piece_wt = food.piece_g or _UNIT_WEIGHTS.get(unit or "piece", 40.0)
        c_small = max(count - 1, 1)
        c_med = count
        c_large = count + 1
        options = [
            QuantityOption(label=f"{c_small} piece", qty_g=round(c_small * piece_wt, 1), multiplier=round(c_small / count, 2)),
            QuantityOption(label=f"{c_med} piece", qty_g=round(c_med * piece_wt, 1), multiplier=1.0),
            QuantityOption(label=f"{c_large} piece", qty_g=round(c_large * piece_wt, 1), multiplier=round(c_large / count, 2)),
        ]
    else:
        base_serving = food.serving_g if food.serving_g else 150.0
        options = [
            QuantityOption(label="small", qty_g=round(base_serving * 0.66, 1), multiplier=0.66),
            QuantityOption(label="medium", qty_g=round(base_serving * 1.0, 1), multiplier=1.0),
            QuantityOption(label="large", qty_g=round(base_serving * 1.47, 1), multiplier=1.47),
        ]
    return options


def _apply_flags_capping(
    food_name: str,
    energy_kcal: float,
    vit_d_iu: float,
    b12_mcg: float,
) -> tuple[float, str | None, float, str | None, float, str | None, str]:
    """Apply Gulam's dish_flags capping and data_quality assignment."""
    flags = _load_dish_flags().get(food_name.strip().lower(), {})
    flag_oil = flags.get("flag_oil_suspect", False)
    flag_vitd = flags.get("flag_vitd_implausible", False)
    flag_b12 = flags.get("flag_b12_zero_animal", False)

    energy_val = energy_kcal
    energy_src: str | None = None
    if flag_oil:
        energy_val = min(energy_kcal, 550.0)
        energy_src = "capped_oil_suspect"

    vit_d_val = vit_d_iu
    vit_d_src: str | None = None
    if flag_vitd:
        vit_d_val = min(vit_d_iu, 5.0)
        vit_d_src = "capped_implausible_data"

    b12_src: str | None = None
    if flag_b12:
        b12_src = "assumed_zero_unverified"

    data_quality = "estimated" if (flag_oil or flag_vitd or flag_b12) else "verified"
    return energy_val, energy_src, vit_d_val, vit_d_src, b12_mcg, b12_src, data_quality


def _build_parsed_item_from_match(
    food: MatchedFood,
    segment: _ParsedSegment,
    qty_g: float,
) -> ParsedItem:
    ratio = qty_g / 100.0

    # Base per 100g before capping
    base_energy = food.energy_kcal
    base_protein = food.protein_g
    base_iron = food.iron_mg
    base_calcium = food.calcium_mg
    base_vit_d = food.vit_d_iu
    base_b12 = food.b12_mcg

    # Scaled
    calc_energy = base_energy * ratio
    calc_protein = base_protein * ratio
    calc_iron = base_iron * ratio
    calc_calcium = base_calcium * ratio
    calc_vit_d = base_vit_d * ratio
    calc_b12 = base_b12 * ratio

    # Apply caps
    energy_c, e_src, vit_d_c, v_src, b12_c, b_src, dq = _apply_flags_capping(
        food.name_en, calc_energy, calc_vit_d, calc_b12
    )

    options = _generate_quantity_options(food, qty_g, segment.unit, segment.quantity)
    unit_label = segment.unit or "serving"

    return ParsedItem(
        raw_text=segment.raw_text,
        food_name=food.name_en,
        food_id=food.id,
        matched=True,
        qty_g=round(qty_g, 2),
        serving_description=f"{segment.quantity} {unit_label} ({round(qty_g, 0)}g)",
        energy_kcal=round(energy_c, 2),
        protein_g=round(calc_protein, 2),
        iron_mg=round(calc_iron, 2),
        calcium_mg=round(calc_calcium, 2),
        vit_d_iu=round(vit_d_c, 2),
        b12_mcg=round(b12_c, 2),
        per_100g_energy_kcal=round(base_energy, 2),
        per_100g_protein_g=round(base_protein, 2),
        per_100g_iron_mg=round(base_iron, 2),
        per_100g_calcium_mg=round(base_calcium, 2),
        per_100g_vit_d_iu=round(base_vit_d, 2),
        per_100g_b12_mcg=round(base_b12, 2),
        state=food.state,
        data_quality=dq,
        energy_source=e_src,
        vit_d_source=v_src,
        b12_source=b_src,
        quantity_options=options,
    )


def _build_unmatched_item(
    segment: _ParsedSegment | None = None,
    qty_g: float = 100.0,
    suggestion: str = "Naya item add karein?",
    food_phrase: str | None = None,
    qty_str: str | None = None,
) -> ParsedItem:
    if segment is not None:
        unit_label = segment.unit or "serving"
        raw_text = segment.raw_text
        food_name = segment.food_phrase or "unknown"
        serving_desc = f"{segment.quantity} {unit_label} (unmatched)"
    else:
        raw_text = f"{qty_str or '1'} {food_phrase or 'unknown'}".strip()
        food_name = food_phrase or "unknown"
        serving_desc = f"{qty_str or '1 serving'} (unmatched)"

    return ParsedItem(
        raw_text=raw_text,
        food_name=food_name,
        food_id=None,
        matched=False,
        suggestion=suggestion,
        qty_g=round(qty_g, 2),
        serving_description=serving_desc,
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
        state=None,
        data_quality="estimated",
        quantity_options=[],
    )


def recalculate_single_item(food: MatchedFood, qty_g: float) -> ParsedItem:
    """Recalculate nutrients for a given food and new qty_g (used by slider endpoint)."""
    seg = _ParsedSegment(
        raw_text=f"{qty_g}g {food.name_en}",
        quantity=qty_g,
        unit="g",
        food_phrase=food.name_en,
        explicit_grams=True,
    )
    return _build_parsed_item_from_match(food, seg, qty_g)


async def parse_meal(db: Session, text: str) -> ParsedMeal:
    """Full nutrient runtime meal parser with fallback chain, quantity ladder, and caps."""
    logger.info("parse_meal_started", text=text)

    catalog = _load_food_catalog(db)
    catalog_hint = "\n".join(f"- {name}" for name in catalog[:100])

    llm_items: list[dict[str, Any]] = []
    provider: str | None = None
    warnings: list[str] = []

    try:
        llm_items, provider = await parse_with_fallback(text, catalog_hint=catalog_hint)
    except Exception as exc:
        logger.warning("llm_fallback_chain_failed_falling_back_to_legacy", error=str(exc))
        legacy = _legacy_parse_meal(db, text)
        return legacy

    raw_items: list[ParsedItem] = []
    for raw in llm_items:
        food_phrase = str(raw.get("food", "")).strip()
        qty_str = str(raw.get("quantity", "")).strip()
        if not food_phrase:
            continue

        # If LLM output is non-ASCII (Hindi/Urdu/other script), ask the LLM
        # to translate it to standard English romanized spelling. Do NOT
        # use phonetic romanization — it produces spellings (sbzi, daal)
        # that match wrong DB entries.
        if not food_phrase.isascii():
            logger.warning("llm_output_non_ascii_translating_via_llm", original=food_phrase)
            try:
                translated_list = await translate_food_names([food_phrase])
                translated = translated_list[0] if translated_list else ""
                if translated and translated.isascii():
                    logger.info("translated_food_via_llm", original=food_phrase, translated=translated)
                    food_phrase = translated
                else:
                    logger.warning("llm_translation_still_non_ascii", original=food_phrase, translated=translated)
                    raw_items.append(
                        _build_unmatched_item(
                            food_phrase=food_phrase,
                            qty_str=qty_str,
                            suggestion="Please type the food name in English.",
                        )
                    )
                    warnings.append(f"Could not translate '{food_phrase}' to English.")
                    continue
            except Exception as exc:
                logger.error("llm_translation_failed", error=str(exc), original=food_phrase)
                raw_items.append(
                    _build_unmatched_item(
                        food_phrase=food_phrase,
                        qty_str=qty_str,
                        suggestion="Please type the food name in English.",
                    )
                )
                warnings.append(f"Could not translate '{food_phrase}' to English.")
                continue

        qty_num, unit, exp_g, unclear = _parse_quantity_string(qty_str)
        if unclear:
            warnings.append("quantity unclear")

        seg = _ParsedSegment(
            raw_text=f"{qty_str} {food_phrase}".strip(),
            quantity=qty_num,
            unit=unit,
            food_phrase=food_phrase,
            explicit_grams=exp_g,
            is_unclear_quantity=unclear,
        )

        food = _find_best_food_all(db, food_phrase)
        if food is None:
            qty_g, w_list = _resolve_quantity_g(None, seg)
            warnings.extend(w_list)
            item = _build_unmatched_item(seg, qty_g)
            warnings.append(f"Khana nahi pehchana: '{food_phrase}'. Naya item add karein?")
        else:
            qty_g, w_list = _resolve_quantity_g(food, seg)
            warnings.extend(w_list)
            item = _build_parsed_item_from_match(food, seg, qty_g)

        raw_items.append(item)

    # Multi-item merging: if same food appears twice, merge and sum qty_g
    merged_items: dict[str, ParsedItem] = {}
    items: list[ParsedItem] = []

    for item in raw_items:
        key = item.food_id if item.food_id else f"unmatched_{item.food_name}"
        if key in merged_items:
            existing = merged_items[key]
            new_qty = existing.qty_g + item.qty_g
            # scale nutrients
            scale = new_qty / (existing.qty_g if existing.qty_g > 0 else 1.0)
            existing.qty_g = round(new_qty, 2)
            existing.energy_kcal = round(existing.energy_kcal * scale, 2)
            existing.protein_g = round(existing.protein_g * scale, 2)
            existing.iron_mg = round(existing.iron_mg * scale, 2)
            existing.calcium_mg = round(existing.calcium_mg * scale, 2)
            existing.vit_d_iu = round(existing.vit_d_iu * scale, 2)
            existing.b12_mcg = round(existing.b12_mcg * scale, 2)
            # re-apply caps
            e_c, _, v_c, _, b_c, _, dq = _apply_flags_capping(
                existing.food_name, existing.energy_kcal, existing.vit_d_iu, existing.b12_mcg
            )
            existing.energy_kcal = round(e_c, 2)
            existing.vit_d_iu = round(v_c, 2)
            existing.data_quality = dq
        else:
            merged_items[key] = item
            items.append(item)

    total_energy = sum(i.energy_kcal for i in items)
    total_protein = sum(i.protein_g for i in items)
    total_iron = sum(i.iron_mg for i in items)
    total_calcium = sum(i.calcium_mg for i in items)
    total_vit_d = sum(i.vit_d_iu for i in items)
    total_b12 = sum(i.b12_mcg for i in items)

    return ParsedMeal(
        transcript=text,
        items=items,
        total_energy_kcal=round(total_energy, 2),
        total_protein_g=round(total_protein, 2),
        total_iron_mg=round(total_iron, 2),
        total_calcium_mg=round(total_calcium, 2),
        total_vit_d_iu=round(total_vit_d, 2),
        total_b12_mcg=round(total_b12, 2),
        llm_provider=provider,
        warnings=list(dict.fromkeys(warnings)),  # deduplicate warnings
    )


# ---------------------------------------------------------------------------
# Deterministic fallback parser
# ---------------------------------------------------------------------------


def _split_text_into_segments(text: str) -> list[str]:
    pattern = re.compile(r"[,;]|\b(aur|and|with|plus|saath)\b", re.IGNORECASE)
    segments: list[str] = []
    for segment in pattern.split(text):
        if segment is None:
            continue
        segment = segment.strip()
        if segment:
            segments.append(segment)
    return segments


def _legacy_parse_meal(db: Session, text: str) -> ParsedMeal:
    segments = _split_text_into_segments(text)
    items: list[ParsedItem] = []
    warnings: list[str] = []

    for seg_text in segments:
        tokens = seg_text.split()
        while tokens and tokens[0].lower() in _CONNECTORS:
            tokens = tokens[1:]
        if not tokens:
            continue

        qty_str = tokens[0]
        parsed_num = _parse_number(qty_str)
        if parsed_num is not None:
            tokens = tokens[1:]
        else:
            parsed_num = 1.0

        unit = None
        if tokens and tokens[0].lower() in _UNIT_WEIGHTS:
            unit = tokens[0].lower()
            tokens = tokens[1:]

        food_phrase = " ".join(tokens).strip()
        if unit is None and tokens and tokens[-1].lower() in _UNIT_WEIGHTS:
            unit = tokens[-1].lower()
            food_phrase = " ".join(tokens[:-1]).strip()

        seg = _ParsedSegment(
            raw_text=seg_text,
            quantity=parsed_num,
            unit=unit,
            food_phrase=food_phrase,
            explicit_grams=(unit == "g"),
        )
        food = _find_best_food_all(db, food_phrase)
        if food is None:
            qty_g, w = _resolve_quantity_g(None, seg)
            warnings.extend(w)
            warnings.append(f"Khana nahi pehchana: '{food_phrase}'. Naya item add karein?")
            items.append(_build_unmatched_item(seg, qty_g))
        else:
            qty_g, w = _resolve_quantity_g(food, seg)
            warnings.extend(w)
            items.append(_build_parsed_item_from_match(food, seg, qty_g))

    total_energy = sum(i.energy_kcal for i in items)
    total_protein = sum(i.protein_g for i in items)
    total_iron = sum(i.iron_mg for i in items)
    total_calcium = sum(i.calcium_mg for i in items)
    total_vit_d = sum(i.vit_d_iu for i in items)
    total_b12 = sum(i.b12_mcg for i in items)

    return ParsedMeal(
        transcript=text,
        items=items,
        total_energy_kcal=round(total_energy, 2),
        total_protein_g=round(total_protein, 2),
        total_iron_mg=round(total_iron, 2),
        total_calcium_mg=round(total_calcium, 2),
        total_vit_d_iu=round(total_vit_d, 2),
        total_b12_mcg=round(total_b12, 2),
        llm_provider=None,
        warnings=list(dict.fromkeys(warnings)),
    )
