"""
Tool Registry — Central registry for all available agent tools.
Provides functions to list, retrieve, and convert tools to
OpenAI function-calling format.
"""

from __future__ import annotations

from src.agent.tools.base import BaseTool
from src.agent.tools.web_search import WebSearchTool
from src.agent.tools.weather import WeatherTool
from src.agent.tools.news import NewsTool
from src.agent.tools.maps import MapsTool
from src.agent.tools.human_input import HumanInputTool
from src.agent.tools.yelp import YelpSearchTool
from src.agent.tools.web_scrape import WebScrapeTool
from src.agent.tools.memory import SaveMemoryFactTool, SaveUserPreferenceTool

# Registry of all available tools
_TOOL_REGISTRY: dict[str, BaseTool] = {}


def _register_tool(tool: BaseTool) -> None:
    """Register a tool instance in the global registry."""
    _TOOL_REGISTRY[tool.name] = tool


def _initialize_tools() -> None:
    """Initialize and register all tools."""
    if _TOOL_REGISTRY:
        return  # Already initialized

    _register_tool(WebSearchTool())
    _register_tool(WeatherTool())
    _register_tool(NewsTool())
    _register_tool(MapsTool())
    _register_tool(HumanInputTool())
    _register_tool(YelpSearchTool())
    _register_tool(WebScrapeTool())
    _register_tool(SaveMemoryFactTool())
    _register_tool(SaveUserPreferenceTool())


def get_all_tools() -> list[BaseTool]:
    """Get all registered tools."""
    _initialize_tools()
    return list(_TOOL_REGISTRY.values())


def get_tool_by_name(name: str) -> BaseTool | None:
    """Get a specific tool by name."""
    _initialize_tools()
    return _TOOL_REGISTRY.get(name)


def get_tools_as_openai_format() -> list[dict]:
    """Get all tools formatted for OpenAI function calling."""
    _initialize_tools()
    return [tool.to_openai_tool() for tool in _TOOL_REGISTRY.values()]


__all__ = [
    "BaseTool",
    "get_all_tools",
    "get_tool_by_name",
    "get_tools_as_openai_format",
]
