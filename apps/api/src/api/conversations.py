from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_conversations():
    return []

@router.post("/")
async def create_conversation():
    return {}

@router.get("/{id}")
async def get_conversation(id: str):
    return {"id": id}
