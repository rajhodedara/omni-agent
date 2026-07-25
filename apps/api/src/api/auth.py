from fastapi import APIRouter

router = APIRouter()

@router.get("/me")
async def get_me():
    return {"message": "Placeholder for current user"}

@router.post("/callback")
async def auth_callback():
    return {"message": "Placeholder for auth callback"}
