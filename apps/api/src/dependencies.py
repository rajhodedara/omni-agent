from typing import AsyncGenerator
from fastapi import Depends
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
