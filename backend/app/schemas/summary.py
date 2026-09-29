from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class NutrientSummary(BaseModel):
    nutrient: str = Field(..., max_length=50)
    intake: float = Field(..., ge=0)
    target: float = Field(..., gt=0)
    percent: float = Field(..., ge=0)
    unit: str = Field(..., max_length=20)


class DailySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    date: date
    total_energy_kcal: float = Field(..., ge=0)
    total_protein_g: float = Field(..., ge=0)
    nutrients: list[NutrientSummary]
    note: str | None = Field(default=None)
