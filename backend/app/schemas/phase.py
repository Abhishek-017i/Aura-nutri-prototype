from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PhasePatch(BaseModel):
    """Request body for adjusting the user's hormonal/metabolic phase."""

    phase: str | None = Field(default=None, max_length=50)
    offset: int | None = Field(default=None, ge=-2, le=2)


class PhaseOut(BaseModel):
    """Response after a successful phase adjustment."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    phase: str
    phase_adjusted_at: datetime | None
    target_iron_mg: float
    target_calcium_mg: float
    target_vit_d_iu: float
    target_b12_mcg: float
