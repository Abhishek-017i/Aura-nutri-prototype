from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class StreakOut(BaseModel):
    """Public streak and cheat-charm snapshot."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    current_streak: int = Field(..., ge=0)
    longest_streak: int = Field(..., ge=0)
    last_log_date: date | None
    cheat_charms_available: int = Field(..., ge=0)
    cheat_charms_used_this_week: int = Field(..., ge=0)
    next_charm_available_on: datetime | None
