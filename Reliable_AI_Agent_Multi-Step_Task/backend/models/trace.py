"""Pydantic models representing execution traces and validation decisions."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class TraceEventType(str, Enum):
    """Canonical event categories emitted during execution."""

    planner = "planner"
    executor = "executor"
    validator = "validator"
    reflector = "reflector"
    finalizer = "finalizer"
    tool_call = "tool_call"
    system = "system"


class ValidationVerdict(str, Enum):
    """Validator decisions used for graph routing."""

    passed = "pass"
    retry = "retry"
    reflect = "reflect"


class TraceEvent(BaseModel):
    """One timeline event in the execution trace."""

    task_id: str
    step_id: str | None = None
    event_type: TraceEventType
    message: str
    payload: dict[str, object] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ErrorEntry(BaseModel):
    """Structured record for a detected execution failure."""

    task_id: str
    step_id: str | None
    error_type: str
    error_message: str
    raw_response: str | None = None
    attempt_number: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
