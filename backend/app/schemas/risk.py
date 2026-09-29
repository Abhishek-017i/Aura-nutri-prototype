from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class NutrientRisk(BaseModel):
    """Risk assessment for a single micronutrient."""

    nutrient: str = Field(..., max_length=50)
    intake: float = Field(..., ge=0)
    target: float = Field(..., gt=0)
    percent: float = Field(..., ge=0)
    risk_level: str = Field(..., pattern=r"^(LOW|MEDIUM|HIGH)$")
    unit: str = Field(..., max_length=20)
    explanation: str


class TrendNutrientStatus(BaseModel):
    """Per-nutrient status for a single day in the trend view."""

    nutrient: str = Field(..., max_length=50)
    status: str = Field(..., pattern=r"^(green|yellow|red)$")
    intake: float = Field(..., ge=0)
    target: float = Field(..., gt=0)
    percent: float = Field(..., ge=0)


class TrendDay(BaseModel):
    """One day of the 14-day nutrient trend."""

    date: date
    nutrients: list[TrendNutrientStatus]
    note: str | None = Field(default=None)


class RiskScore(BaseModel):
    """14-day rolling micronutrient risk score for a user."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    phase: str | None
    window_start: date
    window_end: date
    days_logged: int
    targets: dict[str, float]
    rolling_14d: dict[str, float]
    risk: dict[str, str]
    nutrients: list[NutrientRisk]
    overall_risk: str = Field(..., pattern=r"^(LOW|MEDIUM|HIGH)$")
    trend: list[TrendDay] = Field(default_factory=list)
    disclaimer: str = (
        "AURA-Nutri provides food intelligence, not medical advice. Always consult a "
        "qualified physician or registered dietitian before changing your diet or taking "
        "supplements."
    )
