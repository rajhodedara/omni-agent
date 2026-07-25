import os
import httpx
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from src.agent.tools.base import BaseTool

class SerpApiInput(BaseModel):
    engine: str = Field(..., description="The SerpApi engine to use (e.g., 'google', 'google_flights', 'google_hotels').")
    q: Optional[str] = Field(None, description="The search query (used by 'google' and some other engines).")
    location: Optional[str] = Field(None, description="Location context for the search (e.g., 'Tokyo, Japan').")
    additional_params: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        description="Additional parameters for specific engines (e.g., 'departure_id', 'arrival_id', 'outbound_date' for flights; 'check_in_date', 'check_out_date' for hotels)."
    )

class SerpApiTool(BaseTool):
    name = "serpapi"
    description = (
        "Powerful search tool via SerpApi for Flights, Hotels, and general Web results. "
        "Engines: 'google' (general), 'google_flights' (requires departure_id, arrival_id, outbound_date), "
        "'google_hotels' (requires q, check_in_date, check_out_date)."
    )
    input_schema = SerpApiInput

    async def execute(self, engine: str, q: Optional[str] = None, location: Optional[str] = None, additional_params: Optional[Dict[str, Any]] = None) -> dict:
        api_key = os.environ.get("SERPAPI_API_KEY")
        if not api_key:
            return {"error": "SERPAPI_API_KEY environment variable is not set."}

        url = "https://serpapi.com/search"
        params = {
            "engine": engine,
            "api_key": api_key,
        }
        if q:
            params["q"] = q
        if location:
            params["location"] = location
        if additional_params:
            params.update(additional_params)

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                # Filter down results to avoid context length issues
                if engine == "google_flights":
                    return {
                        "best_flights": data.get("best_flights", [])[:3], 
                        "other_flights": data.get("other_flights", [])[:2]
                    }
                elif engine == "google_hotels":
                    return {"properties": data.get("properties", [])[:5]}
                elif engine == "google":
                    return {"organic_results": data.get("organic_results", [])[:5]}
                else:
                    # Generic fallback
                    return data
                    
            except httpx.HTTPStatusError as e:
                return {"error": f"HTTP error occurred: {e.response.text}"}
            except Exception as e:
                return {"error": f"An error occurred: {str(e)}"}
