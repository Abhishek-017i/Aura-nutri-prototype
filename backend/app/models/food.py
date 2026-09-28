import uuid

from sqlalchemy import Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Food(Base):
    __tablename__ = "foods"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name_en: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name_hi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    energy_kcal: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protein_g: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    iron_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    calcium_mg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vit_d_iu: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    b12_mcg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    serving_g: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    aliases: Mapped[str | None] = mapped_column(Text, nullable=True)
    piece_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    tier: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
