"""Task management API routes for creating and retrieving tasks."""

from __future__ import annotations

from fastapi import APIRouter

from agent import create_initial_state
from models import TaskCreateRequest, TaskCreateResponse, TaskStatus

router = APIRouter()


@router.post("", response_model=TaskCreateResponse)
async def create_task(payload: TaskCreateRequest) -> TaskCreateResponse:
    """Create a task and return its initial planned metadata."""
    state = create_initial_state(payload.input)

    # TODO: Execute planner node and persist task state checkpoint after planning.
    return TaskCreateResponse(task_id=state["task_id"], status=TaskStatus.pending, steps=[])


@router.get("/{task_id}")
async def get_task(task_id: str) -> dict[str, str]:
    """Get current task status and metadata."""
    # TODO: Load full task state from checkpoint store and map to API response schema.
    return {"task_id": task_id, "status": "pending"}
