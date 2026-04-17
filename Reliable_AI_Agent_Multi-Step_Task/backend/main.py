"""FastAPI application entry point for the Reliable AI Agent backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routes import execute_router, tasks_router, traces_router

settings = get_settings()

app = FastAPI(
    title="Reliable AI Agent API",
    version="0.1.0",
    description="Backend service for multi-step task execution under uncertainty.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
app.include_router(execute_router, prefix="/execute", tags=["execute"])
app.include_router(traces_router, prefix="/traces", tags=["traces"])


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Return a health indicator for container orchestrators and probes."""
    return {"status": "ok"}


# TODO: Add lifespan events to initialize shared services (Redis, vector index, LLM clients).
# TODO: Add structured exception handlers and request logging middleware.
