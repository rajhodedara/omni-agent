import json
import logging
from typing import AsyncGenerator, Any
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.agent.graph import agent_graph
from src.agent.state import AgentState

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None

async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generates SSE events by streaming the LangGraph agent state."""
    # Initialize the state
    initial_state = AgentState(
        original_prompt=request.message,
        messages=[{"role": "user", "content": request.message}],
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
    
    # Yield an initial start event
    yield f"data: {json.dumps({'type': 'status', 'data': 'Started execution'})}\n\n"
    
    try:
        import uuid
        thread_id = request.conversation_id or str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}
        
        # Stream the graph execution
        async for output in agent_graph.astream(initial_state, config=config):
            # output is a dict where keys are the node names that just executed
            for node_name, node_state in output.items():
                event_data = {
                    "type": "node_update",
                    "node": node_name,
                    "data": node_state
                }
                
                # We use a custom encoder fallback for any non-serializable objects (like sets)
                payload = json.dumps(event_data, default=str)
                yield f"data: {payload}\n\n"
                
        # Yield completion
        yield f"data: {json.dumps({'type': 'complete', 'data': 'Execution complete'})}\n\n"
        
    except Exception as e:
        logger.error(f"Error during graph execution: {e}")
        error_event = {
            "type": "error",
            "error": str(e)
        }
        yield f"data: {json.dumps(error_event)}\n\n"

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Streaming chat endpoint for the frontend Execution Graph."""
    return StreamingResponse(
        event_generator(request), 
        media_type="text/event-stream"
    )
