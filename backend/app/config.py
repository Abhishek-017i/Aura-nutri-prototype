import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

_ENV_LOADED = False


def _load_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path, override=False)
    _ENV_LOADED = True


class Settings(BaseModel):
    firebase_service_account_path: str = "./firebase-service-account.json"
    groq_api_keys: list[str] = Field(default_factory=list)
    gemini_api_key: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    groq_api_key: str = ""
    groq_rate_limit_rpm: int = 20
    database_url: str = "sqlite:///./app/data/aura.db"
    embedding_model: str = "all-MiniLM-L6-v2"

    @field_validator("groq_api_keys", mode="before")
    @classmethod
    def parse_groq_api_keys(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return [str(k).strip() for k in v if str(k).strip()]
        if isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(k).strip() for k in parsed if str(k).strip()]
                except Exception:
                    pass
            # Comma-separated fallback
            return [k.strip() for k in stripped.split(",") if k.strip()]
        return []


def get_settings() -> Settings:
    _load_env()

    # Read from environment
    firebase_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    groq_keys_raw = os.getenv("GROQ_API_KEYS", "")
    single_groq_key = os.getenv("GROQ_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    rate_limit_rpm = int(os.getenv("GROQ_RATE_LIMIT_RPM", "20"))
    db_url = os.getenv("DATABASE_URL", "sqlite:///./app/data/aura.db")
    emb_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    groq_keys_val: Any = groq_keys_raw
    if not groq_keys_raw and single_groq_key:
        groq_keys_val = [single_groq_key]

    return Settings(
        firebase_service_account_path=firebase_path,
        groq_api_keys=groq_keys_val,
        gemini_api_key=gemini_key,
        cors_origins=cors_origins,
        groq_api_key=single_groq_key,
        groq_rate_limit_rpm=rate_limit_rpm,
        database_url=db_url,
        embedding_model=emb_model,
    )


settings = get_settings()
