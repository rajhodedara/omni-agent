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
        query = f"site:yelp.com {search_term} {location}"
        
        api_key = os.environ.get("TAVILY_API_KEY")
        if api_key:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.tavily.com/search",
                        json={"api_key": api_key, "query": query, "max_results": 5},
                        timeout=15.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    results = data.get("results", [])
                    if results:
                        formatted_results = []
                        for r in results:
                            title = r.get("title", "Unknown").replace(" - Yelp", "")
                            url = r.get("url", "")
                            snippet = r.get("content", "No description available.")
                            formatted_results.append(f"- **{title}**\n  URL: {url}\n  Snippet: \"{snippet}\"")
                        return "\n\n".join(formatted_results)
            except Exception:
                pass # fallback to ddgs

        import asyncio
        
        def run_ddgs():
            with DDGS() as ddgs:
                return ddgs.text(query, max_results=5, backend="html")
                
        try:
            results = await asyncio.to_thread(run_ddgs)
            if not results:
                return f"No results found for '{search_term}' in '{location}' on Yelp."
        except Exception as e:
            return f"Yelp search failed: {str(e)}"

        formatted_results = []
            for r in results:
                title = r.get("title", "Unknown")
                # Yelp titles usually look like "San Francisco - Sushi - Best Match - Yelp"
                clean_title = title.replace(" - Yelp", "")
                url = r.get("href", "")
                snippet = r.get("body", "No description available.")
                
                formatted_results.append(
                    f"- **{clean_title}**\n"
                    f"  URL: {url}\n"
                    f"  Snippet: \"{snippet}\""
                )

            return "\n\n".join(formatted_results)
