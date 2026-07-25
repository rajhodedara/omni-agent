from fastapi import APIRouter

router = APIRouter()

@router.get("/preferences")
async def get_preferences():
    return []

@router.get("/facts")
async def get_facts():
    return []
