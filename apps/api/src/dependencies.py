from typing import AsyncGenerator
from fastapi import Depends, Request, HTTPException, status
from src.config import Settings, get_settings
from src.models.database import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis

# Cache redis client
_redis_client = None

async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client

def get_current_user(request: Request) -> dict:
    """Dependency to get the authenticated user from the request state."""
    user = getattr(request.state, "user", None)
    if not user:
        settings = get_settings()
        if settings.ENVIRONMENT == "development":
            return {"id": "dev-user-id", "email": "dev@local", "role": "authenticated"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated or invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
