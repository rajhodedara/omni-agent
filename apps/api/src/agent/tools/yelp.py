from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
import os
import httpx
from src.agent.tools.base import BaseTool

class YelpSearchInput(BaseModel):
    search_term: str = Field(..., description="The business name or category (e.g. 'sushi', 'plumber', 'coffee').")
    location: str = Field(..., description="The city, neighborhood, or address (e.g. 'San Francisco', '94107').")

class YelpSearchTool(BaseTool):
    name = "yelp_search"
    description = "Search Yelp for local businesses, restaurants, or services."
    input_schema = YelpSearchInput
    
    async def execute(self, search_term: str, location: str) -> str:
        # We will use OpenStreetMap Nominatim for POI search as an alternative to Yelp
        query = f"{search_term} in {location}"
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": query, "format": "json", "limit": 5}
        headers = {"User-Agent": "PersonalAi-Agent/0.1"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers, timeout=15.0)
                response.raise_for_status()
                results = response.json()
                
                if not results:
                    return f"No results found for '{search_term}' in '{location}'."
                
                formatted_results = []
                for r in results:
                    name = r.get("name", "Unknown Place")
                    display_name = r.get("display_name", "No address available.")
                    lat = r.get("lat", "")
                    lon = r.get("lon", "")
                    osm_type = r.get("osm_type", "")
                    osm_id = r.get("osm_id", "")
                    
                    # Construct a useful URL if possible
                    url = f"https://www.openstreetmap.org/{osm_type}/{osm_id}" if osm_type and osm_id else ""
                    
                    formatted_results.append(
                        f"- **{name}**\n"
                        f"  Address: {display_name}\n"
                        f"  URL: {url}\n"
                        f"  Coordinates: {lat}, {lon}"
                    )

                return "\n\n".join(formatted_results)
        except Exception as e:
            return f"Search failed: {str(e)}"
