from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DailyProgress(BaseModel):
    """Today's progress for a single nutrient."""

    nutrient: str = Field(..., max_length=50)
    current: float = Field(..., ge=0)
    target: float = Field(..., gt=0)
    percent: float = Field(..., ge=0)
    unit: str = Field(..., max_length=20)


class Dashboard(BaseModel):
    """Dashboard payload for a user."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    phase: str
    date: date
    total_energy_kcal: float = Field(..., ge=0)
    total_protein_g: float = Field(..., ge=0)
    progress: list[DailyProgress]
    recent_logs: int
    disclaimer: str = (
        "AURA-Nutri provides food intelligence, not medical advice. Always consult a "
        "qualified physician or registered dietitian before changing your diet or taking "
        "supplements."
    )
