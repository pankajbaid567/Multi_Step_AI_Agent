"""Planner node responsible for decomposing a user task into executable steps."""

from __future__ import annotations

from agent.state import AgentState
from models import Complexity, StepDefinition, ToolNeeded


async def planner_node(state: AgentState) -> AgentState:
    """Populate the state with an initial ordered step plan."""
    if state["steps"]:
        return state

    state["steps"] = [
        StepDefinition(
            step_id="step-1",
            name="Understand task",
            description="Analyze user objective and constraints before execution.",
            tool_needed=ToolNeeded.llm,
            dependencies=[],
            estimated_complexity=Complexity.medium,
        )
    ]
    state["status"] = "planned"

    # TODO: Replace fallback stub with LLM-driven JSON planning and strict parse retries.
    # TODO: Enforce dependency DAG validation and max-step limits.
    return state
