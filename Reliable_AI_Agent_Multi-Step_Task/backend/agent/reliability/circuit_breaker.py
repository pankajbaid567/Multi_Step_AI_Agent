"""Simple circuit breaker implementation for external provider reliability."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class CircuitBreaker:
    """Track provider failures and expose open/half-open/closed state checks."""

    failure_threshold: float = 0.5
    min_calls: int = 3
    window_seconds: int = 60
    open_seconds: int = 120

    def __post_init__(self) -> None:
        self._calls: list[tuple[datetime, bool]] = []
        self._opened_at: datetime | None = None

    def record(self, success: bool) -> None:
        """Record provider call outcome for rolling-window health analysis."""
        now = datetime.now(timezone.utc)
        self._calls.append((now, success))
        self._calls = [entry for entry in self._calls if entry[0] >= now - timedelta(seconds=self.window_seconds)]

        if self.state == "CLOSED" and len(self._calls) >= self.min_calls:
            failures = sum(1 for _, ok in self._calls if not ok)
            if failures / len(self._calls) > self.failure_threshold:
                self._opened_at = now

    @property
    def state(self) -> str:
        """Compute current breaker state from call history and open timestamp."""
        if not self._opened_at:
            return "CLOSED"

        now = datetime.now(timezone.utc)
        if now - self._opened_at < timedelta(seconds=self.open_seconds):
            return "OPEN"

        return "HALF_OPEN"

    def allow_request(self) -> bool:
        """Return whether a request should proceed under current breaker state."""
        return self.state in {"CLOSED", "HALF_OPEN"}
