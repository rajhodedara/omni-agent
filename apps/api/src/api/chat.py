import json
import logging
from typing import AsyncGenerator, Any
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.agent.graph import agent_graph
from src.agent.state import AgentState

# DB & REST Imports
import uuid
import httpx
from src.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    image_base64: str | None = None

class ChatResumeRequest(BaseModel):
    thread_id: str
    response: str


async def safe_db_insert(coro):
    """Safely execute DB operations without crashing the stream if Supabase is unreachable."""
    try:
        await coro
    except Exception as e:
        logger.warning(f"Failed to write to Supabase (is DATABASE_URL configured correctly?): {e}")


async def _stream_graph(graph_input: Any, config: dict, thread_id: str) -> AsyncGenerator[str, None]:
    """
    Shared SSE streaming helper that runs the agent graph and yields events.
    After astream finishes, checks if the graph paused at an interrupt
    (waiting for human input) vs. truly completed.
    """
    async for output in agent_graph.astream(graph_input, config=config):
        for node_name, node_state in output.items():
            event_data = {
                "type": "node_update",
                "node": node_name,
                "data": node_state,
            }
            payload = json.dumps(event_data, default=str)
            yield f"data: {payload}\n\n"
            
            # Log the step to Supabase if step_results exist and node_state is a dict
            if isinstance(node_state, dict):
                step_results = node_state.get("step_results", [])
                if step_results:
                    latest_step = step_results[-1]
                
                    async def insert_step(step, exec_id):
                        settings = get_settings()
                        async with httpx.AsyncClient() as client:
                            headers = {
                                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                                "Content-Type": "application/json"
                            }
                            payload = {
                                "id": str(uuid.uuid4()),
                                "execution_id": exec_id,
                                "step_number": step.get("step_number"),
                                "step_type": step.get("step_type", "tool_call"),
                                "status": step.get("status", "completed"),
                                "tool_name": step.get("tool_name"),
                                "tool_input": step.get("tool_input"),
                                "tool_output": step.get("tool_output"),
                                "reasoning": step.get("reasoning", step.get("description")),
                                "error_message": step.get("error_message")
                            }
                            resp = await client.post(f"{settings.SUPABASE_URL}/rest/v1/execution_steps", headers=headers, json=payload)
                            resp.raise_for_status()
                    
                    await safe_db_insert(insert_step(latest_step, thread_id))

    # After streaming ends, check the graph's persisted state to determine
    # if execution paused at an interrupt (human input) or truly completed.
    graph_state = agent_graph.get_state(config)

    if graph_state and graph_state.next:
        # Graph is paused at an interrupt — it has pending nodes to execute
        state_values = graph_state.values or {}
        approval_request = state_values.get("approval_request")

        question = ""
        options = []
        if approval_request:
            question = approval_request.get("question", approval_request.get("reason", ""))
            options = approval_request.get("options", [])

        if not question:
            question = "I need your input to proceed. Please provide the requested information."

        human_input_event = {
            "type": "human_input",
            "thread_id": thread_id,
            "data": {
                "question": question,
                "options": options,
                "approval_request": approval_request,
            },
        }
        yield f"data: {json.dumps(human_input_event, default=str)}\n\n"
    else:
        # Graph truly completed
        yield f"data: {json.dumps({'type': 'complete', 'data': 'Execution complete'})}\n\n"
        
        async def finalize_execution(exec_id, state):
            settings = get_settings()
            async with httpx.AsyncClient() as client:
                headers = {
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "status": "completed",
                    "result_summary": state.get("final_summary")
                }
                resp = await client.patch(f"{settings.SUPABASE_URL}/rest/v1/executions?id=eq.{exec_id}", headers=headers, json=payload)
                resp.raise_for_status()
        
        await safe_db_insert(finalize_execution(thread_id, graph_state.values if graph_state else {}))


async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generates SSE events by streaming the LangGraph agent state."""
    
    # Format message for multi-modal if image is present
    if request.image_base64:
        content = [
            {"type": "text", "text": request.message},
            {"type": "image_url", "image_url": {"url": request.image_base64}}
        ]
    else:
        content = request.message

    initial_state = AgentState(
        original_prompt=request.message,
        messages=[{"role": "user", "content": content}],
        status="parsing",
        constraints={},
        user_preferences=[],
        plan=[],
        step_results=[],
        current_step_index=0,
        retry_count=0,
        requires_approval=False,
        approval_request=None,
        final_summary=None,
        total_tokens=0,
    )

    yield f"data: {json.dumps({'type': 'status', 'data': 'Started execution'})}\n\n"

    try:
        import uuid
        thread_id = request.conversation_id or str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}

        # Create Execution record
        async def create_execution(exec_id, prompt):
            settings = get_settings()
            dummy_user_id = "00000000-0000-0000-0000-000000000000"
            
            async with httpx.AsyncClient() as client:
                headers = {
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates"
                }
                
                # Upsert dummy user
                user_payload = {"id": dummy_user_id, "email": "guest@personalai.local"}
                await client.post(f"{settings.SUPABASE_URL}/rest/v1/users", headers=headers, json=user_payload)
                
                # Insert Execution
                exec_payload = {
                    "id": exec_id,
                    "user_id": dummy_user_id,
                    "original_prompt": prompt,
                    "status": "executing"
                }
                resp = await client.post(f"{settings.SUPABASE_URL}/rest/v1/executions", headers=headers, json=exec_payload)
                resp.raise_for_status()
        
        await safe_db_insert(create_execution(thread_id, request.message))

        async for event in _stream_graph(initial_state, config, thread_id):
            yield event

    except Exception as e:
        logger.error(f"Error during graph execution: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


async def resume_generator(request: ChatResumeRequest) -> AsyncGenerator[str, None]:
    """Resumes a paused graph execution after receiving human input."""
    yield f"data: {json.dumps({'type': 'status', 'data': 'Resuming execution'})}\n\n"

    try:
        from langgraph.types import Command

        config = {"configurable": {"thread_id": request.thread_id}}

        # Resume the graph from the interrupt with the user's response
        resume_input = Command(resume={"response": request.response})

        async for event in _stream_graph(resume_input, config, request.thread_id):
            yield event

    except Exception as e:
        logger.error(f"Error resuming graph execution: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Streaming chat endpoint for the frontend Execution Graph."""
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
    )


@router.post("/chat/respond")
async def chat_respond_endpoint(request: ChatResumeRequest):
    """Resume a paused execution after human input."""
    return StreamingResponse(
        resume_generator(request),
        media_type="text/event-stream",
    )
