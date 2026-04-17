"""Executor node that runs the current step using model/tool dispatch."""

from __future__ import annotations

from agent.state import AgentState
from models import StepResult


async def executor_node(state: AgentState) -> AgentState:
    """Execute the current planned step and store the result in state."""
    if state["current_step_index"] >= len(state["steps"]):
        return state

    step = state["steps"][state["current_step_index"]]
    result = StepResult(
        step_id=step.step_id,
        status="success",
        output=f"Executed: {step.name}",
        tokens_used=0,
        latency_ms=0,
        model_used="",
        tool_used=step.tool_needed.value,
        retry_count=state["retry_counts"].get(step.step_id, 0),
    )
    state["step_results"].append(result)

    # TODO: Dispatch to web_search/api_call/code_exec/llm with timeout and tool telemetry.
    # TODO: Merge dependency outputs and reflective hints into step prompt context.
    return state
