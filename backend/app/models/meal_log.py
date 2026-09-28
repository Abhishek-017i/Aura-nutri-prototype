import uuid
from datetime import datetime, timezone

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MealLog(Base):
    __tablename__ = "meal_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    food_id: Mapped[str | None] = mapped_column(ForeignKey("foods.id"), nullable=True)
    logged_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
    qty_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    energy_kcal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    iron_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    calcium_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vit_d_iu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    b12_mcg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
