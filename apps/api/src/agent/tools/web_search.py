from typing import List, Dict
from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
from .base import BaseTool

class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to look up on the web.")
    max_results: int = Field(5, description="Maximum number of results to return.")

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Searches the web using DuckDuckGo and returns top results with titles, URLs, and snippets."
    input_schema = WebSearchInput

    async def execute(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=max_results)
            return [{"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")} for r in results]
