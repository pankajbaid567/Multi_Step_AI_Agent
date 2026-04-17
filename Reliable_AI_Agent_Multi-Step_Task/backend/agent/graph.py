"""LangGraph DAG construction for planner, executor, validator, reflector, and finalizer."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from agent.nodes import executor_node, finalizer_node, planner_node, reflector_node, validator_node
from agent.state import AgentState


def _route_after_validation(state: AgentState) -> str:
    """Route graph flow based on the validator's latest decision."""
    latest_verdict = state.get("error_log", [])[-1].get("validator_verdict") if state.get("error_log") else "pass"
    if latest_verdict == "retry":
        return "executor"
    if latest_verdict == "reflect":
        return "reflector"
    if state["current_step_index"] >= len(state["steps"]):
        return "finalizer"
    return "executor"


def build_agent_graph():
    """Compile and return the state graph for task orchestration."""
    graph = StateGraph(AgentState)

    graph.add_node("planner", planner_node)
    graph.add_node("executor", executor_node)
    graph.add_node("validator", validator_node)
    graph.add_node("reflector", reflector_node)
    graph.add_node("finalizer", finalizer_node)

    graph.add_edge(START, "planner")
    graph.add_edge("planner", "executor")
    graph.add_edge("executor", "validator")
    graph.add_conditional_edges(
        "validator",
        _route_after_validation,
        {
            "executor": "executor",
            "reflector": "reflector",
            "finalizer": "finalizer",
        },
    )
    graph.add_edge("reflector", "executor")
    graph.add_edge("finalizer", END)

    # TODO: Wire robust checkpoint persistence into graph execution config.
    return graph.compile()
