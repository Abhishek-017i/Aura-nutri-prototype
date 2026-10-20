from collections.abc import Awaitable, Callable
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.services.firebase_auth import verify_token


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    PUBLIC_PATHS = {
        "/Health",
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api/phase/calculate",
        "/api/admin/groq-status",
        "/api/parse-meal",
        "/api/recalculate-item",
    }

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in self.PUBLIC_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"error": "missing_token", "message": "Authentication required"},
            )

        token = auth_header[7:].strip()
        if not token:
            return JSONResponse(
                status_code=401,
                content={"error": "missing_token", "message": "Authentication required"},
            )

        try:
            decoded: dict[str, Any] = verify_token(token)
        except Exception:
            return JSONResponse(
                status_code=401,
                content={"error": "invalid_token", "message": "Invalid or expired token"},
            )

        request.state.uid = decoded["uid"]
        request.state.email = decoded.get("email")

        return await call_next(request)
