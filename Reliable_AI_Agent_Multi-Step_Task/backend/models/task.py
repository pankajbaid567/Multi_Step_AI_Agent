"""Pydantic models for task creation, planning, and execution payloads."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Supported high-level task lifecycle states."""

    pending = "pending"
    planned = "planned"
    running = "running"
    completed = "completed"
    failed = "failed"


class ToolNeeded(str, Enum):
    """Tool selector used by planner and executor."""

    llm = "llm"
    web_search = "web_search"
    api_call = "api_call"
    code_exec = "code_exec"
    none = "none"


class Complexity(str, Enum):
    """Estimated complexity tag for a single planned step."""

    low = "low"
    medium = "medium"
    high = "high"


class TaskCreateRequest(BaseModel):
    """Input payload for creating a new task."""

    input: str = Field(..., min_length=1, max_length=2000)


class StepDefinition(BaseModel):
    """Structured step emitted by the planner node."""

    step_id: str
    name: str
    description: str
    tool_needed: ToolNeeded = ToolNeeded.llm
    dependencies: list[str] = Field(default_factory=list)
    estimated_complexity: Complexity = Complexity.medium


class StepResult(BaseModel):
    """Execution output metadata for a planned step."""

    step_id: str
    status: str
    output: str = ""
    tokens_used: int = 0
    latency_ms: int = 0
    model_used: str = ""
    tool_used: str = ""
    retry_count: int = 0
    error: str | None = None


class TaskCreateResponse(BaseModel):
    """Response payload returned after task creation/planning."""

    task_id: str
    status: TaskStatus
    steps: list[StepDefinition] = Field(default_factory=list)


class ExecuteTaskRequest(BaseModel):
    """Payload for task execution controls."""

    resume_from_checkpoint: bool = False
