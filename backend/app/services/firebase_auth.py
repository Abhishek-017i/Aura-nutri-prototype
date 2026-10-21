import base64
import json
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

    settings = get_settings()
    cred_dict: dict[str, Any] | None = None

    # 1. Try raw JSON or base64 from environment variable
    raw_env = settings.firebase_credentials_raw.strip()
    if not raw_env and settings.firebase_service_account_path.strip().startswith("{"):
        raw_env = settings.firebase_service_account_path.strip()

    if raw_env:
        # Check if base64 encoded
        if not raw_env.startswith("{"):
            try:
                decoded_bytes = base64.b64decode(raw_env)
                decoded_str = decoded_bytes.decode("utf-8")
                if decoded_str.strip().startswith("{"):
                    raw_env = decoded_str.strip()
            except Exception:
                pass

        if raw_env.startswith("{"):
            try:
                parsed = json.loads(raw_env)
                if isinstance(parsed, dict):
                    cred_dict = parsed
            except Exception as e:
                logger.error("firebase_json_parse_error", error=str(e))

    # 2. Try file path if cred_dict not found
    if cred_dict is None:
        path_str = settings.firebase_service_account_path
        resolved = Path(path_str).resolve()
        if resolved.exists():
            try:
                content = resolved.read_text(encoding="utf-8")
                parsed = json.loads(content)
                if isinstance(parsed, dict):
                    cred_dict = parsed
            except Exception as e:
                logger.error("firebase_file_read_error", path=str(resolved), error=str(e))

    if cred_dict is None:
        logger.error(
            "firebase_credentials_missing",
            has_raw_env=bool(raw_env),
            file_path=settings.firebase_service_account_path,
        )
        raise RuntimeError(
            "Firebase credentials not found. Provide credentials via FIREBASE_CREDENTIALS, "
            "FIREBASE_SERVICE_ACCOUNT_JSON, firebase-service-account.json environment variable, "
            "or a valid file path at FIREBASE_SERVICE_ACCOUNT_PATH."
        )

    # Normalize private_key if escaped newlines are present
    if "private_key" in cred_dict and isinstance(cred_dict["private_key"], str):
        cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")

    cred = credentials.Certificate(cred_dict)
    _firebase_app = firebase_admin.initialize_app(cred)
    logger.info("firebase_initialized_successfully", project_id=cred_dict.get("project_id"))
    return _firebase_app


def verify_token(id_token: str) -> dict[str, Any]:
    _initialize()
    try:
        decoded: dict[str, Any] = auth.verify_id_token(id_token)
        return decoded
    except Exception as exc:
        raise ValueError(f"Token verification failed: {exc}") from exc