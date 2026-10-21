from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import structlog

from app.services.firebase_auth import verify_token

logger = structlog.get_logger()

PUBLIC_PATHS = {"/Health", "/docs", "/openapi.json", "/redoc", "/api/phase/calculate"}

class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            logger.error("missing_token_header")
            return JSONResponse(
                status_code=401,
                content={"error": "missing_token", "message": "Authentication required"},
            )

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            decoded = verify_token(token)
            request.state.uid = decoded["uid"]
            request.state.email = decoded.get("email")
        except Exception as e:
            # THIS LOGS THE EXACT ERROR TO RENDER
            logger.error("firebase_token_verification_failed", error=str(e))
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_token", "message": "Invalid or expired token"},
            )

        return await call_next(request)