from pydantic import BaseModel, Field
import feedparser
from .base import BaseTool
import urllib.parse

class NewsInput(BaseModel):
    query: str = Field(..., description="The topic to search news for.")
    max_results: int = Field(5, description="Maximum number of news articles to return.")

class NewsTool(BaseTool):
    name = "news"
    description = "Searches Google News for articles on a specific topic."
    input_schema = NewsInput

    async def execute(self, query: str, max_results: int = 5) -> list:
        encoded_query = urllib.parse.quote(query)
        feed_url = f"https://news.google.com/rss/search?q={encoded_query}"
        feed = feedparser.parse(feed_url)
        
        results = []
        for entry in feed.entries[:max_results]:
            results.append({
                "title": entry.title,
                "link": entry.link,
                "published": entry.get("published", "")
            })
        return results
