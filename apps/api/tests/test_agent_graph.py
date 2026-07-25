import pytest
from src.agent.graph import execute_step, parse_input, plan_task, evaluate_progress
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_execute_step_resilient_to_extra_kwargs():
    # Verify our Pydantic schema validation ignores unexpected hallucinated kwargs from LLM
    state = {
        "current_step_index": 0,
        "step_results": [],
        "retry_count": 0,
        "plan": [
            {
                "step_number": 1,
                "description": "Get map location for Paris",
                "tool_name": "maps_geocode",
                # LLM hallucinates an extra 'country' parameter not in GeocodeInput schema
                "tool_input": {"address": "Paris", "country": "France", "extra_hallucination": True},
                "depends_on": [],
                "status": "pending"
            }
        ]
    }

    mock_response = MagicMock()
    mock_response.json.return_value = [{"lat": "48.8566", "lon": "2.3522", "display_name": "Paris, France"}]
    import httpx
    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, return_value=mock_response):
        result_state = await execute_step(state)
        assert len(result_state["step_results"]) == 1
        step_res = result_state["step_results"][0]
        # Should complete successfully without TypeError
        assert step_res["status"] == "completed"
        assert step_res["tool_name"] == "maps_geocode"
        # Verify extra kwargs were cleanly filtered out in tool_input
        assert "extra_hallucination" not in step_res["tool_input"]
        assert step_res["tool_input"]["address"] == "Paris"

@pytest.mark.asyncio
async def test_evaluate_progress_retry_logic():
    state = {
        "plan": [{"step_number": 1}],
        "step_results": [{"step_number": 1, "status": "failed", "error": "API timed out"}],
        "current_step_index": 1,
        "retry_count": 0,
        "max_steps": 20
    }
    next_state = await evaluate_progress(state)
    assert next_state["status"] == "executing"
    assert next_state["current_step_index"] == 0
    assert next_state["retry_count"] == 1
