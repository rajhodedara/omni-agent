from fastapi import APIRouter, HTTPException
import httpx
from src.config import get_settings

router = APIRouter()

@router.get("/preferences")
async def get_preferences():
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }
        resp = await client.get(f"{settings.SUPABASE_URL}/rest/v1/user_preferences", headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch preferences")
        return resp.json()

@router.delete("/preferences/{id}")
async def delete_preference(id: str):
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }
        resp = await client.delete(f"{settings.SUPABASE_URL}/rest/v1/user_preferences?id=eq.{id}", headers=headers)
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=resp.status_code, detail="Failed to delete preference")
        return {"status": "success"}

@router.get("/facts")
async def get_facts():
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }
        resp = await client.get(f"{settings.SUPABASE_URL}/rest/v1/memory_facts", headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch facts")
        return resp.json()

@router.delete("/facts/{id}")
async def delete_fact(id: str):
    settings = get_settings()
    async with httpx.AsyncClient() as client:
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }
        resp = await client.delete(f"{settings.SUPABASE_URL}/rest/v1/memory_facts?id=eq.{id}", headers=headers)
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=resp.status_code, detail="Failed to delete fact")
        return {"status": "success"}
