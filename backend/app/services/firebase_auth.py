import os
from pathlib import Path
from typing import Any

import firebase_admin  # type: ignore[import-untyped]
from firebase_admin import auth, credentials

_firebase_app: firebase_admin.App | None = None


def _initialize() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if len(firebase_admin._apps) > 0:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app

    path_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json")
    resolved = Path(path_str).resolve()
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
