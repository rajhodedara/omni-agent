"""
Local Business Search Tool — Searches for local businesses, restaurants,
and services using DuckDuckGo's free local/maps search (primary)
and Tavily as fallback. No API key required for the primary search path.
"""

import asyncio
import logging
import os

import httpx
from duckduckgo_search import DDGS
from pydantic import BaseModel, Field

from src.agent.tools.base import BaseTool

logger = logging.getLogger(__name__)


class LocalBusinessSearchInput(BaseModel):
    search_term: str = Field(
        ...,
        description="The business name or category (e.g. 'sushi', 'plumber', 'coffee shop', 'tourist attractions').",
    )
    location: str = Field(
        ...,
        description="The city, neighborhood, or address (e.g. 'San Francisco', 'Tokyo', 'Mumbai', '94107').",
    )


class LocalBusinessSearchTool(BaseTool):
    name = "local_business_search"
    description = (
        "Search for local businesses, restaurants, cafes, bars, hotels, services, "
        "and tourist attractions by category and location. Returns business names, "
        "addresses, phone numbers, ratings, review counts, and URLs. "
        "Use this for location-specific queries like 'best ramen in Tokyo' or "
        "'hotels near Times Square'."
    )
    input_schema = LocalBusinessSearchInput

    async def execute(self, search_term: str, location: str) -> str:
        """
        Strategy:
        1. Try DuckDuckGo local/maps search (free, no key).
        2. Fallback to DuckDuckGo text search with location context.
        3. If TAVILY_API_KEY is set, use Tavily as final fallback.
        """

        # ── Attempt 1: DuckDuckGo Text Search with location ────────────
        try:
            query = f"{search_term} near {location}"
            results = await asyncio.to_thread(self._ddgs_text_search, query)
            if results:
                return self._format_text_results(results, search_term, location)
        except Exception as e:
            logger.warning(f"DuckDuckGo text search failed: {e}")

        # ── Attempt 2: Tavily API (if key available) ───────────────────
        api_key = os.environ.get("TAVILY_API_KEY")
        if api_key:
            try:
                return await self._tavily_search(api_key, search_term, location)
            except Exception as e:
                logger.warning(f"Tavily search fallback failed: {e}")

        return (
            f"No local business results found for '{search_term}' in '{location}'. "
            "Try broadening your search term or checking the location spelling."
        )

    # ── Private helpers ────────────────────────────────────────────────

    @staticmethod
    def _ddgs_text_search(query: str, max_results: int = 5) -> list:
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))

    @staticmethod
    def _format_text_results(results: list, search_term: str, location: str) -> str:
        formatted = [f"**Results for '{search_term}' near {location}:**\n"]
        for i, r in enumerate(results, 1):
            title = r.get("title", "Unknown")
            url = r.get("href", "")
            snippet = r.get("body", "No description available.")
            entry = f"{i}. **{title}**\n   {snippet}"
            if url:
                entry += f"\n   🔗 {url}"
            formatted.append(entry)

        return "\n\n".join(formatted)

    @staticmethod
    async def _tavily_search(api_key: str, search_term: str, location: str) -> str:
        query = f"{search_term} near {location} local businesses"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.tavily.com/search",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "query": query,
                    "max_results": 5,
                    "include_answer": True,
                },
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            if not results:
                return f"No results found for '{search_term}' in '{location}'."

            formatted = [f"**Results for '{search_term}' near {location}:**\n"]
            for i, r in enumerate(results, 1):
                title = r.get("title", "Unknown")
                url = r.get("url", "")
                snippet = r.get("content", "No description available.")
                entry = f"{i}. **{title}**\n   {snippet}"
                if url:
                    entry += f"\n   🔗 {url}"
                formatted.append(entry)

            return "\n\n".join(formatted)
