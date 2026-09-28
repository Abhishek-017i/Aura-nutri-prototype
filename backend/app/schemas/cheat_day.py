from datetime import datetime

from pydantic import BaseModel


class CheatDayStatus(BaseModel):
    """Current state of a user's cheat-day cooldown."""

    available: bool
    used_at: datetime | None
    cooldown_seconds: int
    days_remaining: float
