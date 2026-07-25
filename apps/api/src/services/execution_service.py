"""
Execution Service — Business logic for managing agent executions.

Handles creating, starting, signaling, and querying executions.
Bridges the API layer with Temporal workflows.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from temporalio.client import Client

from src.config import get_settings
from src.services.streaming_service import get_streaming_service

logger = logging.getLogger(__name__)

TASK_QUEUE = "agent-execution-queue"


class ExecutionService:
    """Manages the lifecycle of agent executions."""

    def __init__(self) -> None:
        self._settings = get_settings()
        self._temporal_client: Client | None = None
        self._streaming = get_streaming_service()

    async def _get_temporal_client(self) -> Client:
        """Get or create the Temporal client."""
        if self._temporal_client is None:
            self._temporal_client = await Client.connect(
                self._settings.TEMPORAL_HOST
            )
        return self._temporal_client

    async def create_execution(
        self,
        user_id: str,
        prompt: str,
        conversation_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Create and start a new agent execution.

        Args:
            user_id: The user who initiated the execution
            prompt: The natural language instruction
            conversation_id: Optional conversation to attach to

        Returns:
            Execution metadata including the execution ID
        """
        execution_id = str(uuid.uuid4())
        workflow_id = f"agent-execution-{execution_id}"

        logger.info(
            f"Creating execution {execution_id} for user {user_id}: "
            f"{prompt[:100]}..."
        )

        # Start the Temporal workflow
        try:
            client = await self._get_temporal_client()

            from src.workflows.agent_execution import AgentExecutionWorkflow

            await client.start_workflow(
                AgentExecutionWorkflow.run,
                args=[execution_id, user_id, prompt],
                id=workflow_id,
                task_queue=TASK_QUEUE,
            )

            logger.info(f"Workflow {workflow_id} started successfully")

        except Exception as e:
            logger.error(f"Failed to start workflow: {e}")
            raise

        # Publish initial SSE event
        await self._streaming.publish_event(
            execution_id=execution_id,
            event_type="execution_started",
            payload={
                "prompt": prompt,
                "status": "pending",
            },
        )

        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "pending",
            "prompt": prompt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    async def signal_execution(
        self,
        execution_id: str,
        signal_type: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, str]:
        """
        Send a signal to a running execution (approve, reject, cancel).

        Args:
            execution_id: The execution to signal
            signal_type: One of 'approve', 'reject', 'cancel'
            data: Optional additional data for the signal
        """
        workflow_id = f"agent-execution-{execution_id}"
        client = await self._get_temporal_client()
        handle = client.get_workflow_handle(workflow_id)

        if signal_type == "cancel":
            await handle.signal("cancel_execution")
            await self._streaming.publish_event(
                execution_id=execution_id,
                event_type="execution_cancelled",
                payload={"reason": "Cancelled by user"},
            )
        elif signal_type in ("approve", "reject"):
            await handle.signal("user_approval", signal_type)
            await self._streaming.publish_event(
                execution_id=execution_id,
                event_type="approval_resolved",
                payload={"decision": signal_type},
            )
        else:
            raise ValueError(f"Unknown signal type: {signal_type}")

        return {"status": "signal_sent", "signal_type": signal_type}

    async def get_execution_status(
        self,
        execution_id: str,
    ) -> dict[str, Any]:
        """Query the current status of an execution."""
        workflow_id = f"agent-execution-{execution_id}"

        try:
            client = await self._get_temporal_client()
            handle = client.get_workflow_handle(workflow_id)
            description = await handle.describe()

            return {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": str(description.status),
                "start_time": (
                    description.start_time.isoformat()
                    if description.start_time
                    else None
                ),
            }

        except Exception as e:
            logger.error(f"Failed to query execution status: {e}")
            return {
                "execution_id": execution_id,
                "status": "unknown",
                "error": str(e),
            }


# Singleton
_execution_service: ExecutionService | None = None


def get_execution_service() -> ExecutionService:
    """Get or create the execution service singleton."""
    global _execution_service
    if _execution_service is None:
        _execution_service = ExecutionService()
    return _execution_service
