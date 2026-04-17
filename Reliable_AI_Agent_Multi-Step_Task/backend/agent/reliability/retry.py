"""Retry policy utilities implementing exponential backoff with jitter."""

from __future__ import annotations

import random


def compute_backoff_seconds(attempt: int, base_seconds: float = 1.0, max_seconds: float = 30.0) -> float:
    """Return capped exponential backoff delay with random jitter."""
    jitter = random.uniform(0.0, 1.0)
    return min(base_seconds * (2**attempt) + jitter, max_seconds)
