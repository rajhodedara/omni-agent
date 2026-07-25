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
        try:
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(url=url)
                
                if not result.success:
                    return f"Failed to scrape {url}: {result.error_message}"
                    
                content = result.markdown
                
                if len(content) > 15000:
                    content = content[:15000] + "\n...[Content truncated for length]..."
                    
                return f"Source: {url}\n\n{content}"
                
        except Exception as e:
            return f"An error occurred while scraping {url}: {str(e)}"
