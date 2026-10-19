"""Deprecated: migrated to Firestore in 4.0.4."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """User profile with phase-aware micronutrient targets and streak state."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phase: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default=None
    )

    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dietary_preferences: Mapped[str | None] = mapped_column(String(255), nullable=True)

    target_iron_mg: Mapped[float] = mapped_column(
        Float, nullable=False, default=18.0
    )
    target_calcium_mg: Mapped[float] = mapped_column(
        Float, nullable=False, default=1000.0
    )
    target_vit_d_iu: Mapped[float] = mapped_column(
        Float, nullable=False, default=600.0
    )
    target_b12_mcg: Mapped[float] = mapped_column(
        Float, nullable=False, default=2.4
    )

    # Streak + cheat-day state
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_log_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    cheat_charms_available: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    cheat_charms_used_this_week: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    phase_adjusted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    cheat_day_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
