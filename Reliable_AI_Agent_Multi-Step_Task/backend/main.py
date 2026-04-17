"""FastAPI application bootstrap for the Reliable AI Agent backend."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes import execute_router, tasks_router, traces_router
from services import close_redis_client, get_redis_client

settings = get_settings()

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Reliable AI Agent API",
    version="0.1.0",
    description="Backend service for multi-step task execution under uncertainty.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log each HTTP request with method, path, status code, and execution time."""

    started = perf_counter()
    response = await call_next(request)
    duration_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        "method=%s path=%s status_code=%s duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all uncaught exceptions with a normalized API error response body."""

    logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"type": "InternalError", "message": str(exc)},
            "data": None,
        },
    )


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize application resources and validate Redis reachability at startup."""

    logger.info("Agent API starting...")
    try:
        redis_client = await get_redis_client()
        await redis_client.ping()
        logger.info("Redis connection verified.")
    except Exception as exc:  # pragma: no cover - defensive runtime logging
        logger.warning("Redis verification failed during startup: %s", exc)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Close shared Redis resources during graceful application shutdown."""

    await close_redis_client()


app.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
app.include_router(execute_router, prefix="/execute", tags=["execute"])
app.include_router(traces_router, prefix="/traces", tags=["traces"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Report service health, current UTC timestamp, and Redis connectivity status."""

    redis_status = "connected"
    try:
        redis_client = await get_redis_client()
        await redis_client.ping()
    except Exception:
        redis_status = "disconnected"

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "redis": redis_status,
    }
