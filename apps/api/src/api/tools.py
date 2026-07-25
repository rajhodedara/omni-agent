from fastapi import APIRouter
from src.agent.tools import get_all_tools

router = APIRouter()

@router.get("/")
async def list_tools():
    tools = get_all_tools()
    return [
        {
            "name": t.name,
            "description": t.description,
            "requires_approval": t.requires_approval,
            "input_schema": t.input_schema.model_json_schema()
        }
        for t in tools
    ]
