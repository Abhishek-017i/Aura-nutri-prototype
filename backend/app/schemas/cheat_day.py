from datetime import datetime

from pydantic import BaseModel


class CheatDayStatus(BaseModel):
    """Current state of a user's cheat-day cooldown."""

    available: bool
    used_at: datetime | None
    cooldown_seconds: int
    days_remaining: float
    cheat_charms_available: int
    cheat_charms_used_this_week: int
    next_charm_available_on: datetime | None
