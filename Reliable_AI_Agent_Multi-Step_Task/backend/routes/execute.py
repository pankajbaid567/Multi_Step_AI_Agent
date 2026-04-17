"""Execution API routes for starting tasks and streaming live updates."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket

from models import ExecuteTaskRequest

router = APIRouter()


@router.post("/{task_id}")
async def execute_task(task_id: str, payload: ExecuteTaskRequest) -> dict[str, object]:
    """Trigger or resume execution for a previously created task."""
    # TODO: Run compiled LangGraph for task_id and emit progress events.
    return {"task_id": task_id, "execution_started": True, "resume_from_checkpoint": payload.resume_from_checkpoint}


@router.websocket("/ws/{task_id}")
async def task_events(ws: WebSocket, task_id: str) -> None:
    """Stream task execution updates over WebSocket."""
    await ws.accept()
    await ws.send_json({"task_id": task_id, "event": "connected"})

    # TODO: Bridge Redis pub/sub channel task:{task_id}:events to websocket messages.
    await ws.close(code=1000)
