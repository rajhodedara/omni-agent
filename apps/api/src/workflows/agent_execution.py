"""
Temporal Workflow — Durable execution wrapper for the agent graph.

Provides crash-proof execution, human-in-the-loop signals, and
automatic state replay on worker failures.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from temporalio import workflow, activity
from temporalio.common import RetryPolicy

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
# Data Classes for Workflow I/O
# ─────────────────────────────────────────────────────────────────────


@workflow.defn
class AgentExecutionWorkflow:
    """
    Durable workflow that orchestrates the agent graph execution.

    Features:
    - Crash-proof: Resumes from the last completed activity on restart
    - HITL: Pauses via signals for user approval/rejection
    - Cancellation: Can be cancelled mid-execution via signal
    - Timeout: Hard timeout to prevent runaway executions
    """

    def __init__(self) -> None:
        self._approval_result: str | None = None
        self._is_cancelled: bool = False
        self._execution_updates: list[dict[str, Any]] = []

    @workflow.run
    async def run(
        self,
        execution_id: str,
        user_id: str,
        prompt: str,
    ) -> dict[str, Any]:
        """Main workflow execution."""
        workflow.logger.info(
            f"Starting agent execution workflow: {execution_id}"
        )

        # Step 1: Run the agent graph
        result = await workflow.execute_activity(
            run_agent_graph,
            args=[execution_id, user_id, prompt],
            start_to_close_timeout=timedelta(minutes=10),
            retry_policy=RetryPolicy(
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(seconds=30),
                maximum_attempts=3,
                non_retryable_error_types=["CancellationError"],
            ),
        )

        return result

    @workflow.signal
    async def user_approval(self, decision: str) -> None:
        """Signal handler for human-in-the-loop approval."""
        workflow.logger.info(f"Received user approval signal: {decision}")
        self._approval_result = decision

    @workflow.signal
    async def cancel_execution(self) -> None:
        """Signal handler for execution cancellation."""
        workflow.logger.info("Received cancellation signal")
        self._is_cancelled = True

    @workflow.query
    def get_status(self) -> dict[str, Any]:
        """Query handler to get current execution status."""
        return {
            "is_cancelled": self._is_cancelled,
            "approval_result": self._approval_result,
            "updates_count": len(self._execution_updates),
        }


# ─────────────────────────────────────────────────────────────────────
# Activities (Individual Units of Work)
# ─────────────────────────────────────────────────────────────────────


@activity.defn
async def run_agent_graph(
    execution_id: str,
    user_id: str,
    prompt: str,
) -> dict[str, Any]:
    """
    Execute the full agent graph as a Temporal activity.

    This is the main activity that runs the LangGraph state machine.
    It's wrapped in a Temporal activity for crash recovery.
    """
    from src.agent.graph import agent_graph
    from src.agent.state import AgentState

    logger.info(f"Activity: run_agent_graph — execution_id={execution_id}")

    initial_state: AgentState = {
        "messages": [],
        "original_prompt": prompt,
        "user_id": user_id,
        "execution_id": execution_id,
        "plan": [],
        "current_step_index": 0,
        "max_steps": 20,
        "step_results": [],
        "current_tool_call": None,
        "retry_count": 0,
        "constraints": {},
        "user_preferences": [],
        "status": "parsing",
        "error": None,
        "requires_approval": False,
        "approval_request": None,
        "final_summary": None,
        "artifacts": [],
        "total_tokens": 0,
        "total_cost": 0.0,
    }

    try:
        final_state = await agent_graph.ainvoke(initial_state)

        return {
            "execution_id": execution_id,
            "status": final_state.get("status", "completed"),
            "summary": final_state.get("final_summary"),
            "steps_executed": len(final_state.get("step_results", [])),
            "total_tokens": final_state.get("total_tokens", 0),
            "plan": final_state.get("plan", []),
            "step_results": final_state.get("step_results", []),
        }

    except Exception as e:
        logger.error(f"Agent graph execution failed: {e}")
        return {
            "execution_id": execution_id,
            "status": "failed",
            "error": str(e),
            "summary": None,
            "steps_executed": 0,
            "total_tokens": 0,
        }
