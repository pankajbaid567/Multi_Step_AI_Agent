"""Finalizer node that aggregates step outputs into the task-level result."""

from __future__ import annotations

from datetime import datetime, timezone

from agent.state import AgentState


async def finalizer_node(state: AgentState) -> AgentState:
    """Set final status and response payload after all steps complete."""
    successful_outputs = [item.output for item in state["step_results"] if item.status == "success"]
    state["final_output"] = "\n".join(successful_outputs).strip()
    state["status"] = "completed" if state["final_output"] else "failed"
    state["completed_at"] = datetime.now(timezone.utc).isoformat()

    # TODO: Compute confidence score, cost metrics, and partial completion summary.
    return state
