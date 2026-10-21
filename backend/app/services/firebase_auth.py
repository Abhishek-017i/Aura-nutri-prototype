from pathlib import Path
from typing import Any

import firebase_admin  # type: ignore[import-untyped]
import structlog
from firebase_admin import auth, credentials

from app.config import get_settings

_firebase_app: firebase_admin.App | None = None
logger = structlog.get_logger()


def _initialize() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if len(firebase_admin._apps) > 0:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    path_str = get_settings().firebase_service_account_path
    resolved = Path(path_str).resolve()
    # Probe the mounted credential format before initialization for the D204 diagnosis.
    raw = resolved.read_text(encoding="utf-8") if resolved.exists() else ""
    # TODO: remove firebase_credential_probe log after D204 is resolved.
    logger.info(
        "firebase_credential_probe",
        path=str(resolved),
        exists=resolved.exists(),
        size_bytes=len(raw),
        starts_with=raw[:30],
        has_escaped_newlines=("\\n" in raw),
    )
    if not resolved.exists():
        raise RuntimeError(f"Firebase service account file not found: {resolved}")

    cred = credentials.Certificate(str(resolved))
    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_token(id_token: str) -> dict[str, Any]:
    _initialize()
    try:
        decoded: dict[str, Any] = auth.verify_id_token(id_token)
        return decoded
    except Exception as exc:
        raise ValueError(f"Token verification failed: {exc}") from exc