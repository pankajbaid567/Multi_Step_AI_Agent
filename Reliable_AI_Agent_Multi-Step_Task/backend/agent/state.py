"""Agent state definitions shared across LangGraph nodes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TypedDict
from uuid import uuid4

from models import StepDefinition, StepResult, TaskStatus, TraceEvent


class AgentState(TypedDict):
    """Mutable state that flows through the multi-step execution graph."""

    task_id: str
    original_input: str
    status: str
    steps: list[StepDefinition]
    current_step_index: int
    step_results: list[StepResult]
    execution_trace: list[TraceEvent]
    retry_counts: dict[str, int]
    error_log: list[dict[str, object]]
    context_memory: str
    llm_tokens_used: int
    started_at: str
    completed_at: str | None
    final_output: str


def create_initial_state(task_input: str) -> AgentState:
    """Build an initial state object for a newly submitted task."""
    return AgentState(
        task_id=str(uuid4()),
        original_input=task_input,
        status=TaskStatus.pending.value,
        steps=[],
        current_step_index=0,
        step_results=[],
        execution_trace=[],
        retry_counts={},
        error_log=[],
        context_memory="",
        llm_tokens_used=0,
        started_at=datetime.now(timezone.utc).isoformat(),
        completed_at=None,
        final_output="",
    )
