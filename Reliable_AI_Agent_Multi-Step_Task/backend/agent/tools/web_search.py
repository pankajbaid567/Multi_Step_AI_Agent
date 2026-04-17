"""Web search tool integration using Tavily API."""

from __future__ import annotations

from tavily import TavilyClient

from config import get_settings


def search_web(query: str, max_results: int = 5) -> dict[str, object]:
    """Execute a web search and return normalized search metadata."""
    settings = get_settings()
    if not settings.tavily_api_key:
        return {"success": False, "data": [], "error_message": "Tavily API key is missing", "tool_name": "web_search"}

    client = TavilyClient(api_key=settings.tavily_api_key)
    response = client.search(query=query, max_results=max_results)

    # TODO: Normalize Tavily payload into strict ToolResult schema with latency tracking.
    return {"success": True, "data": response, "error_message": "", "tool_name": "web_search"}
