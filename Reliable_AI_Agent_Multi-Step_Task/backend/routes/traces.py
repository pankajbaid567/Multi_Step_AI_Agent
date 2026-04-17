"""Trace retrieval API route for execution observability."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.redis_service import get_redis_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["traces"])


class TraceData(BaseModel):
    """Data payload returned from trace lookup endpoint."""

    task_id: str
    trace: list[dict[str, Any]]
    total_events: int


class TraceResponse(BaseModel):
    """Envelope for trace route responses."""

    success: bool
    data: TraceData | None = None
    error: str | None = None


@router.get("/{task_id}", response_model=TraceResponse)
async def get_trace(task_id: str):
    """Load execution trace timeline for a task from Redis checkpoint state."""
    try:
        redis = get_redis_service()
        state = await redis.load_checkpoint(task_id)
        if state is None:
            return _error_response(status_code=404, message=f"Task not found: {task_id}")

        trace_raw = state.get("execution_trace") if isinstance(state, dict) else []
        trace = _normalize_trace(trace_raw)
        return TraceResponse(
            success=True,
            data=TraceData(task_id=task_id, trace=trace, total_events=len(trace)),
            error=None,
        )
    except Exception as exc:
        logger.exception("get_trace_failed task_id=%s error=%s", task_id, exc)
        return _error_response(status_code=500, message=str(exc))


def _normalize_trace(value: Any) -> list[dict[str, Any]]:
    """Normalize trace entries into JSON-safe dictionaries."""
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if hasattr(item, "model_dump"):
            normalized.append(item.model_dump())
        elif isinstance(item, dict):
            normalized.append(dict(item))
    return normalized


def _error_response(status_code: int, message: str) -> JSONResponse:
    """Create standardized error envelope with explicit HTTP status."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "error": message,
        },
    )
