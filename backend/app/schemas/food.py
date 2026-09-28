from pydantic import BaseModel, ConfigDict, Field


class FoodBase(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=255)
    name_hi: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=100)

    energy_kcal: float = Field(default=0.0, ge=0)
    protein_g: float = Field(default=0.0, ge=0)
    iron_mg: float = Field(default=0.0, ge=0)
    calcium_mg: float = Field(default=0.0, ge=0)
    vit_d_iu: float = Field(default=0.0, ge=0)
    b12_mcg: float = Field(default=0.0, ge=0)

    serving_g: float = Field(default=100.0, gt=0)
    aliases: str | None = Field(default=None)
    piece_g: float | None = Field(default=None, gt=0)
    tier: str | None = Field(default=None, max_length=50)
    source: str | None = Field(default=None, max_length=255)


class FoodCreate(FoodBase):
    pass


class FoodRead(FoodBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class FoodSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name_en: str
    name_hi: str | None
    category: str | None
    iron_mg: float
    calcium_mg: float
    vit_d_iu: float
    b12_mcg: float
