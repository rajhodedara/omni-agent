from pydantic import BaseModel, Field
from crawl4ai import AsyncWebCrawler
from src.agent.tools.base import BaseTool

class WebScrapeInput(BaseModel):
    url: str = Field(..., description="The full URL of the website to scrape (e.g. 'https://example.com').")

class WebScrapeTool(BaseTool):
    name = "web_scrape"
    description = "Scrape and extract the main content from a website."
    input_schema = WebScrapeInput
    
    async def execute(self, url: str) -> str:
        from urllib.parse import urlparse
        import socket
        import ipaddress

        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Invalid URL scheme: {parsed.scheme}")

        try:
            ip = socket.gethostbyname(parsed.hostname)
            if ipaddress.ip_address(ip).is_private or ipaddress.ip_address(ip).is_loopback:
                raise ValueError("Access to private/internal networks is forbidden.")
        except Exception as e:
            if "forbidden" in str(e):
                raise
            # If resolution fails, let the crawler handle the failure natively.

        async with AsyncWebCrawler(verbose=False) as crawler:
            result = await crawler.arun(url=url)
            
            if not result.success:
                raise Exception(f"Failed to scrape {url}: {result.error_message}")
                
            content = result.markdown
            
            if len(content) > 15000:
                content = content[:15000] + "\n...[Content truncated for length]..."
                
            return f"Source: {url}\n\n{content}"
