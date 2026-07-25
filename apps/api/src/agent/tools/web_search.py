from typing import List, Dict
from pydantic import BaseModel, Field
from duckduckgo_search import DDGS
import os
import httpx
from .base import BaseTool
from src.config import get_settings

class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to look up on the web.")
    max_results: int = Field(5, description="Maximum number of results to return.")

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Searches the web using DuckDuckGo and returns top results with titles, URLs, and snippets."
    input_schema = WebSearchInput

    async def execute(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        api_key = get_settings().TAVILY_API_KEY
        if api_key:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.tavily.com/search",
                        json={"api_key": api_key, "query": query, "max_results": max_results},
                        timeout=15.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    results = data.get("results", [])
                    if results:
                        return [{"title": r.get("title"), "url": r.get("url"), "snippet": r.get("content")} for r in results]
            except Exception:
                pass # fallback to ddgs

        with DDGS() as ddgs:
            try:
                results = ddgs.text(query, max_results=max_results, backend="html")
                return [{"title": r.get("title"), "url": r.get("href"), "snippet": r.get("body")} for r in results]
            except Exception as e:
                raise Exception(f"Web search failed: {str(e)}")
