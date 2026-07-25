"""
Agent State Schema — Defines the complete state object that flows
through the LangGraph agent graph. Every node reads from and writes
to this state, enabling transparent state tracking across the entire
execution lifecycle.
"""

from __future__ import annotations

from typing import TypedDict, Annotated, Literal, Any


def _merge_lists(a: list | None, b: list | None) -> list:
    """Reducer that merges two lists by appending new items."""
    return (a or []) + (b or [])


class PlanStep(TypedDict, total=False):
    """A single step in the agent's execution plan."""
    step_number: int
    description: str
    tool_name: str | None
    tool_input: dict[str, Any] | None
    depends_on: list[int]  # Step numbers this step depends on
    status: Literal["pending", "running", "completed", "failed", "skipped"]
    result: Any


class StepResult(TypedDict, total=False):
    """The result of executing a single step."""
    step_number: int
    tool_name: str
    tool_input: dict[str, Any]
    tool_output: Any
    reasoning: str
    error: str | None
    retry_count: int
    tokens_used: int
    latency_ms: float
    status: Literal["completed", "failed", "skipped"]


class ApprovalRequest(TypedDict, total=False):
    """A request for human approval before proceeding."""
    action: str
    tool_name: str
    tool_input: dict[str, Any]
    reason: str
    options: list[str]


class AgentState(TypedDict, total=False):
    """
    The complete state object for the LangGraph agent.

    This state flows through all graph nodes:
    ParseInput → LoadMemory → PlanTask → ExecuteStep →
    EvaluateProgress → Summarize → SaveMemory
    """

    # ── Core Identity ──────────────────────────────────────────────
    messages: Annotated[list[dict[str, Any]], _merge_lists]
    original_prompt: str
    user_id: str
    execution_id: str

    # ── Planning ───────────────────────────────────────────────────
    plan: list[PlanStep]
    current_step_index: int
    max_steps: int  # Hard ceiling, default 20

    # ── Execution ──────────────────────────────────────────────────
    step_results: Annotated[list[StepResult], _merge_lists]
    current_tool_call: dict[str, Any] | None
    retry_count: int

    # ── Constraints & Context ──────────────────────────────────────
    constraints: dict[str, Any]  # Budget, time, preferences parsed from prompt
    user_preferences: list[dict[str, Any]]  # From Mem0 long-term memory

    # ── Control Flow ───────────────────────────────────────────────
    status: Literal[
        "parsing",
        "loading_memory",
        "planning",
        "executing",
        "evaluating",
        "waiting_approval",
        "replanning",
        "summarizing",
        "saving_memory",
        "completed",
        "failed",
        "cancelled",
    ]
    error: str | None
    requires_approval: bool
    approval_granted: bool
    approval_request: ApprovalRequest | None

    # ── Output ─────────────────────────────────────────────────────
    final_summary: str | None
    artifacts: list[dict[str, Any]]  # Generated files, images, etc.
    total_tokens: int
    total_cost: float
