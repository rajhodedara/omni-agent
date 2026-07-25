import pytest
from src.agent.tools import get_all_tools, get_tool_by_name, get_tools_as_openai_format
from src.agent.tools.human_input import HumanInputTool
from src.agent.tools.maps import MapsTool
from src.agent.tools.weather import WeatherTool
from src.agent.tools.web_search import WebSearchTool
from src.agent.tools.local_search import LocalBusinessSearchTool
from src.agent.tools.web_scrape import WebScrapeTool
from src.agent.tools.news import NewsTool
import httpx
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_tool_registry():
    tools = get_all_tools()
    assert len(tools) >= 7
    names = {t.name for t in tools}
    assert {"web_search", "weather", "news", "maps_geocode", "human_input", "local_business_search", "web_scrape"}.issubset(names)

    openai_format = get_tools_as_openai_format()
    assert len(openai_format) >= 7
    for t in openai_format:
        assert t["type"] == "function"
        assert "name" in t["function"]
        assert "parameters" in t["function"]

@pytest.mark.asyncio
async def test_human_input_tool():
    tool = get_tool_by_name("human_input")
    assert tool is not None
    assert tool.requires_approval is True
    res = await tool.execute(question="Do you approve?", options=["yes", "no"])
    assert res["status"] == "waiting_approval"
    assert res["question"] == "Do you approve?"
    assert res["options"] == ["yes", "no"]

@pytest.mark.asyncio
async def test_maps_tool_success():
    tool = MapsTool()
    mock_response = MagicMock()
    mock_response.json.return_value = [{"lat": "35.6764", "lon": "139.6500", "display_name": "Tokyo, Japan"}]
    
    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, return_value=mock_response) as mock_get:
        res = await tool.execute(address="Tokyo")
        assert res["lat"] == 35.6764
        assert res["lon"] == 139.6500
        assert res["display_name"] == "Tokyo, Japan"

@pytest.mark.asyncio
async def test_maps_tool_not_found():
    tool = MapsTool()
    mock_response = MagicMock()
    mock_response.json.return_value = []
    
    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, return_value=mock_response):
        res = await tool.execute(address="NonExistentAddress999")
        assert "error" in res
        assert "not found" in res["error"]

@pytest.mark.asyncio
async def test_weather_tool():
    tool = WeatherTool()
    geo_response = MagicMock()
    geo_response.json.return_value = [{"lat": "35.68", "lon": "139.76"}]
    weather_response = MagicMock()
    weather_response.json.return_value = {"current_weather": {"temperature": 22.5, "windspeed": 10.0}}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock, side_effect=[geo_response, weather_response]):
        res = await tool.execute(city="Tokyo")
        assert "current_weather" in res
        assert res["current_weather"]["temperature"] == 22.5

@pytest.mark.asyncio
async def test_web_search_tool():
    tool = WebSearchTool()
    mock_ddgs_instance = MagicMock()
    mock_ddgs_instance.text.return_value = [
        {"title": "Test Result", "href": "https://example.com", "body": "Snippet text"}
    ]
    
    mock_settings = MagicMock()
    mock_settings.TAVILY_API_KEY = None
    
    with patch("src.agent.tools.web_search.get_settings", return_value=mock_settings), \
         patch("src.agent.tools.web_search.DDGS") as mock_ddgs:
        mock_ddgs.return_value.__enter__.return_value = mock_ddgs_instance
        res = await tool.execute(query="test query", max_results=1)
        assert len(res) == 1
        assert res[0]["title"] == "Test Result"
        assert res[0]["url"] == "https://example.com"
        assert res[0]["snippet"] == "Snippet text"

@pytest.mark.asyncio
async def test_local_business_search_tool():
    tool = LocalBusinessSearchTool()
    mock_maps_results = [
        {
            "title": "Sakura Sushi",
            "body": "123 Main St, San Francisco, CA | Phone: +1-415-555-1234 | Rating: 4.5",
            "href": "https://sakurasushi.example.com",
        }
    ]
    with patch.object(tool, "_ddgs_text_search", return_value=mock_maps_results):
        res = await tool.execute(search_term="sushi", location="San Francisco")
        assert "Sakura Sushi" in res
        assert "123 Main St" in res
        assert "+1-415-555-1234" in res

@pytest.mark.asyncio
async def test_news_tool():
    tool = NewsTool()
    mock_entry = MagicMock()
    mock_entry.title = "AI Breakthrough"
    mock_entry.link = "https://news.example.com/ai"
    mock_entry.get.return_value = "2026-07-25"
    mock_feed = MagicMock()
    mock_feed.entries = [mock_entry]

    with patch("src.agent.tools.news.feedparser.parse", return_value=mock_feed):
        res = await tool.execute(query="Artificial Intelligence", max_results=1)
        assert len(res) == 1
        assert res[0]["title"] == "AI Breakthrough"
        assert res[0]["link"] == "https://news.example.com/ai"

@pytest.mark.asyncio
async def test_web_scrape_tool():
    tool = WebScrapeTool()
    mock_result = MagicMock()
    mock_result.success = True
    mock_result.markdown = "# Example Page\nContent goes here."
    
    mock_crawler_instance = AsyncMock()
    mock_crawler_instance.arun.return_value = mock_result
    
    with patch("src.agent.tools.web_scrape.AsyncWebCrawler") as mock_crawler:
        mock_crawler.return_value.__aenter__.return_value = mock_crawler_instance
        res = await tool.execute(url="https://example.com")
        assert "Source: https://example.com" in res
        assert "Example Page" in res
