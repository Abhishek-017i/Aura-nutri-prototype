import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_LOADED = False


def _load_env() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path, override=False)
    _ENV_LOADED = True


class Settings:
    def __init__(self) -> None:
        _load_env()
        self.groq_api_key: str = os.getenv("GROQ_API_KEY", "")
        self.groq_rate_limit_rpm: int = int(os.getenv("GROQ_RATE_LIMIT_RPM", "20"))
        self.database_url: str = os.getenv(
            "DATABASE_URL", "sqlite:///./app/data/aura.db"
        )
        self.embedding_model: str = os.getenv(
            "EMBEDDING_MODEL", "all-MiniLM-L6-v2"
        )


settings = Settings()
