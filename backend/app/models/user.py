import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """User profile with phase-aware micronutrient targets."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phase: Mapped[str] = mapped_column(String(50), nullable=False, default="follicular")

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
