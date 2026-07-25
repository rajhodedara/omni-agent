"""
Executions API — Endpoints for creating, querying, streaming,
and controlling agent executions.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.services.execution_service import get_execution_service
from src.services.streaming_service import get_streaming_service
from src.dependencies import get_current_user

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────────


class CreateExecutionRequest(BaseModel):
    """Request body for creating a new execution."""
    prompt: str = Field(..., min_length=1, max_length=5000, description="Natural language instruction")
    conversation_id: str | None = Field(None, description="Optional conversation to attach to")


class CreateExecutionResponse(BaseModel):
    """Response after creating an execution."""
    execution_id: str
    workflow_id: str
    status: str
    prompt: str
    created_at: str


class SignalRequest(BaseModel):
    """Request body for sending a signal to an execution."""
    signal_type: str = Field(..., pattern="^(approve|reject|cancel)$", description="Signal type")
    data: dict[str, Any] | None = Field(None, description="Optional signal data")


# ─────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────


@router.post("/", response_model=CreateExecutionResponse, status_code=201)
async def create_execution(request: CreateExecutionRequest, current_user: dict = Depends(get_current_user)):
    """
    Create and start a new agent execution.

    The agent will parse the prompt, create a plan, and begin
    executing steps autonomously. Use the SSE stream endpoint
    to receive real-time updates.
    """
    service = get_execution_service()

    user_id = current_user.get("id") or str(uuid.uuid4())

    result = await service.create_execution(
        user_id=user_id,
        prompt=request.prompt,
        conversation_id=request.conversation_id,
    )

    return CreateExecutionResponse(**result)


@router.get("/")
async def list_executions(current_user: dict = Depends(get_current_user)):
    """List all executions for the current user."""
    # TODO: Query database for user's executions
    return {"executions": [], "total": 0}


@router.get("/{execution_id}")
async def get_execution(execution_id: str, current_user: dict = Depends(get_current_user)):
    """Get details of a specific execution."""
    # TODO: Verify that execution_id belongs to current_user["id"] in DB
    service = get_execution_service()
    status = await service.get_execution_status(execution_id)
    return status


@router.get("/{execution_id}/stream")
async def stream_execution(execution_id: str, current_user: dict = Depends(get_current_user)):
    """
    Stream real-time execution events via Server-Sent Events (SSE).

    The client connects to this endpoint and receives events as
    the agent plans, executes tools, encounters errors, and completes.

    Event types:
    - plan_created: Agent generated an execution plan
    - step_started: A step began executing
    - step_completed: A step finished successfully
    - step_error: A step encountered an error
    - approval_required: Agent needs human approval
    - execution_completed: All steps finished
    - execution_failed: Execution encountered a fatal error
    """
    # TODO: Verify that execution_id belongs to current_user["id"] in DB
    streaming = get_streaming_service()

    return StreamingResponse(
        streaming.subscribe(execution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/{execution_id}/signal")
async def send_signal(execution_id: str, request: SignalRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a control signal to a running execution.

    Signals:
    - approve: Approve a pending action
    - reject: Reject a pending action
    - cancel: Cancel the entire execution
    """
    # TODO: Verify that execution_id belongs to current_user["id"] in DB
    service = get_execution_service()

    try:
        result = await service.signal_execution(
            execution_id=execution_id,
            signal_type=request.signal_type,
            data=request.data,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send signal: {e}")


@router.delete("/{execution_id}")
async def cancel_execution(execution_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a running execution."""
    # TODO: Verify that execution_id belongs to current_user["id"] in DB
    service = get_execution_service()

    result = await service.signal_execution(
        execution_id=execution_id,
        signal_type="cancel",
    )

    return {"message": "Execution cancelled", **result}
