from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

router = APIRouter()


@router.get("/Health")
def get_health() -> dict[str, Any]:
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/api/admin/groq-status")
def get_groq_status() -> dict[str, Any]:
    """Diagnostics endpoint returning per-key Groq status without exposing keys."""
    from app.services.groq_client import get_limiter

    limiter = get_limiter()
    status_dict = limiter.status()
    keys_list = [
        {
            "index": data["index"],
            "tokens": data["tokens"],
            "cooldown_until": data["cooldown_until"],
            "in_cooldown": data["in_cooldown"],
        }
        for data in status_dict.values()
    ]
    return {"keys": keys_list}

