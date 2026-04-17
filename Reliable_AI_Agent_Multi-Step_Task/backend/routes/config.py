"""Runtime configuration routes for frontend dashboard controls."""

from __future__ import annotations

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["config"])


class ChaosModeRequest(BaseModel):
    """Request payload for chaos mode updates."""

    enabled: bool = Field(..., description="Whether chaos mode should be enabled.")


class ChaosModeData(BaseModel):
    """Response data containing runtime chaos mode value."""

    chaos_mode: bool


class ChaosModeResponse(BaseModel):
    """Envelope for chaos mode API responses."""

    success: bool
    data: ChaosModeData | None = None
    error: str | None = None


@router.get("/config/chaos-mode", response_model=ChaosModeResponse)
async def get_chaos_mode():
    """Return current runtime chaos mode value."""
    settings = get_settings()
    return ChaosModeResponse(success=True, data=ChaosModeData(chaos_mode=bool(settings.CHAOS_MODE)), error=None)


@router.post("/config/chaos-mode", response_model=ChaosModeResponse)
async def set_chaos_mode(payload: ChaosModeRequest):
    """Set runtime chaos mode value for subsequent executions."""
    try:
                settings = get_settings()
                settings.CHAOS_MODE = bool(payload.enabled)
                return ChaosModeResponse(success=True, data=ChaosModeData(chaos_mode=bool(settings.CHAOS_MODE)), error=None)
    except Exception as exc:
                logger.exception("set_chaos_mode_failed error=%s", exc)
                return _error_response(status_code=500, message=str(exc))


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