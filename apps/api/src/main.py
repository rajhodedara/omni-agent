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
class ASGICORSMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        origin_bytes = headers.get(b"origin")
        origin = origin_bytes.decode("utf-8") if origin_bytes else "*"

        if scope["method"] == "OPTIONS":
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"access-control-allow-origin", origin.encode("utf-8")),
                    (b"access-control-allow-credentials", b"true"),
                    (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                    (b"access-control-allow-headers", b"content-type, authorization, accept, origin, x-requested-with"),
                    (b"access-control-max-age", b"86400"),
                ]
            })
            await send({
                "type": "http.response.body",
                "body": b"",
            })
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                res_headers = message.get("headers", [])
                res_headers = [h for h in res_headers if not h[0].lower().startswith(b"access-control-")]
                res_headers.extend([
                    (b"access-control-allow-origin", origin.encode("utf-8")),
                    (b"access-control-allow-credentials", b"true"),
                    (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                    (b"access-control-allow-headers", b"content-type, authorization, accept, origin, x-requested-with"),
                ])
                message["headers"] = res_headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(ASGICORSMiddleware)

app.include_router(api_router, prefix="/api")

@app.get("/", tags=["System"])
async def root_check():
    return {"status": "ok", "service": "PersonalAI API"}

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
