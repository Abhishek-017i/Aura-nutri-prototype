from pydantic import BaseModel, Field


class ParseMealIn(BaseModel):
    """Request body for Hinglish meal parsing."""

    text: str = Field(..., min_length=1, max_length=1000)


class ParsedItem(BaseModel):
    """A single parsed food item with matched nutrients."""

    raw_text: str
    food_name: str
    food_id: str | None
    matched: bool
    qty_g: float = Field(..., ge=0)
    serving_description: str
    energy_kcal: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    iron_mg: float = Field(..., ge=0)
    calcium_mg: float = Field(..., ge=0)
    vit_d_iu: float = Field(..., ge=0)
    b12_mcg: float = Field(..., ge=0)


class ParsedMeal(BaseModel):
    """Aggregated result of parsing a Hinglish meal description."""

    transcript: str
    items: list[ParsedItem]
    total_energy_kcal: float = Field(..., ge=0)
    total_protein_g: float = Field(..., ge=0)
    total_iron_mg: float = Field(..., ge=0)
    total_calcium_mg: float = Field(..., ge=0)
    total_vit_d_iu: float = Field(..., ge=0)
    total_b12_mcg: float = Field(..., ge=0)
    disclaimer: str = (
        "AURA-Nutri provides food intelligence, not medical advice. Always consult a "
        "qualified physician or registered dietitian before changing your diet or taking "
        "supplements."
    )
