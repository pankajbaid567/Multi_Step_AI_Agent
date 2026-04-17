"""Application settings for the Reliable AI Agent backend service."""

from __future__ import annotations

from functools import lru_cache

from dotenv import load_dotenv
try:
    from pydantic_settings import BaseSettings
except ModuleNotFoundError:  # pragma: no cover - compatibility fallback
    from pydantic.v1 import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    """Strongly typed runtime configuration loaded from environment variables."""

    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str
    TAVILY_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    PRIMARY_MODEL: str = "gpt-4o"
    FALLBACK_MODEL: str = "claude-3-5-sonnet-20241022"
    FALLBACK_MODEL_OPENAI: str | None = None
    FALLBACK_MODEL_ANTHROPIC: str | None = None
    VALIDATION_MODEL: str = "gpt-4o-mini"
    MAX_RETRIES: int = 3
    STEP_TIMEOUT: int = 60
    MAX_STEPS: int = 15
    CHAOS_MODE: bool = False
    LOG_LEVEL: str = "INFO"

    class Config:
        """Pydantic configuration for environment-based settings loading."""

        case_sensitive = True

    @property
    def openai_api_key(self) -> str:
        """Backward-compatible alias for lowercase OpenAI API key access."""

        return self.OPENAI_API_KEY

    @property
    def anthropic_api_key(self) -> str:
        """Backward-compatible alias for lowercase Anthropic API key access."""

        return self.ANTHROPIC_API_KEY

    @property
    def tavily_api_key(self) -> str:
        """Backward-compatible alias for lowercase Tavily API key access."""

        return self.TAVILY_API_KEY

    @property
    def redis_url(self) -> str:
        """Backward-compatible alias for lowercase Redis URL access."""

        return self.REDIS_URL

    @property
    def primary_model(self) -> str:
        """Backward-compatible alias for lowercase primary model access."""

        return self.PRIMARY_MODEL

    @property
    def fallback_model_openai(self) -> str:
        """Backward-compatible alias for OpenAI fallback model access."""

        return self.FALLBACK_MODEL_OPENAI or self.FALLBACK_MODEL

    @property
    def fallback_model_anthropic(self) -> str:
        """Backward-compatible alias for Anthropic fallback model access."""

        return self.FALLBACK_MODEL_ANTHROPIC or self.FALLBACK_MODEL


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton settings instance for the current process."""

    return Settings()
