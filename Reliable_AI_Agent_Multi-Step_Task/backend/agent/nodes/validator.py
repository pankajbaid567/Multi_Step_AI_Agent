"""Validator node that decides pass, retry, or reflect for step output quality."""

from __future__ import annotations

from agent.state import AgentState


async def validator_node(state: AgentState) -> AgentState:
    """Evaluate latest step result and annotate routing verdict."""
    latest_result = state["step_results"][-1] if state["step_results"] else None
    verdict = "pass" if latest_result and latest_result.status == "success" else "retry"

    state["error_log"].append(
        {
            "step_id": latest_result.step_id if latest_result else None,
            "validator_verdict": verdict,
            "reason": "Output accepted by fallback validator." if verdict == "pass" else "Missing step output.",
        }
    )

    if verdict == "pass":
        state["current_step_index"] += 1

    # TODO: Replace heuristic verdict with structured LLM validation response.
    # TODO: Distinguish transient failures from quality failures for retry strategy.
    return state
