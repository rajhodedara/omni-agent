"""
Middleware — HTTP interceptors for rate limiting, logging, and auth.
"""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError

from src.config import get_settings

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs the method, path, status, and latency of every request."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"{request.method} {request.url.path} - "
            f"{response.status_code} - {process_time:.4f}s"
        )
        return response


class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """
    Verifies Supabase JWTs and attaches the user ID to request state.
    Allows unauthenticated requests to pass through (handled by specific endpoints).
    """

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        settings = get_settings()
        auth_header = request.headers.get("Authorization")
        
        request.state.user = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Check if the secret is a PEM public key (for the new ECC P-256 keys)
                # or a classic HS256 string secret
                secret = settings.SUPABASE_JWT_SECRET
                algorithms = ["ES256"] if "BEGIN PUBLIC KEY" in secret else ["HS256"]
                
                payload = jwt.decode(
                    token, 
                    secret, 
                    algorithms=algorithms,
                    audience="authenticated"
                )
                request.state.user = {
                    "id": payload.get("sub"),
                    "email": payload.get("email"),
                    "role": payload.get("role")
                }
            except JWTError as e:
                logger.warning(f"Invalid JWT token: {e}")
                
        return await call_next(request)


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Rate limiting stub (to be integrated with Redis)."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # TODO: Implement Redis-based sliding window rate limiter
        return await call_next(request)
