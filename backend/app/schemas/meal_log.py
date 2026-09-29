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


class LogMealItem(BaseModel):
    """One confirmed item inside a /log-meal batch request."""

    food_id: str | None = Field(default=None, max_length=36)
    food_name: str = Field(..., max_length=255)
    qty_g: float = Field(..., ge=0)
    energy_kcal: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    iron_mg: float = Field(..., ge=0)
    calcium_mg: float = Field(..., ge=0)
    vit_d_iu: float = Field(..., ge=0)
    b12_mcg: float = Field(..., ge=0)
    notes: str | None = Field(default=None)


class LogMealIn(BaseModel):
    """Request body for confirming and persisting a parsed meal."""

    user_id: str = Field(..., min_length=1, max_length=36)
    items: list[LogMealItem] = Field(..., min_length=1)
    logged_at: datetime | None = Field(default=None)
    meal_type: str | None = Field(default=None, max_length=50)


class LogMealTotals(BaseModel):
    """Aggregated nutrients for the committed meal."""

    energy_kcal: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    iron_mg: float = Field(..., ge=0)
    calcium_mg: float = Field(..., ge=0)
    vit_d_iu: float = Field(..., ge=0)
    b12_mcg: float = Field(..., ge=0)


class LogMealOut(BaseModel):
    """Response after a meal is persisted."""

    model_config = ConfigDict(from_attributes=True)

    logs: list[MealLogRead]
    totals: LogMealTotals
