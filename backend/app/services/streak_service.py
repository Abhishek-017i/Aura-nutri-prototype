"""Deterministic streak and cheat-charm logic.

Streak calculations are pure functions with no LLM involvement and no database
writes. Callers pass a lightweight state snapshot and receive an update plan
that the router can persist.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from app.models import User


@dataclass(frozen=True)
class StreakState:
    """Read-only streak/cheat inputs needed to process a new log."""

    current_streak: int
    longest_streak: int
    last_log_date: date | None
    cheat_charms_available: int


@dataclass(frozen=True)
class StreakUpdate:
    """Result of applying a new log date to a user's streak state."""

    current_streak: int
    longest_streak: int
    last_log_date: date
    consumed_charm: bool
    reset_occurred: bool
    note: str | None


def _days_between(earlier: date, later: date) -> int:
    return (later - earlier).days


def process_log_for_streak(
    state: StreakState,
    log_date: date,
) -> StreakUpdate:
    """Return the new streak state after logging on ``log_date``.

    Rules:
    - First log ever -> streak = 1.
    - Logged yesterday -> increment streak.
    - Logged today -> no streak change.
    - Gap of one or more days:
        - If a cheat charm is available, consume it and preserve the streak.
        - Otherwise reset current streak to 0 and record a reset note.
    - ``longest_streak`` is updated whenever ``current_streak`` exceeds it.
    """
    if state.last_log_date is None:
        new_streak = 1
        return StreakUpdate(
            current_streak=new_streak,
            longest_streak=max(state.longest_streak, new_streak),
            last_log_date=log_date,
            consumed_charm=False,
            reset_occurred=False,
            note=None,
        )

    gap_days = _days_between(state.last_log_date, log_date)

    if gap_days == 0:
        # Same day: streak unchanged but update last_log_date.
        return StreakUpdate(
            current_streak=state.current_streak,
            longest_streak=state.longest_streak,
            last_log_date=log_date,
            consumed_charm=False,
            reset_occurred=False,
            note=None,
        )

    if gap_days == 1:
        new_streak = state.current_streak + 1
        return StreakUpdate(
            current_streak=new_streak,
            longest_streak=max(state.longest_streak, new_streak),
            last_log_date=log_date,
            consumed_charm=False,
            reset_occurred=False,
            note=None,
        )

    # Gap > 1 day.
    if state.cheat_charms_available > 0:
        return StreakUpdate(
            current_streak=state.current_streak,
            longest_streak=state.longest_streak,
            last_log_date=log_date,
            consumed_charm=True,
            reset_occurred=False,
            note=None,
        )

    # Streak breaks because of the missed day(s); today's log starts fresh at 0.
    return StreakUpdate(
        current_streak=0,
        longest_streak=state.longest_streak,
        last_log_date=log_date,
        consumed_charm=False,
        reset_occurred=True,
        note="nutrients reset to 0",
    )


def user_state_from_model(user: User) -> StreakState:
    """Build a pure StreakState from a User ORM instance."""
    return StreakState(
        current_streak=user.current_streak or 0,
        longest_streak=user.longest_streak or 0,
        last_log_date=user.last_log_date,
        cheat_charms_available=user.cheat_charms_available or 0,
    )
