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
            return await self._fallback_search(engine, q, location, additional_params)

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
                    
            except Exception as e:
                # If SerpAPI request fails (rate limit, expired key, network error), fall back gracefully
                return await self._fallback_search(engine, q, location, additional_params)

    async def _fallback_search(self, engine: str, q: Optional[str], location: Optional[str], additional_params: Optional[Dict[str, Any]]) -> dict:
        from urllib.parse import quote_plus
        from src.agent.tools.web_search import WebSearchTool
        web_tool = WebSearchTool()
        params = additional_params or {}

        if engine == "google_flights":
            dep = params.get("departure_id") or params.get("origin") or q or "Origin"
            arr = params.get("arrival_id") or params.get("destination") or location or "Destination"
            query = f"flights from {dep} to {arr} schedule options and airlines"
            results = await web_tool.execute(query=query, max_results=3)
            
            encoded_query = quote_plus(f"flights from {dep} to {arr}")
            return {
                "status": "success",
                "notice": "Retrieved flight options via web search and generated direct booking URLs.",
                "best_flights": results,
                "direct_flight_booking_urls": [
                    {
                        "title": f"Google Flights Search ({dep} to {arr})",
                        "url": f"https://www.google.com/travel/flights?q={encoded_query}"
                    },
                    {
                        "title": f"Kayak Flight Search ({dep} to {arr})",
                        "url": f"https://www.kayak.com/flights/{dep}-{arr}"
                    }
                ]
            }

        elif engine == "google_hotels":
            target_loc = q or location or params.get("q") or "destination"
            query = f"top boutique hotels in {target_loc} reviews and rates"
            results = await web_tool.execute(query=query, max_results=4)
            
            encoded_loc = quote_plus(f"hotels in {target_loc}")
            return {
                "status": "success",
                "notice": "Retrieved hotel options via web search and generated direct reservation URLs.",
                "properties": results,
                "direct_hotel_booking_urls": [
                    {
                        "title": f"Google Hotels Search ({target_loc})",
                        "url": f"https://www.google.com/travel/hotels?q={encoded_loc}"
                    },
                    {
                        "title": f"Booking.com Hotels Search ({target_loc})",
                        "url": f"https://www.booking.com/searchresults.html?ss={encoded_loc}"
                    }
                ]
            }

        else:
            search_q = q or location or str(params)
            results = await web_tool.execute(query=search_q, max_results=5)
            return {
                "status": "success",
                "organic_results": results
            }
