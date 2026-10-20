from pydantic import BaseModel, Field


class ParseMealIn(BaseModel):
    """Request body for Hinglish meal parsing."""

    text: str = Field(..., min_length=1, max_length=1000)


class RecalculateItemIn(BaseModel):
    """Request body for recalculating nutrients when quantity is adjusted."""

    food_id: str = Field(..., min_length=1)
    qty_g: float = Field(..., gt=0)


class LlmParsedItem(BaseModel):
    """A single item returned by the LLM meal parser."""

    food: str = Field(..., min_length=1)
    quantity: str = Field(..., min_length=1)
    meal: str | None = Field(default=None, max_length=20)


class LlmParsedMeal(BaseModel):
    """Validated LLM output for a meal parse request."""

    items: list[LlmParsedItem]


class QuantityOption(BaseModel):
    label: str
    qty_g: float
    multiplier: float


class ParsedItem(BaseModel):
    """A single parsed food item with matched nutrients and per-100g base values."""

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
    # Base values allow the frontend to recompute nutrients when quantity is edited.
    per_100g_energy_kcal: float = Field(default=0.0, ge=0)
    per_100g_protein_g: float = Field(default=0.0, ge=0)
    per_100g_iron_mg: float = Field(default=0.0, ge=0)
    per_100g_calcium_mg: float = Field(default=0.0, ge=0)
    per_100g_vit_d_iu: float = Field(default=0.0, ge=0)
    per_100g_b12_mcg: float = Field(default=0.0, ge=0)

    # Phase 1 Track A extensions
    state: str | None = None
    data_quality: str = "verified"  # "verified" | "estimated"
    vit_d_source: str | None = None
    energy_source: str | None = None
    b12_source: str | None = None
    suggestion: str | None = None
    quantity_options: list[QuantityOption] = Field(default_factory=list)


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
    llm_provider: str | None = None
    warnings: list[str] = Field(default_factory=list)
    disclaimer: str = (
        "AURA-Nutri provides food intelligence, not medical advice. Always consult a "
        "qualified physician or registered dietitian before changing your diet or taking "
        "supplements."
    )


class TranscribeOut(BaseModel):
    """Response from the audio transcription endpoint."""

    transcript: str
