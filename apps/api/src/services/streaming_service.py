"""
Streaming Service — Manages Server-Sent Events (SSE) for real-time
agent execution visibility.

Publishes execution events to connected clients via Redis pub/sub,
enabling real-time step-by-step updates in the frontend.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

import redis.asyncio as aioredis

from src.config import get_settings

logger = logging.getLogger(__name__)


class StreamingService:
    """Manages SSE event publishing and subscription via Redis pub/sub."""

    def __init__(self) -> None:
        settings = get_settings()
        self._redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )

    def _channel_name(self, execution_id: str) -> str:
        """Get the Redis channel name for an execution."""
        return f"execution:{execution_id}:events"

    async def publish_event(
        self,
        execution_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        """
        Publish an SSE event for an execution.

        Args:
            execution_id: The execution this event belongs to
            event_type: One of the SSE event types (plan_created, step_started, etc.)
            payload: Event-specific data
        """
        event = {
            "event": event_type,
            "data": {
                "execution_id": execution_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": payload,
            },
        }

        channel = self._channel_name(execution_id)
        await self._redis.publish(channel, json.dumps(event))
        logger.debug(f"Published {event_type} event for execution {execution_id}")

    async def subscribe(
        self,
        execution_id: str,
    ) -> AsyncGenerator[str, None]:
        """
        Subscribe to SSE events for an execution.

        Yields formatted SSE event strings ready to send to the client.

        Args:
            execution_id: The execution to subscribe to
        """
        channel = self._channel_name(execution_id)
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    event = json.loads(data)

                    # Format as SSE
                    event_type = event.get("event", "message")
                    event_data = json.dumps(event.get("data", {}))
                    yield f"event: {event_type}\ndata: {event_data}\n\n"

                    # Stop streaming if execution is complete
                    if event_type in (
                        "execution_completed",
                        "execution_failed",
                        "execution_cancelled",
                    ):
                        break

        except asyncio.CancelledError:
            logger.info(f"SSE subscription cancelled for {execution_id}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    async def close(self) -> None:
        """Close the Redis connection."""
        await self._redis.close()


# Singleton instance
_streaming_service: StreamingService | None = None


def get_streaming_service() -> StreamingService:
    """Get or create the streaming service singleton."""
    global _streaming_service
    if _streaming_service is None:
        _streaming_service = StreamingService()
    return _streaming_service
