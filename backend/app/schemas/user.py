from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phase: str = Field(default="follicular", max_length=50)

    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    dietary_preferences: str | None = Field(default=None, max_length=255)

    target_iron_mg: float = Field(default=18.0, ge=0)
    target_calcium_mg: float = Field(default=1000.0, ge=0)
    target_vit_d_iu: float = Field(default=600.0, ge=0)
    target_b12_mcg: float = Field(default=2.4, ge=0)
    cheat_day_used_at: datetime | None = Field(default=None)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phase: str | None = Field(default=None, max_length=50)

    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    dietary_preferences: str | None = Field(default=None, max_length=255)

    target_iron_mg: float | None = Field(default=None, ge=0)
    target_calcium_mg: float | None = Field(default=None, ge=0)
    target_vit_d_iu: float | None = Field(default=None, ge=0)
    target_b12_mcg: float | None = Field(default=None, ge=0)
    cheat_day_used_at: datetime | None = Field(default=None)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
