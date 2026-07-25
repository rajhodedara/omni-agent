"""
Web Search Tool — General-purpose web search using Tavily (primary)
and DuckDuckGo (fallback). No API key required for the fallback path.
"""

import asyncio
import logging
import os
from typing import Dict, List

import httpx
from duckduckgo_search import DDGS
from pydantic import BaseModel, Field

from .base import BaseTool
from src.config import get_settings

logger = logging.getLogger(__name__)


class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to look up on the web.")
    max_results: int = Field(5, description="Maximum number of results to return.")


class WebSearchTool(BaseTool):
    name = "web_search"
    description = (
        "Search the web for general information, news, facts, travel guides, "
        "flight options, hotel prices, tourist attractions, how-to guides, "
        "product comparisons, and any other general research query. "
        "Returns titles, URLs, and content snippets."
    )
    input_schema = WebSearchInput

    async def execute(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        api_key = get_settings().TAVILY_API_KEY
        if api_key:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.tavily.com/search",
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {api_key}",
                        },
                        json={
                            "query": query,
                            "max_results": max_results,
                            "include_answer": True,
                        },
                        timeout=15.0,
                    )
                    response.raise_for_status()
                    data = response.json()
                    results = data.get("results", [])
                    if results:
                        return [
                            {
                                "title": r.get("title", ""),
                                "url": r.get("url", ""),
                                "snippet": r.get("content", ""),
                            }
                            for r in results
                        ]
            except Exception as e:
                logger.warning(f"Tavily search failed, falling back to DuckDuckGo: {e}")

        # ── Fallback: DuckDuckGo Text Search ───────────────────────────
        try:
            results = await asyncio.to_thread(self._ddgs_search, query, max_results)
            return [
                {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"DuckDuckGo search also failed: {e}")
            raise Exception(f"Web search failed: {str(e)}")

    @staticmethod
    def _ddgs_search(query: str, max_results: int = 5) -> list:
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
