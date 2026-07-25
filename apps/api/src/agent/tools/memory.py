import httpx
import uuid
from typing import Dict, Any
from pydantic import BaseModel, Field
from .base import BaseTool
from src.config import get_settings

class SaveMemoryFactInput(BaseModel):
    fact: str = Field(..., description="The factual statement to remember.")
    category: str | None = Field(None, description="Optional category (e.g. 'work', 'personal', 'technology').")
    confidence: float = Field(1.0, description="Confidence level between 0.0 and 1.0.")

class SaveMemoryFactTool(BaseTool):
    name = "save_memory_fact"
    description = "Saves a semantic memory fact about the user or the world. Use this to remember things long-term."
    input_schema = SaveMemoryFactInput

    async def execute(self, fact: str, category: str | None = None, confidence: float = 1.0) -> Dict[str, Any]:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            }
            # For local dev without auth, use dummy user_id
            payload = {
                "id": str(uuid.uuid4()),
                "user_id": "00000000-0000-0000-0000-000000000000",
                "fact": fact,
                "category": category,
                "confidence": confidence
            }
            resp = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/memory_facts",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            return {"status": "success", "message": f"Fact saved: {fact}"}

class SaveUserPreferenceInput(BaseModel):
    category: str = Field(..., description="The category of preference (e.g. 'ui', 'communication', 'diet').")
    key: str = Field(..., description="The specific preference key (e.g. 'theme', 'tone', 'favorite_food').")
    value: str = Field(..., description="The value of the preference.")
    confidence: float = Field(1.0, description="Confidence level between 0.0 and 1.0.")

class SaveUserPreferenceTool(BaseTool):
    name = "save_user_preference"
    description = "Saves an explicit user preference. Use this when the user expresses how they like things to be done."
    input_schema = SaveUserPreferenceInput

    async def execute(self, category: str, key: str, value: str, confidence: float = 1.0) -> Dict[str, Any]:
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            # Use dummy user_id
            payload = {
                "id": str(uuid.uuid4()),
                "user_id": "00000000-0000-0000-0000-000000000000",
                "category": category,
                "key": key,
                "value": value,
                "confidence": confidence
            }
            resp = await client.post(
                f"{settings.SUPABASE_URL}/rest/v1/user_preferences",
                headers=headers,
                json=payload
            )
            resp.raise_for_status()
            return {"status": "success", "message": f"Preference saved: {category}.{key} = {value}"}
