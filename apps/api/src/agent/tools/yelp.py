from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
from src.agent.tools.base import BaseTool

class YelpSearchInput(BaseModel):
    search_term: str = Field(..., description="The business name or category (e.g. 'sushi', 'plumber', 'coffee').")
    location: str = Field(..., description="The city, neighborhood, or address (e.g. 'San Francisco', '94107').")

class YelpSearchTool(BaseTool):
    name = "yelp_search"
    description = "Search Yelp for local businesses, restaurants, or services."
    input_schema = YelpSearchInput
    
    async def execute(self, search_term: str, location: str) -> str:
        # Instead of failing without an API key, we use DuckDuckGo to search Yelp!
        query = f"site:yelp.com {search_term} {location}"
        
        try:
            with DDGS() as ddgs:
                results = ddgs.text(query, max_results=5)
                
                if not results:
                    return f"No results found for '{search_term}' in '{location}' on Yelp."

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

        except Exception as e:
            return f"An error occurred while searching Yelp via DuckDuckGo: {str(e)}"
