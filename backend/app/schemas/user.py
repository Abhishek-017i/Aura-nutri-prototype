from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    phase: str | None = Field(default=None, max_length=50)

    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    dietary_preferences: str | None = Field(default=None, max_length=255)

    target_iron_mg: float = Field(default=18.0, ge=0)
    target_calcium_mg: float = Field(default=1000.0, ge=0)
    target_vit_d_iu: float = Field(default=600.0, ge=0)
    target_b12_mcg: float = Field(default=2.4, ge=0)

    # Streak + cheat-day state
    current_streak: int = Field(default=0, ge=0)
    longest_streak: int = Field(default=0, ge=0)
    last_log_date: date | None = Field(default=None)
    cheat_charms_available: int = Field(default=1, ge=0)
    cheat_charms_used_this_week: int = Field(default=0, ge=0)
    phase_adjusted_at: datetime | None = Field(default=None)
    cheat_day_used_at: datetime | None = Field(default=None)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phase: str | None = Field(default=None, max_length=50)

    age: int | None = Field(default=None, ge=0, le=120)
    gender: str | None = Field(default=None, max_length=50)
    dietary_preferences: str | None = Field(default=None, max_length=255)

    target_iron_mg: float | None = Field(default=None, ge=0)
    target_calcium_mg: float | None = Field(default=None, ge=0)
    target_vit_d_iu: float | None = Field(default=None, ge=0)
    target_b12_mcg: float | None = Field(default=None, ge=0)

    current_streak: int | None = Field(default=None, ge=0)
    longest_streak: int | None = Field(default=None, ge=0)
    last_log_date: date | None = Field(default=None)
    cheat_charms_available: int | None = Field(default=None, ge=0)
    cheat_charms_used_this_week: int | None = Field(default=None, ge=0)
    phase_adjusted_at: datetime | None = Field(default=None)
    cheat_day_used_at: datetime | None = Field(default=None)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class LoginIn(BaseModel):
    """Mock login request.

    This prototype uses a hardcoded password for every user. It is not real
    authentication and must be replaced with a proper identity provider
    (e.g. Firebase phone OTP) before any production use.
    """

    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=100)
    name: str | None = Field(default=None, max_length=255)


class LoginOut(BaseModel):
    """Mock login response."""

    user_id: str
    username: str
    name: str
    phase: str | None
    token: str
