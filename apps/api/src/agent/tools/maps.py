from pydantic import BaseModel, Field
import httpx
from .base import BaseTool

class GeocodeInput(BaseModel):
    address: str = Field(..., description="The address to geocode.")

class MapsTool(BaseTool):
    name = "maps_geocode"
    description = "Forward geocoding: Converts an address into geographic coordinates using OpenStreetMap Nominatim."
    input_schema = GeocodeInput

    async def execute(self, address: str) -> dict:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        headers = {"User-Agent": "PersonalAi-Agent/0.1"}
        
        async with httpx.AsyncClient() as client:
            res = await client.get(url, params=params, headers=headers)
            data = res.json()
            if not data:
                return {"error": "Address not found."}
            
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"]),
                "display_name": data[0]["display_name"]
            }
