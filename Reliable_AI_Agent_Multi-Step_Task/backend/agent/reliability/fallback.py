"""LLM fallback-chain helpers for provider/model failover."""

from __future__ import annotations

from config import get_settings


def get_fallback_chain() -> list[str]:
    """Return ordered model fallback chain configured for runtime."""
    settings = get_settings()
    return [settings.primary_model, settings.fallback_model_openai, settings.fallback_model_anthropic]


# TODO: Add provider-level health checks and dynamic chain pruning with circuit breaker state.
