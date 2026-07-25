import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.api.router import api_router
from src.dependencies import get_settings
from src.models.database import init_db
from src.api.middleware import RequestLoggingMiddleware, SupabaseAuthMiddleware, RateLimitingMiddleware
from typing import AsyncGenerator

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Initialize DB and Redis here
    await init_db()
    yield
    # Cleanup DB and Redis connections here

app = FastAPI(
    title="PersonalAI API",
    description="FastAPI backend for PersonalAI autonomous agent",
    version="0.1.0",
    lifespan=lifespan
)

# Apply middlewares (in Starlette/FastAPI, last added runs outermost)
app.add_middleware(SupabaseAuthMiddleware)
app.add_middleware(RateLimitingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
