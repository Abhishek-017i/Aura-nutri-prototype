from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MealLogBase(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    food_id: str | None = Field(default=None, max_length=36)
    food_name: str | None = Field(default=None, max_length=255)

    logged_at: datetime = Field(default_factory=datetime.utcnow)
    meal_type: str | None = Field(default=None, max_length=50)
    qty_g: float = Field(default=0.0, ge=0)

    energy_kcal: float = Field(default=0.0, ge=0)
    protein_g: float = Field(default=0.0, ge=0)
    iron_mg: float = Field(default=0.0, ge=0)
    calcium_mg: float = Field(default=0.0, ge=0)
    vit_d_iu: float = Field(default=0.0, ge=0)
    b12_mcg: float = Field(default=0.0, ge=0)

    notes: str | None = Field(default=None)


class MealLogCreate(MealLogBase):
    pass


class MealLogRead(MealLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
