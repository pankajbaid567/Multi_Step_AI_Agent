"""Application configuration and environment loading utilities."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Typed settings loaded from environment variables."""

    app_name: str
    app_env: str
    app_debug: bool
    api_host: str
    api_port: int
    cors_origins: list[str]
    redis_url: str
    redis_ttl_seconds: int
    openai_api_key: str
    anthropic_api_key: str
    tavily_api_key: str
    primary_model: str
    fallback_model_openai: str
    fallback_model_anthropic: str
    embedding_model: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and cache application settings from environment variables."""
    raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return Settings(
        app_name=os.getenv("APP_NAME", "Reliable AI Agent API"),
        app_env=os.getenv("APP_ENV", "development"),
        app_debug=os.getenv("APP_DEBUG", "false").lower() == "true",
        api_host=os.getenv("API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("API_PORT", "8000")),
        cors_origins=[origin.strip() for origin in raw_cors.split(",") if origin.strip()],
        redis_url=os.getenv("REDIS_URL", "redis://redis:6379/0"),
        redis_ttl_seconds=int(os.getenv("REDIS_TTL_SECONDS", "86400")),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        tavily_api_key=os.getenv("TAVILY_API_KEY", ""),
        primary_model=os.getenv("PRIMARY_MODEL", "gpt-4o"),
        fallback_model_openai=os.getenv("FALLBACK_MODEL_OPENAI", "gpt-4o-mini"),
        fallback_model_anthropic=os.getenv("FALLBACK_MODEL_ANTHROPIC", "claude-3-5-sonnet-latest"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
    )
