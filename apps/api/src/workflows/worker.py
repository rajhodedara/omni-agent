"""
Temporal Worker — Entry point for running Temporal workers
that process agent execution workflows.

Usage:
    uv run python -m src.workflows.worker
"""

from __future__ import annotations

import asyncio
import logging

from temporalio.client import Client
from temporalio.worker import Worker

from src.config import get_settings
from src.workflows.agent_execution import (
    AgentExecutionWorkflow,
    run_agent_graph,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TASK_QUEUE = "agent-execution-queue"


async def main() -> None:
    """Start the Temporal worker."""
    settings = get_settings()

    logger.info(f"Connecting to Temporal at {settings.TEMPORAL_HOST}...")
    client = await Client.connect(settings.TEMPORAL_HOST)

    logger.info(f"Starting worker on task queue: {TASK_QUEUE}")
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[AgentExecutionWorkflow],
        activities=[run_agent_graph],
    )

    logger.info("Worker is running. Press Ctrl+C to stop.")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
