import os
import json
import firebase_admin
from firebase_admin import auth, credentials
from pathlib import Path
import structlog

logger = structlog.get_logger()
_firebase_app: firebase_admin.App | None = None


def _initialize() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    cred_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH", "./firebase-service-account.json"
    )

    # 1. Try to read from environment variable first (easier for Render)
    creds_json = os.getenv("FIREBASE_CREDENTIALS")

    if creds_json:
        try:
            cred_dict = json.loads(creds_json)
            # Fix broken newlines that Windows/Render might have messed up
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            cred = credentials.Certificate(cred_dict)
            logger.info("firebase_initialized_from_env_var")
        except Exception as e:
            logger.error("firebase_env_var_parse_failed", error=str(e))
            raise RuntimeError(f"Failed to parse FIREBASE_CREDENTIALS env var: {e}")
    else:
        # 2. Fallback to reading the file
        resolved = Path(cred_path).resolve()
        if not resolved.exists():
            raise RuntimeError(f"Firebase service account file not found: {resolved}")

        with open(resolved, "r") as f:
            cred_dict = json.load(f)
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")

        cred = credentials.Certificate(cred_dict)
        logger.info("firebase_initialized_from_file", path=str(resolved))

    _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_token(id_token: str) -> dict:
    """Verify a Firebase ID token. Returns the decoded token dict."""
    _initialize()
    try:
        return auth.verify_id_token(id_token)
    except Exception as exc:
        logger.error("firebase_verify_token_failed", error=str(exc))
        raise ValueError(f"Invalid Firebase token: {exc}") from exc