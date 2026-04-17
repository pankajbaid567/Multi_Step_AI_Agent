"""HTTP API caller tool used for external service interactions."""

from __future__ import annotations

from collections.abc import Mapping

import httpx


def call_api(
    method: str,
    url: str,
    headers: Mapping[str, str] | None = None,
    json_body: Mapping[str, object] | None = None,
    timeout_seconds: float = 30.0,
) -> dict[str, object]:
    """Perform an HTTP request and return a uniform tool result payload."""
    try:
        with httpx.Client(timeout=timeout_seconds) as client:
            response = client.request(method=method.upper(), url=url, headers=headers, json=json_body)
        return {
            "success": response.is_success,
            "data": {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text,
            },
            "error_message": "" if response.is_success else f"HTTP {response.status_code}",
            "tool_name": "api_caller",
        }
    except httpx.HTTPError as exc:
        return {"success": False, "data": {}, "error_message": str(exc), "tool_name": "api_caller"}
