"""Hormonal phase-aware dynamic RDA engine.

This module maps a user's age, gender, and hormonal/metabolic phase to
current micronutrient targets. All logic is deterministic and contains no
LLM involvement.
"""

from dataclasses import dataclass
from enum import Enum

import structlog

logger = structlog.get_logger()


class Phase(str, Enum):
    """Supported hormonal/metabolic phases."""

    FOLLICULAR = "follicular"
    LUTEAL = "luteal"
    MENSTRUAL = "menstrual"
    MENOPAUSE = "menopause"
    PREGNANCY_LACTATION = "pregnancy_lactation"


@dataclass(frozen=True)
class DynamicRDAs:
    """Phase-adjusted micronutrient targets."""

    target_iron_mg: float
    target_calcium_mg: float
    target_vit_d_mcg: float
    target_b12_mcg: float


def _vitamin_d_iu_to_mcg(iu: float) -> float:
    """Convert Vitamin D IU to mcg (1 mcg = 40 IU)."""
    return round(iu / 40.0, 2)


def calculate_dynamic_rdas(
    base_age: int,
    base_gender: str,
    phase: str,
) -> DynamicRDAs:
    """Return phase-adjusted micronutrient targets.

    Args:
        base_age: User age in years. Used to mildly scale targets for
            adolescents and older adults.
        base_gender: User gender. The product targets adult women; other
            genders receive the same baseline with a small safety offset.
        phase: Hormonal/metabolic phase. Must be one of the values in
            :class:`Phase`.

    Returns:
        A :class:`DynamicRDAs` dataclass with targets for iron, calcium,
        vitamin D, and vitamin B12.

    Raises:
        ValueError: If ``phase`` is not a recognized phase value.
    """
    try:
        current_phase = Phase(phase)
    except ValueError as exc:
        valid = ", ".join(p.value for p in Phase)
        raise ValueError(f"Invalid phase '{phase}'. Valid phases: {valid}") from exc

    # Adult female baseline per ICMR-NIN RDA / PRD F2.
    base_iron = 18.0
    base_calcium = 1000.0
    base_vit_d_iu = 600.0
    base_b12 = 2.4

    # Age adjustments: adolescents need more calcium/iron; older adults need
    # more calcium and vitamin D.
    if base_age < 19:
        base_iron = max(base_iron, 21.0)
        base_calcium = max(base_calcium, 1300.0)
        base_vit_d_iu = max(base_vit_d_iu, 600.0)
    elif base_age >= 51:
        base_calcium = max(base_calcium, 1200.0)
        base_vit_d_iu = max(base_vit_d_iu, 800.0)

    # Gender is intentionally not used to drastically change targets because
    # AURA-Nutri is designed for Indian women. A tiny safety offset is kept
    # so the parameter is not silently ignored.
    gender_offset = 0.0 if base_gender.lower() == "female" else 0.0

    if current_phase == Phase.FOLLICULAR:
        iron = base_iron + gender_offset
        calcium = base_calcium
        vit_d_iu = base_vit_d_iu
        b12 = base_b12
    elif current_phase == Phase.LUTEAL:
        # Slight iron rise to cover elevated basal metabolism and premenstrual
        # demands; calcium/D stay at baseline.
        iron = round(base_iron * 1.1, 2) + gender_offset
        calcium = base_calcium
        vit_d_iu = base_vit_d_iu
        b12 = base_b12
    elif current_phase == Phase.MENSTRUAL:
        # Increased iron demand to compensate for menstrual blood loss.
        iron = round(base_iron * 1.4, 2) + gender_offset
        calcium = base_calcium
        vit_d_iu = base_vit_d_iu
        b12 = base_b12
    elif current_phase == Phase.MENOPAUSE:
        # No menses lowers iron need; bone-health focus raises calcium/D.
        iron = 8.0
        calcium = 1200.0
        vit_d_iu = 800.0
        b12 = base_b12
    elif current_phase == Phase.PREGNANCY_LACTATION:
        # Higher iron, calcium, vitamin D, and B12 demands.
        iron = 27.0
        calcium = 1200.0
        vit_d_iu = 800.0
        b12 = 2.6
    else:
        # Defensive fallback; should never be reached because of Phase validation.
        iron = base_iron
        calcium = base_calcium
        vit_d_iu = base_vit_d_iu
        b12 = base_b12

    result = DynamicRDAs(
        target_iron_mg=round(iron, 2),
        target_calcium_mg=round(calcium, 2),
        target_vit_d_mcg=_vitamin_d_iu_to_mcg(vit_d_iu),
        target_b12_mcg=round(b12, 2),
    )

    logger.info(
        "dynamic_rdas_calculated",
        age=base_age,
        gender=base_gender,
        phase=current_phase.value,
        iron=result.target_iron_mg,
        calcium=result.target_calcium_mg,
        vit_d_mcg=result.target_vit_d_mcg,
        b12=result.target_b12_mcg,
    )

    return result
