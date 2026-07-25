import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from src.main import app
from src.dependencies import get_current_user

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_list_tools_endpoint():
    response = client.get("/api/tools/")
    assert response.status_code == 200
    tools = response.json()
    assert len(tools) >= 7
    names = {t["name"] for t in tools}
    assert "web_search" in names
    assert "maps_geocode" in names
    for t in tools:
        assert "input_schema" in t
        assert "requires_approval" in t

def test_auth_endpoints():
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    
    response = client.post("/api/auth/callback")
    assert response.status_code == 200

def test_conversations_endpoints():
    response = client.get("/api/conversations/")
    assert response.status_code == 200
    assert response.json() == []

    response = client.post("/api/conversations/")
    assert response.status_code == 200

    response = client.get("/api/conversations/test-id-123")
    assert response.status_code == 200
    assert response.json()["id"] == "test-id-123"

def test_memory_endpoints():
    response = client.get("/api/memory/preferences")
    assert response.status_code == 200
    assert response.json() == []

    response = client.get("/api/memory/facts")
    assert response.status_code == 200
    assert response.json() == []

def test_executions_endpoints():
    mock_service_instance = AsyncMock()
    mock_service_instance.create_execution.return_value = {
        "execution_id": "exec-123",
        "workflow_id": "agent-execution-exec-123",
        "status": "pending",
        "prompt": "Test task",
        "created_at": "2026-07-25T12:00:00Z",
    }
    mock_service_instance.get_execution_status.return_value = {
        "execution_id": "exec-123",
        "workflow_id": "agent-execution-exec-123",
        "status": "RUNNING",
        "start_time": "2026-07-25T12:00:00Z",
    }

    with patch("src.api.executions.get_execution_service", return_value=mock_service_instance):
        app.dependency_overrides[get_current_user] = lambda: {"id": "test-user-id"}
        try:
            res = client.post("/api/executions/", json={"prompt": "Test task"})
            assert res.status_code == 201
            data = res.json()
            assert data["execution_id"] == "exec-123"

            res_status = client.get("/api/executions/exec-123")
            assert res_status.status_code == 200
            assert res_status.json()["status"] == "RUNNING"
        finally:
            app.dependency_overrides.clear()

def test_chat_sse_endpoint():
    async def mock_astream(state, *args, **kwargs):
        yield {"parse_input": {"status": "loading_memory"}}
        yield {"plan_task": {"status": "executing", "plan": []}}
    
    with patch("src.api.chat.agent_graph.astream", side_effect=mock_astream):
        response = client.post("/api/chat", json={"message": "Hello agent"})
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        content = response.text
        assert "Started execution" in content
        assert "node_update" in content
        assert "Execution complete" in content
