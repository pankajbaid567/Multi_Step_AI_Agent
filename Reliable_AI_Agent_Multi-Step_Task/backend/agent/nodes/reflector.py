"""Reflector node that revises strategy after repeated or quality failures."""

from __future__ import annotations

from agent.state import AgentState


async def reflector_node(state: AgentState) -> AgentState:
    """Update context memory with reflective guidance for the next retry."""
    last_error = state["error_log"][-1] if state["error_log"] else {}
    reflection_note = (
        f"Reflection for step {last_error.get('step_id')}: "
        f"{last_error.get('reason', 'No reason provided')}"
    )

    state["context_memory"] = (state["context_memory"] + "\n" + reflection_note).strip()

    # TODO: Implement LLM-based reflection that can modify/reorder/decompose steps safely.
    # TODO: Limit reflection growth and retain only relevant notes within context budget.
    return state
