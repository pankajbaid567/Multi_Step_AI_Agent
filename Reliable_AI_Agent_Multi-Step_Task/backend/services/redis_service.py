"""Redis client lifecycle and lightweight data access helpers."""

from __future__ import annotations

from redis.asyncio import Redis

from config import get_settings

_redis_client: Redis | None = None


async def get_redis_client() -> Redis:
    """Return a singleton async Redis client instance."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def close_redis_client() -> None:
    """Close the singleton Redis client when application shuts down."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
