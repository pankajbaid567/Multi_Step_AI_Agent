# Update 1.1 — Ultra Elite Features

> **Scope:** 4 major feature additions to elevate from "good hackathon project" to "unforgettable, judge-winning system"  
> **Baseline:** Existing system with Planner → Executor → Validator → Reflector → Finalizer pipeline  
> **Outcome:** Parallel execution, multi-agent collaboration, execution trace UI, and metrics dashboard

---

# Part 1: Implementation Plan

## Feature Priority & Sequencing

| # | Feature | Impact | Effort | Build Order |
|---|---------|--------|--------|-------------|
| 1 | Execution Trace UI | 🔴 Critical — visual WOW factor | 6-8 hrs | **Build First** |
| 2 | Metrics Dashboard | 🔴 Critical — data = credibility | 4-5 hrs | **Build Second** |
| 3 | Parallel Execution | 🟡 High — system design depth | 6-8 hrs | **Build Third** |
| 4 | Multi-Agent Collaboration | 🟡 High — architecture maturity | 6-8 hrs | **Build Fourth** |

**Total estimated effort:** 22-29 hours

---

## Feature 1: Execution Trace UI (Hours 0–8)

### Hour 0–2: Backend Trace API Enhancement

**Goals:**
- Enhance trace data structure for rich visualization
- Add WebSocket streaming for real-time trace updates
- Add trace aggregation endpoint for summary statistics

**Tasks:**
- [ ] Extend `TraceEntry` with: `parent_event_id`, `duration_ms`, `tokens_in`, `tokens_out`, `prompt_preview` (first 200 chars), `response_preview` (first 200 chars), `metadata` (model, provider, circuit_state)
- [ ] Add `GET /traces/{task_id}/summary` endpoint returning: total events by type, timeline bounds, step durations, retry/fallback/reflection counts
- [ ] Add `GET /traces/{task_id}/step/{step_id}` endpoint returning all events for a specific step (drill-down)
- [ ] Ensure WebSocket events include full trace payload (not just event type)

**Deliverables:**
- Rich trace API with drill-down capability
- Summary statistics endpoint

### Hour 2–5: Trace Visualization Components

**Goals:**
- Build interactive execution flow graph
- Build expandable timeline with event detail panels
- Build step-level drill-down modal

**Tasks:**
- [ ] `ExecutionFlowGraph.jsx`: DAG-style visualization using custom SVG
  - Nodes: each step as a card (name, status, duration)
  - Edges: directed arrows showing execution flow
  - Retry loops: curved arrows back to same node with attempt count
  - Reflection branches: side nodes showing reflector decisions
  - Fallback indicators: small provider badges on edges
  - Color-coded: green (pass), orange (retry), red (fail), purple (reflect), blue (running)
  - Animated: nodes pulse when active, edges draw progressively
- [ ] `TraceWaterfall.jsx`: Horizontal waterfall/Gantt chart
  - Each step as a horizontal bar (width = duration)
  - Color-coded by status
  - Retry attempts shown as stacked sub-bars
  - Tooltip on hover: tokens, model, latency
  - Time axis along the bottom
- [ ] `StepDetailModal.jsx`: Full drill-down view for a single step
  - Tabs: "Prompt" | "Response" | "Validation" | "Errors"
  - Prompt tab: full formatted prompt with syntax highlighting
  - Response tab: full LLM response with markdown rendering
  - Validation tab: 4 quality scores as radar chart + verdict
  - Errors tab: error log with timestamps and attempts
  - Metadata: model used, provider, tokens (in/out), latency, retry count

**Deliverables:**
- Interactive DAG visualization
- Waterfall timeline
- Step drill-down modal

### Hour 5–8: Integration & Polish

**Tasks:**
- [ ] Wire all trace components into App.jsx
- [ ] Add tab navigation: "Steps" | "Trace Graph" | "Waterfall" | "Logs"
- [ ] Add real-time update: trace components re-render on WebSocket events
- [ ] Add search/filter: filter trace events by type, step, severity
- [ ] Add "Export Trace" button: download full trace as JSON
- [ ] Polish animations: nodes appear progressively, edges animate, error nodes shake

---

## Feature 2: Metrics Dashboard (Hours 8–13)

### Hour 8–10: Backend Metrics Collection

**Goals:**
- Collect per-task and aggregate metrics
- Add metrics API endpoint
- Track historical metrics across multiple task runs

**Tasks:**
- [ ] Create `backend/services/metrics_service.py`:
  ```python
  class MetricsCollector:
      async def record_task_metrics(task_id, state)  # called by finalizer
      async def get_task_metrics(task_id) -> TaskMetrics
      async def get_aggregate_metrics() -> AggregateMetrics
      async def get_provider_metrics() -> ProviderMetrics
  ```
- [ ] `TaskMetrics`:
  - `task_id`, `status`, `total_steps`, `successful_steps`, `failed_steps`, `skipped_steps`
  - `total_tokens` (input + output breakdown), `estimated_cost_usd`
  - `total_duration_ms`, `avg_step_duration_ms`, `max_step_duration_ms`
  - `retry_count`, `fallback_count`, `reflection_count`
  - `confidence_score`, `quality_scores` (per step)
  - `models_used` (frequency map)
  - `tools_used` (frequency map)
- [ ] `AggregateMetrics` (across all tasks in session):
  - `total_tasks`, `completion_rate`, `avg_quality_score`
  - `avg_recovery_rate`, `avg_latency`
  - `total_tokens_consumed`, `total_cost_usd`
  - `top_failure_types` (histogram)
  - `reflection_strategy_distribution`
- [ ] `ProviderMetrics`:
  - Per provider: `calls`, `successes`, `failures`, `avg_latency`, `circuit_state`, `tokens_used`
- [ ] Add endpoints:
  - `GET /metrics/{task_id}` → single task metrics
  - `GET /metrics` → aggregate metrics
  - `GET /metrics/providers` → provider health dashboard

**Deliverables:**
- Complete metrics collection service
- Three metrics API endpoints

### Hour 10–13: Frontend Metrics Dashboard

**Goals:**
- Build a dedicated metrics page with charts and statistics
- Real-time updating during execution
- Provider health visualization

**Tasks:**
- [ ] `MetricsDashboard.jsx`: Full-page metrics view
  - Top row: 4 large stat cards (animated counters)
    - Tasks Completed (with success rate %)
    - Recovery Rate (with sparkline)
    - Avg Quality Score (with gauge)
    - Total Cost (with token breakdown)
  - Middle row: Charts
    - Bar chart: Steps by status (success/failed/skipped/retried)
    - Pie chart: Reflection strategy distribution
    - Histogram: Failure types
  - Bottom row: Provider Health
    - Per-provider cards showing: circuit state, call count, failure rate, avg latency
    - Circuit state as colored indicator (green/red/yellow)
- [ ] `QualityRadar.jsx`: Radar chart showing 4 quality dimensions
  - Per-step overlay to compare quality across steps
- [ ] `CostBreakdown.jsx`: Stacked bar showing token cost by model
  - GPT-4o (expensive) vs GPT-4o-mini (cheap) vs Claude 3.5
  - Input tokens vs output tokens
- [ ] `LatencyTimeline.jsx`: Line chart showing step-by-step latency
  - Highlight spikes (retries, fallbacks)
  - Annotate: "Retry here", "Fallback here"
- [ ] Chart library: Use **Recharts** (React-native, declarative, lightweight)
  - Install: `npm install recharts`
  - Components: BarChart, PieChart, RadarChart, LineChart, AreaChart

**Deliverables:**
- Full metrics dashboard with 4+ chart types
- Provider health monitoring
- Real-time metric updates

---

## Feature 3: Parallel Execution (Hours 13–21)

### Hour 13–15: Dependency Graph Builder

**Goals:**
- Parse step dependencies into a DAG
- Identify independent steps that can execute in parallel
- Build topological execution schedule with parallelism levels

**Tasks:**
- [ ] Create `backend/agent/parallel/dag.py`:
  ```python
  class ExecutionDAG:
      def __init__(self, steps: List[StepDefinition]):
          self.graph: Dict[str, Set[str]] = {}  # step_id → set of dependency step_ids
          self.reverse: Dict[str, Set[str]] = {}  # step_id → steps that depend on it
      
      def build_from_steps(self, steps):
          """Parse dependency fields into a DAG structure."""
      
      def get_execution_levels(self) -> List[List[str]]:
          """Topological sort into parallelism levels.
          Returns: [[step_1, step_2], [step_3], [step_4, step_5]]
          Level 0: no dependencies (parallel)
          Level 1: depends on level 0 results (parallel within level)
          Level 2: depends on level 1 results, etc."""
      
      def validate(self) -> bool:
          """Check for cycles, missing dependencies."""
      
      def get_ready_steps(self, completed: Set[str]) -> List[str]:
          """Given completed step IDs, return steps whose deps are all satisfied."""
  ```
- [ ] Update `planner.py` to generate dependency-aware plans:
  - Include `dependencies` field properly (not just sequential)
  - Example: "Research topic A" and "Research topic B" are independent → parallel
  - "Compare A and B" depends on both → sequential after both complete

**Deliverables:**
- DAG builder with topological sort
- Parallelism level computation
- Updated Planner generating real dependencies

### Hour 15–18: Parallel Executor

**Goals:**
- Execute independent steps concurrently using asyncio
- Maintain correct context accumulation
- Handle failures in parallel branches

**Tasks:**
- [ ] Create `backend/agent/parallel/executor.py`:
  ```python
  class ParallelExecutor:
      async def execute_level(self, steps: List[StepDefinition], state: AgentState) -> List[StepResult]:
          """Execute all steps in a level concurrently.
          Uses asyncio.gather() with return_exceptions=True.
          Each step gets the same context (from prior levels).
          Returns results for all steps in the level."""
      
      async def execute_dag(self, dag: ExecutionDAG, state: AgentState) -> AgentState:
          """Execute the full DAG level by level.
          Level 0: run all in parallel → collect results
          Level 1: inject Level 0 results as context → run all in parallel
          ...continue until all levels done or ABORT triggered."""
  ```
- [ ] Handle parallel failure scenarios:
  - One step in a level fails: retry/reflect that step, other results preserved
  - Step depended on by many: wait for reflection/skip before proceeding
  - All steps in a level fail: attempt reflection on each, then proceed
  - Concurrent token tracking: atomic increment using asyncio.Lock
- [ ] Update `graph.py` to support parallel execution mode:
  - Config flag: `PARALLEL_MODE=true/false`
  - When true: use ParallelExecutor instead of sequential executor
  - When false: fallback to existing sequential behavior
- [ ] Update trace events for parallel execution:
  - `parallel_level_started`: {level: N, step_count: M}
  - `parallel_step_completed`: {level: N, step_id: X, concurrent_with: [Y, Z]}

**Deliverables:**
- Async parallel execution within dependency levels
- Failure handling across parallel branches
- Backward-compatible with sequential mode

### Hour 18–21: Frontend DAG Visualization

**Tasks:**
- [ ] Update `ExecutionFlowGraph.jsx` for parallel layout:
  - Steps at the same level displayed side-by-side (not stacked)
  - Horizontal lanes for parallel steps within a level
  - Vertical progression between levels
  - Dependency edges drawn between levels
  - Animated: parallel steps start simultaneously, converge at next level
- [ ] Add parallel execution indicators:
  - "⚡ Parallel (2 steps)" badge on levels with >1 step
  - Time saved indicator: "Saved ~3.2s by running in parallel"
- [ ] Update waterfall chart for parallel bars (overlapping horizontal bars within a level)

**Deliverables:**
- Visual distinction between parallel and sequential execution
- Parallel timing visualization

---

## Feature 4: Multi-Agent Collaboration (Hours 21–29)

### Hour 21–24: Agent Specialization Framework

**Goals:**
- Define specialized agent roles
- Create agent routing based on step type
- Maintain agent-specific system prompts and tool access

**Tasks:**
- [ ] Create `backend/agent/multi_agent/agents.py`:
  ```python
  class SpecializedAgent:
      def __init__(self, name, role, system_prompt, tools, preferred_model):
          self.name = name          # "ResearchAgent"
          self.role = role          # "research"
          self.system_prompt = system_prompt
          self.tools = tools        # ["web_search"]
          self.preferred_model = preferred_model
  
  # Pre-defined agents:
  RESEARCH_AGENT = SpecializedAgent(
      name="Research Agent",
      role="research",
      system_prompt="You are an expert research analyst...",
      tools=["web_search"],
      preferred_model="gpt-4o"
  )
  
  CODE_AGENT = SpecializedAgent(
      name="Code Agent",
      role="code",
      system_prompt="You are a senior software engineer...",
      tools=["code_exec"],
      preferred_model="gpt-4o"
  )
  
  ANALYSIS_AGENT = SpecializedAgent(
      name="Analysis Agent",
      role="analysis",
      system_prompt="You are a data analyst and strategic thinker...",
      tools=["llm_only"],
      preferred_model="gpt-4o"
  )
  
  WRITING_AGENT = SpecializedAgent(
      name="Writing Agent",
      role="writing",
      system_prompt="You are an expert technical writer...",
      tools=["llm_only"],
      preferred_model="claude-3-5-sonnet-20241022"  # Claude is better at writing
  )
  ```

- [ ] Create `backend/agent/multi_agent/router.py`:
  ```python
  class AgentRouter:
      def __init__(self):
          self.agents = {
              "web_search": RESEARCH_AGENT,
              "api_call": RESEARCH_AGENT,
              "code_exec": CODE_AGENT,
              "llm_only": None,  # route by step analysis
          }
      
      async def route_step(self, step: StepDefinition, context: str) -> SpecializedAgent:
          """Determine which agent should handle this step.
          Route by tool_needed first, then by LLM classification if ambiguous."""
      
      def get_agent_for_tool(self, tool: str) -> SpecializedAgent
      async def classify_step(self, step: StepDefinition) -> str  # LLM-based classification
  ```

**Deliverables:**
- 4 specialized agents with role-specific system prompts
- Router that selects the best agent per step

### Hour 24–27: Inter-Agent Communication

**Goals:**
- Agents share results through a shared context protocol
- Meta-agent (Coordinator) oversees execution and handoffs
- Agent execution history tracked for each step

**Tasks:**
- [ ] Create `backend/agent/multi_agent/coordinator.py`:
  ```python
  class AgentCoordinator:
      """Orchestrates multi-agent task execution."""
      
      def __init__(self):
          self.router = AgentRouter()
          self.agent_history: Dict[str, List[dict]] = {}  # step_id → agent actions
      
      async def execute_step_with_agent(self, step, state) -> StepResult:
          """
          1. Route step to appropriate agent
          2. Build agent-specific prompt (system prompt + step + context)
          3. Execute with agent's preferred model
          4. Log agent assignment in trace
          5. Return result with agent metadata
          """
      
      async def handoff(self, from_agent, to_agent, context, step):
          """Transfer context from one agent to another.
          Summarizes prior agent's work into a handoff message."""
      
      def get_agent_contributions(self) -> Dict[str, dict]:
          """Return which agent handled each step + performance."""
  ```

- [ ] Update `StepResult` model:
  - Add `agent_name: Optional[str]` — which agent executed this step
  - Add `agent_role: Optional[str]` — agent's role classification

- [ ] Update Executor node to use AgentCoordinator:
  - If MULTI_AGENT_MODE=true: route through coordinator
  - If false: existing single-agent behavior

- [ ] Add trace events for multi-agent:
  - `agent_assigned`: {step_id, agent_name, agent_role, reason}
  - `agent_handoff`: {from_agent, to_agent, context_summary}

**Deliverables:**
- Coordinator orchestrating agent selection and handoffs
- Agent assignment tracking in execution trace

### Hour 27–29: Frontend Agent Visualization

**Tasks:**
- [ ] Update StepCard to show agent badge:
  - 🔬 Research Agent (blue)
  - 💻 Code Agent (green)
  - 📊 Analysis Agent (orange)
  - ✍️ Writing Agent (purple)
- [ ] Add `AgentPanel.jsx`: sidebar showing active agents
  - Each agent: avatar, name, current task, steps handled, performance
  - Animated: agent "lights up" when executing
- [ ] Update ExecutionFlowGraph to show agent colors on nodes
- [ ] Add agent contribution chart to MetricsDashboard:
  - Pie chart: "Steps by Agent"
  - Bar chart: "Quality Score by Agent"

**Deliverables:**
- Agent identification on step cards
- Agent contribution visualization

---

# Part 2: Architecture Updates

## Updated System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Tailwind + Recharts)                │
│                                                                              │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │TaskInput │ │Execution     │ │Trace         │ │ Metrics Dashboard      │  │
│  │  Form    │ │Flow Graph    │ │Waterfall     │ │ (Charts, Provider      │  │
│  │          │ │(DAG + Parallel│ │(Gantt)       │ │  Health, Agent Stats)  │  │
│  └──────────┘ │ Lanes)       │ └──────────────┘ └────────────────────────┘  │
│               └──────────────┘                                               │
│                    ▲ WebSocket (real-time events + trace + metrics)           │
└────────────────────┼─────────────────────────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────────────────────────┐
│                    │        API GATEWAY (FastAPI)                             │
│    Routes: /tasks  /execute  /traces  /metrics  /ws  /config                 │
└────────┬───────────┴──────────┬────────────────────┬─────────────────────────┘
         │                      │                    │
┌────────▼──────────────────────▼────────────────────▼─────────────────────────┐
│                    ORCHESTRATION ENGINE (LangGraph)                           │
│                                                                              │
│  ┌──────────────┐                                                            │
│  │  COORDINATOR │ ← NEW: Routes steps to specialized agents                  │
│  │  (Meta-Agent)│                                                            │
│  └──────┬───────┘                                                            │
│         │                                                                    │
│  ┌──────▼───────────────────────────────────────────────────────────────┐    │
│  │                    AGENT POOL (NEW)                                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │Research  │ │Code      │ │Analysis  │ │Writing   │               │    │
│  │  │Agent     │ │Agent     │ │Agent     │ │Agent     │               │    │
│  │  │🔬 search │ │💻 code   │ │📊 reason │ │✍️ write  │               │    │
│  │  │GPT-4o   │ │GPT-4o   │ │GPT-4o   │ │Claude   │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │             PARALLEL EXECUTION ENGINE (NEW)               │               │
│  │                                                          │               │
│  │  ┌──────────────────────────────────────────────────┐    │               │
│  │  │         EXECUTION DAG                            │    │               │
│  │  │                                                  │    │               │
│  │  │  Level 0:  [Step 1] ──┐    [Step 2] ──┐          │    │               │
│  │  │                       │               │          │    │               │
│  │  │  Level 1:         [Step 3] ───────────┤          │    │               │
│  │  │                                       │          │    │               │
│  │  │  Level 2:                         [Step 4]       │    │               │
│  │  │                                       │          │    │               │
│  │  │  Level 3:                         [Step 5]       │    │               │
│  │  └──────────────────────────────────────────────────┘    │               │
│  │                                                          │               │
│  │  asyncio.gather() within each level                      │               │
│  │  Sequential between levels                               │               │
│  └──────────────────────────────────────────────────────────┘               │
│                                                                              │
│  ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐       │
│  │Planner │→│Executor  │→│  Validator   │→│Reflector │→│Finalizer │       │
│  │  Node  │ │  Node    │ │   Node       │ │  Node    │ │  Node    │       │
│  └────────┘ └──────────┘ └──────────────┘ └──────────┘ └──────────┘       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────┐               │
│  │             METRICS COLLECTOR (NEW)                       │               │
│  │  Records: task metrics, provider metrics, agent metrics   │               │
│  └──────────────────────────────────────────────────────────┘               │
└───────┬──────────────┬──────────────────┬───────────────────────────────────┘
        │              │                  │
  ┌─────▼─────┐  ┌─────▼──────┐   ┌──────▼──────┐
  │   Redis   │  │   FAISS    │   │  LLM APIs   │
  │State+Pub/ │  │ Memory     │   │GPT-4o/mini  │
  │Sub+Metrics│  │            │   │Claude 3.5   │
  └───────────┘  └────────────┘   └─────────────┘
```

## Updated AgentState

```python
class AgentState(TypedDict):
    # ... existing fields ...
    
    # NEW: Parallel Execution
    execution_dag: Optional[dict]           # DAG structure: {step_id: [dep_ids]}
    execution_levels: Optional[List[List[str]]]  # [[step_1, step_2], [step_3], ...]
    current_level: int                      # Which parallel level is executing
    parallel_mode: bool                     # True if DAG-based parallel execution
    
    # NEW: Multi-Agent
    agent_assignments: Dict[str, str]       # step_id → agent_name
    agent_contributions: Dict[str, dict]    # agent_name → {steps_handled, avg_quality, tokens}
    
    # NEW: Metrics
    task_metrics: Optional[dict]            # Computed by finalizer
```

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/metrics/{task_id}` | Single task metrics |
| GET | `/metrics` | Aggregate metrics (all tasks) |
| GET | `/metrics/providers` | Provider health + circuit states |
| GET | `/traces/{task_id}/summary` | Trace summary statistics |
| GET | `/traces/{task_id}/step/{step_id}` | Step-level trace drill-down |
| POST | `/config/parallel` | Toggle parallel execution mode |
| POST | `/config/agents` | Toggle multi-agent mode |
| GET | `/config` | Get all config flags |

---

# Part 3: Requirements

## FR-9: Parallel Execution

| ID | Requirement | Priority |
|----|------------|----------|
| FR-9.1 | The system SHALL parse step dependencies into a DAG structure after planning. | P0 |
| FR-9.2 | The system SHALL identify independent steps (no mutual dependencies) and execute them concurrently using `asyncio.gather()`. | P0 |
| FR-9.3 | The system SHALL organize steps into execution levels where all steps in a level can run in parallel. | P0 |
| FR-9.4 | The system SHALL wait for ALL steps in a level to complete (or fail/skip) before proceeding to the next level. | P0 |
| FR-9.5 | If a parallel step fails, the system SHALL retry/reflect that step independently without blocking other steps in the same level. | P1 |
| FR-9.6 | The system SHALL track time saved by parallel execution: `time_saved = sum(step_durations) - wall_clock_time`. | P1 |
| FR-9.7 | The system SHALL support a config flag `PARALLEL_MODE` to toggle between parallel and sequential execution. | P0 |
| FR-9.8 | The Planner SHALL be instructed to identify truly independent steps (not just sequential numbering). | P0 |

## FR-10: Multi-Agent Collaboration

| ID | Requirement | Priority |
|----|------------|----------|
| FR-10.1 | The system SHALL define at least 4 specialized agents: Research, Code, Analysis, Writing. | P0 |
| FR-10.2 | Each agent SHALL have a unique system prompt, tool access list, and preferred LLM model. | P0 |
| FR-10.3 | The system SHALL route each step to the most appropriate agent based on `tool_needed` and step classification. | P0 |
| FR-10.4 | Agent assignment SHALL be logged in the execution trace with: agent_name, role, routing_reason. | P0 |
| FR-10.5 | The system SHALL track per-agent metrics: steps handled, avg quality, tokens consumed. | P1 |
| FR-10.6 | Inter-agent handoffs SHALL include a context summary to prevent information loss. | P1 |
| FR-10.7 | The system SHALL support a config flag `MULTI_AGENT_MODE` to toggle agent specialization. | P0 |

## FR-11: Execution Trace UI

| ID | Requirement | Priority |
|----|------------|----------|
| FR-11.1 | The frontend SHALL render an interactive DAG/flow graph showing all steps with connections. | P0 |
| FR-11.2 | The trace graph SHALL display retry loops, fallback switches, and reflection branches visually. | P0 |
| FR-11.3 | Each trace event SHALL be expandable to show: full prompt, full response, token count, model, latency. | P0 |
| FR-11.4 | The frontend SHALL include a waterfall/Gantt chart showing step timing and parallel execution. | P1 |
| FR-11.5 | The trace UI SHALL update in real-time via WebSocket without page refresh. | P0 |
| FR-11.6 | The trace SHALL be exportable as JSON for offline analysis. | P1 |
| FR-11.7 | The trace UI SHALL support filtering by: event type, step, severity. | P1 |

## FR-12: Metrics Dashboard

| ID | Requirement | Priority |
|----|------------|----------|
| FR-12.1 | The system SHALL compute and display: TCR, recovery rate, avg quality score, latency, cost. | P0 |
| FR-12.2 | The dashboard SHALL show per-provider health: circuit state, call count, failure rate, avg latency. | P0 |
| FR-12.3 | The dashboard SHALL include at least 3 chart types (bar, pie/donut, line/area). | P0 |
| FR-12.4 | Metrics SHALL update in real-time during task execution. | P1 |
| FR-12.5 | The dashboard SHALL show token cost breakdown by model and by step. | P1 |
| FR-12.6 | The dashboard SHALL show reflection strategy distribution (MODIFY/SKIP/DECOMPOSE/ABORT). | P1 |
| FR-12.7 | The dashboard SHALL show agent contribution breakdown (steps by agent, quality by agent). | P1 |

---

# Part 4: Comprehensive Build Prompts

---

## Prompt 1: Enhanced Trace API

```
You are upgrading the trace system for an AI agent with LangGraph orchestration.

Current state: Basic trace with flat TraceEntry list.
Target state: Rich trace with drill-down, summaries, and real-time streaming.

Modify: backend/models/task.py

Update TraceEntry model to include these new fields:
- parent_event_id: Optional[str] = None  # Links retry/fallback events to the original step event
- prompt_preview: Optional[str] = None   # First 200 chars of the prompt sent
- response_preview: Optional[str] = None # First 200 chars of the response received
- tokens_in: Optional[int] = None        # Input/prompt tokens
- tokens_out: Optional[int] = None       # Output/completion tokens
- provider: Optional[str] = None         # "openai" or "anthropic"
- circuit_state: Optional[str] = None    # "closed", "open", "half_open" at time of call
- agent_name: Optional[str] = None       # Which specialized agent handled this (for multi-agent)
- level: Optional[int] = None            # Parallel execution level (for parallel mode)
- concurrent_with: Optional[List[str]] = None  # Other step_ids executing in parallel

Create: backend/models/metrics.py

class TaskMetrics(BaseModel):
    task_id: str
    status: str
    total_steps: int
    successful_steps: int
    failed_steps: int
    skipped_steps: int
    total_tokens: int
    tokens_input: int
    tokens_output: int
    estimated_cost_usd: float
    total_duration_ms: int
    avg_step_duration_ms: float
    max_step_duration_ms: int
    retry_count: int
    fallback_count: int
    reflection_count: int
    confidence_score: Optional[str]
    quality_scores: List[dict]  # [{step_id, relevance, completeness, consistency, plausibility}]
    models_used: Dict[str, int]  # model_name → call_count
    tools_used: Dict[str, int]   # tool_name → usage_count
    agents_used: Dict[str, int]  # agent_name → steps_handled
    time_saved_parallel_ms: Optional[int]  # time saved by parallel execution
    failure_types: Dict[str, int]  # error_type → count
    reflection_strategies: Dict[str, int]  # strategy → count

class AggregateMetrics(BaseModel):
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    completion_rate: float
    avg_quality_score: float
    avg_recovery_rate: float
    avg_latency_ms: float
    total_tokens_consumed: int
    total_cost_usd: float
    provider_metrics: Dict[str, dict]  # provider → {calls, failures, avg_latency, circuit_state}

class TraceSummary(BaseModel):
    task_id: str
    total_events: int
    events_by_type: Dict[str, int]
    timeline_start: str
    timeline_end: str
    total_duration_ms: int
    step_durations: List[dict]  # [{step_id, step_name, duration_ms, status}]
    retry_count: int
    fallback_count: int
    reflection_count: int

Create: backend/services/metrics_service.py

class MetricsService:
    def __init__(self):
        self._task_metrics: Dict[str, TaskMetrics] = {}
    
    def compute_task_metrics(self, state: AgentState) -> TaskMetrics:
        """Compute all metrics from a completed AgentState."""
        # Calculate: step counts, token totals, cost, quality scores, etc.
        # Cost rates:
        #   GPT-4o: $2.50/1M input, $10.00/1M output
        #   GPT-4o-mini: $0.15/1M input, $0.60/1M output
        #   Claude 3.5: $3.00/1M input, $15.00/1M output
    
    def record_task_metrics(self, task_id: str, state: AgentState):
        """Compute and store metrics for a completed task."""
    
    def get_task_metrics(self, task_id: str) -> Optional[TaskMetrics]:
        """Retrieve stored metrics for a task."""
    
    def get_aggregate_metrics(self) -> AggregateMetrics:
        """Compute aggregate metrics across all recorded tasks."""
    
    def get_trace_summary(self, state: AgentState) -> TraceSummary:
        """Compute trace summary statistics."""

# Singleton
_service = None
def get_metrics_service() -> MetricsService: ...

Update: backend/routes/traces.py

Add these endpoints:
- GET /traces/{task_id}/summary → TraceSummary
- GET /traces/{task_id}/step/{step_id} → List[TraceEntry] (filtered)

Create: backend/routes/metrics.py

Add these endpoints:
- GET /metrics/{task_id} → TaskMetrics
- GET /metrics → AggregateMetrics
- GET /metrics/providers → provider health with circuit states

Generate ALL files with COMPLETE implementations. No placeholders.
Wire the metrics routes into main.py.
Call metrics_service.record_task_metrics() in the finalizer node.
```

---

## Prompt 2: Execution Trace UI Components

```
You are building the execution trace visualization for an AI agent dashboard.

Tech: React 18 + Tailwind CSS + Framer Motion + Recharts (npm install recharts)

Create these components:

FILE 1: frontend/src/components/ExecutionFlowGraph.jsx
An interactive DAG visualization of the agent's execution.

Requirements:
- Layout: top-to-bottom flow layout using custom SVG
- Each step is a node (rounded rectangle):
  - Step name (bold)
  - Status badge (color-coded: green/red/orange/purple/blue/gray)
  - Duration (e.g., "3.2s")
  - Agent badge (if multi-agent mode): 🔬 Research / 💻 Code / 📊 Analysis / ✍️ Writing
  - Model badge: small pill showing "GPT-4o" or "Claude"
- Edges between nodes:
  - Solid arrows for normal flow
  - Dashed orange arrows for retry loops (curved back to same node with "Retry 2/3" label)
  - Purple branching arrows for reflection (to a side "Reflector" mini-node)
  - Red "X" on edges for fallback switches (with "→ Claude" label)
- Parallel execution visualization:
  - Steps at the same level arranged horizontally (side by side)
  - "⚡ Parallel" badge between the level bracket
  - Converging edges at the next level
- Animations (framer-motion):
  - Nodes fade in with stagger delay per level
  - Active node has a pulsing glow border
  - Edges draw progressively (SVG stroke-dashoffset animation)
  - Completed nodes get a checkmark animation
  - Failed nodes shake
- Size: auto-scales to fit 2-10 steps
- Scroll if more than 6 levels

FILE 2: frontend/src/components/TraceWaterfall.jsx
A horizontal waterfall/Gantt-style chart showing execution timing.

Requirements:
- X-axis: time (0s to total_duration)
- Y-axis: step names (one row per step)
- Each step is a horizontal bar:
  - Width proportional to duration
  - Color by status (green/red/orange/purple)
  - If retried: show sub-bars within the main bar (attempt 1 | attempt 2 | attempt 3)
  - If parallel: bars at the same level overlap vertically with transparency
- Annotations on bars:
  - "🔁 Retry" marker at retry points
  - "🔄 Fallback" marker at fallback points
  - "🤔 Reflect" marker at reflection points
- Hover tooltip: step name, duration, tokens, model, status
- Time markers: vertical dashed lines at 30s, 60s, 90s, etc.
- Legend at bottom: color meanings

FILE 3: frontend/src/components/StepDetailModal.jsx
A full-screen modal for detailed step inspection.

Requirements:
- Trigger: click on any step in the flow graph or waterfall
- Layout: large modal (80% screen) with tabbed content
- Tabs:
  1. "Prompt" tab:
     - Full prompt text with syntax highlighting (use a <pre> with monospace)
     - Copy button
     - Token count indicator
  2. "Response" tab:
     - Full LLM response with markdown rendering
     - Copy button
     - Token count indicator
  3. "Validation" tab:
     - 4 quality scores displayed as:
       - Horizontal bar chart (0-10 scale)
       - Color-coded: >=6 green, 3-5 orange, <3 red
     - Verdict badge: "✅ Pass" / "🔁 Retry" / "🤔 Reflect"
     - Validator's reason text
  4. "Errors" tab (if any):
     - Chronological error list with: timestamp, error_type, message, attempt number
     - Color-coded severity
  5. "Trace" tab:
     - All trace events for this step in chronological order
     - Expandable event details
- Header: step name, agent badge, model used, total duration
- Close button (X) and click-outside-to-close
- Framer-motion: slide up + fade in animation

All components must use Tailwind CSS dark theme.
The flow graph must work with 2-10 steps and handle retry/reflection branches.
Generate COMPLETE implementations for all 3 files.
```

---

## Prompt 3: Metrics Dashboard

```
You are building a professional metrics dashboard for an AI agent system.

Tech: React 18 + Tailwind CSS + Recharts + Framer Motion

Install: npm install recharts

Create these components:

FILE 1: frontend/src/components/MetricsDashboard.jsx
Full-page metrics dashboard with multiple chart sections.

Layout (dark theme, glassmorphism cards):

ROW 1: "Key Metrics" — 5 stat cards in a horizontal row:
  1. Tasks Completed: "29/30" with circular progress ring (96.7%)
  2. Recovery Rate: "78.4%" with small sparkline showing trend
  3. Avg Quality: "7.4/10" with gradient gauge
  4. Total Tokens: "124,580" with input/output breakdown
  5. Total Cost: "$1.87" with per-model breakdown tooltip

  Each card:
  - Glass card with subtle border
  - Large number with animated count-up (on mount)
  - Subtitle text
  - Trend indicator (↑ green or ↓ red) if aggregate data available
  - Framer-motion: fade-in with stagger

ROW 2: "Execution Analysis" — 2 charts side by side:
  LEFT: Stacked bar chart (Recharts BarChart)
    - X-axis: step names
    - Y-axis: duration (ms)
    - Stacks: execution time | retry time | reflection time
    - Colors: blue | orange | purple
    - Tooltip: detailed breakdown

  RIGHT: Donut chart (Recharts PieChart with inner radius)
    - Segments: Success / Failed / Skipped / Retried
    - Colors: green / red / gray / orange
    - Center text: total steps count
    - Legend below

ROW 3: "Reliability Insights" — 2 charts:
  LEFT: Pie chart: Reflection Strategy Distribution
    - Segments: MODIFY_STEP / SKIP_STEP / DECOMPOSE / ABORT
    - Colors: blue / yellow / purple / red
    - Show count and percentage in legend

  RIGHT: Horizontal bar chart: Failure Type Histogram
    - Y-axis: failure types (TIMEOUT, RATE_LIMITED, EMPTY_OUTPUT, etc.)
    - X-axis: count
    - Color gradient by severity

ROW 4: "Provider Health" — horizontal card row:
  Per provider card (OpenAI GPT-4o, GPT-4o-mini, Claude 3.5):
    - Provider name and logo placeholder
    - Circuit state indicator:
      - CLOSED: green circle + "Healthy"
      - OPEN: red circle + "Down" with pulse animation
      - HALF_OPEN: yellow circle + "Probing"
    - Stats: calls made, failure rate %, avg latency
    - Sparkline: latency over time

ROW 5: (If multi-agent mode) "Agent Contributions":
  Horizontal bar chart:
    - Y-axis: agent names (Research, Code, Analysis, Writing)
    - X-axis: steps handled
    - Color by average quality score (green = high, orange = medium)
    - Tooltip: agent name, steps, avg quality, tokens used

Props: { metrics: TaskMetrics | AggregateMetrics, providerMetrics: ProviderMetrics }

FILE 2: frontend/src/components/QualityRadar.jsx
Radar chart showing 4 quality dimensions for a specific step or averaged.

- Axes: Relevance, Completeness, Consistency, Plausibility
- Scale: 0-10
- Show current step as filled area (semi-transparent)
- If comparison mode: overlay multiple steps on same radar
- Recharts RadarChart component

FILE 3: frontend/src/components/CostBreakdown.jsx
Token cost breakdown visualization.

- Stacked area chart: cumulative token usage over time (step by step)
- Color-coded by model: GPT-4o (blue), GPT-4o-mini (green), Claude (purple)
- Separate lines for input vs output tokens
- Right Y-axis: cumulative cost in $
- Annotations: "Fallback here" markers where model switched

Generate ALL 3 components with COMPLETE implementations.
Use hard-coded mock data as defaults so components render without a backend.
Components must accept real data via props to override mock data.
All Recharts components must have responsive containers.
Dark theme throughout. Premium, data-rich aesthetic.
```

---

## Prompt 4: Parallel Execution Engine

```
You are building a parallel execution engine for the AI agent system.

The current system executes steps sequentially. You are adding DAG-based parallel execution where independent steps run concurrently.

Create these files:

FILE 1: backend/agent/parallel/dag.py

class ExecutionDAG:
    """Directed Acyclic Graph for step dependency management."""
    
    def __init__(self):
        self.nodes: Dict[str, StepDefinition] = {}
        self.edges: Dict[str, Set[str]] = {}      # step_id → set of dependency step_ids
        self.reverse_edges: Dict[str, Set[str]] = {}  # step_id → steps that depend on it
    
    @classmethod
    def from_steps(cls, steps: List[StepDefinition]) -> "ExecutionDAG":
        """Build DAG from list of StepDefinitions with dependency fields."""
    
    def validate(self) -> Tuple[bool, Optional[str]]:
        """Validate DAG: check for cycles, missing deps, orphan nodes.
        Returns (is_valid, error_message)."""
    
    def topological_sort(self) -> List[str]:
        """Return step_ids in valid execution order (Kahn's algorithm)."""
    
    def get_execution_levels(self) -> List[List[str]]:
        """Group steps into parallel execution levels.
        Level N contains all steps whose dependencies are all in levels 0..N-1.
        Steps in the same level can execute concurrently.
        
        Algorithm:
        1. Start with nodes that have no dependencies → Level 0
        2. Remove Level 0 nodes from graph
        3. Find new nodes with no remaining dependencies → Level 1
        4. Repeat until all nodes assigned
        
        Returns: [[step_1, step_2], [step_3], [step_4, step_5, step_6]]
        """
    
    def get_ready_steps(self, completed: Set[str]) -> List[str]:
        """Given set of completed step_ids, return steps whose 
        ALL dependencies are in the completed set."""
    
    def get_dependency_depth(self, step_id: str) -> int:
        """Longest path from any root to this step (for timeline visualization)."""
    
    def to_dict(self) -> dict:
        """Serialize DAG for storage in AgentState."""
    
    @classmethod
    def from_dict(cls, data: dict) -> "ExecutionDAG":
        """Deserialize DAG from AgentState."""

FILE 2: backend/agent/parallel/executor.py

class ParallelExecutor:
    """Executes steps in parallel within dependency levels."""
    
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self._tokens_lock = asyncio.Lock()  # For atomic token counting
    
    async def _execute_single_step(
        self, step: StepDefinition, state: AgentState, 
        level: int, concurrent_ids: List[str]
    ) -> Tuple[StepResult, List[dict]]:
        """Execute a single step with full reliability wrapping.
        Returns: (StepResult, list of trace events generated)
        
        This is a self-contained execution:
        1. Publish step_started event
        2. Dispatch tool if needed
        3. Call LLM with fallback
        4. Validate output
        5. If retry needed: retry within this function
        6. If reflect needed: call reflector
        7. Return final result
        """
    
    async def execute_level(
        self, level_index: int, step_ids: List[str], state: AgentState
    ) -> AgentState:
        """Execute all steps in a parallel level concurrently.
        
        Uses asyncio.gather() with return_exceptions=True.
        
        Steps share the same input context (from prior levels).
        Steps do NOT see each other's results (they're concurrent).
        
        After all steps complete:
        - Collect all results
        - Update state with results
        - Save checkpoint
        
        Failure handling:
        - If a step fails: its result is recorded as failed
        - Other steps in the level are NOT affected
        - Failed steps are handled by reflection in a post-level phase
        """
    
    async def execute_dag(self, dag: ExecutionDAG, state: AgentState) -> AgentState:
        """Execute the full DAG level by level.
        
        for level_index, level_step_ids in enumerate(dag.get_execution_levels()):
            state = await self.execute_level(level_index, level_step_ids, state)
            # Check for ABORT from any reflection
            if state["status"] == "failed":
                break
        
        Publish events:
        - parallel_level_started: {level, step_count, step_ids}
        - parallel_level_completed: {level, results_summary}
        """

FILE 3: backend/agent/parallel/__init__.py
Export: ExecutionDAG, ParallelExecutor

Modify: backend/agent/graph.py (describe changes, don't rewrite entire file)

Add a config check:
- If config.PARALLEL_MODE:
    - After planner, build ExecutionDAG from steps
    - Store dag in state["execution_dag"]
    - Store levels in state["execution_levels"]
    - Replace sequential executor loop with ParallelExecutor.execute_dag()
- Else:
    - Existing sequential behavior

Modify: backend/agent/nodes/planner.py (describe changes)

Update the planner prompt to explicitly request dependency analysis:
- Add to prompt: "For each step, list its dependencies — which prior steps MUST complete 
  before this step can start. If a step has no dependencies (can run independently), 
  set dependencies to an empty list. Maximize parallelism — only add dependencies where 
  data from a prior step is actually needed."
- Add few-shot example showing parallel plan:
  Task: "Research AI and crypto, then compare them"
  Steps:
  - step_1: Research AI (deps: [])
  - step_2: Research crypto (deps: [])  ← parallel with step_1!
  - step_3: Compare AI and crypto (deps: [step_1, step_2])

Generate ALL files with COMPLETE implementations.
Include error handling for: step timeout in parallel, deadlock detection, concurrent token tracking.
```

---

## Prompt 5: Multi-Agent Collaboration System

```
You are building a multi-agent collaboration system for the AI agent.

Instead of a single generic agent executing all steps, the system now routes steps to specialized agents based on step type.

Create these files:

FILE 1: backend/agent/multi_agent/agents.py

Define 4 specialized agents:

@dataclass
class SpecializedAgent:
    name: str               # Display name
    role: str               # "research", "code", "analysis", "writing"
    system_prompt: str       # Role-specific system prompt (detailed, 200+ words)
    tools: List[str]         # Tools this agent can use
    preferred_model: str     # Preferred LLM model
    temperature: float       # Role-specific temperature
    description: str         # One-line description for UI

RESEARCH_AGENT = SpecializedAgent(
    name="Research Agent",
    role="research",
    system_prompt="""You are an expert research analyst with deep expertise in 
    information retrieval, source evaluation, and knowledge synthesis. Your strength 
    is finding accurate, relevant information from multiple sources and extracting 
    key insights. Always cite your sources. Prefer specific data points over 
    generalizations. When information is uncertain, clearly state the confidence 
    level. Structure your findings with clear headings and bullet points.""",
    tools=["web_search", "api_call"],
    preferred_model="gpt-4o",
    temperature=0.3,  # Lower = more focused search results
    description="Specialized in web research, data gathering, and source synthesis"
)

CODE_AGENT = SpecializedAgent(
    name="Code Agent",
    role="code",
    system_prompt="""You are a senior software engineer with expertise in Python, 
    JavaScript, and system design. Write clean, well-documented, production-quality 
    code. Always include: docstrings, type hints, error handling, and edge case 
    considerations. When writing tests, cover happy path, edge cases, and error 
    scenarios. Follow SOLID principles and prefer composition over inheritance.""",
    tools=["code_exec", "llm_only"],
    preferred_model="gpt-4o",
    temperature=0.2,  # Lower = more deterministic code
    description="Specialized in code generation, testing, and technical implementation"
)

ANALYSIS_AGENT = SpecializedAgent(
    name="Analysis Agent",
    role="analysis",
    system_prompt="""You are a senior data analyst and strategic thinker. Your 
    expertise is in analyzing complex information, identifying patterns, drawing 
    comparisons, and producing actionable insights. Use structured frameworks 
    (SWOT, pros/cons, matrices) when appropriate. Back claims with data. 
    Present findings with clear logic and reasoning chains. Quantify where possible.""",
    tools=["llm_only"],
    preferred_model="gpt-4o",
    temperature=0.5,
    description="Specialized in data analysis, comparison, and strategic reasoning"
)

WRITING_AGENT = SpecializedAgent(
    name="Writing Agent",
    role="writing",
    system_prompt="""You are an expert technical writer and content creator. Your 
    writing is clear, engaging, and well-structured. You excel at synthesizing 
    complex information into readable summaries, reports, and documentation. 
    Use appropriate tone for the audience. Include executive summaries, clear 
    section headings, and actionable conclusions. Avoid jargon unless the audience 
    is technical.""",
    tools=["llm_only"],
    preferred_model="claude-3-5-sonnet-20241022",  # Claude excels at writing
    temperature=0.7,  # Higher = more creative writing
    description="Specialized in report writing, synthesis, and documentation"
)

AGENT_REGISTRY = {
    "research": RESEARCH_AGENT,
    "code": CODE_AGENT,
    "analysis": ANALYSIS_AGENT,
    "writing": WRITING_AGENT,
}

FILE 2: backend/agent/multi_agent/router.py

class AgentRouter:
    """Routes steps to the most appropriate specialized agent."""
    
    # Direct tool-based routing
    TOOL_AGENT_MAP = {
        "web_search": "research",
        "api_call": "research",
        "code_exec": "code",
    }
    
    # Keywords for classification when tool is "llm_only" or "none"
    ROLE_KEYWORDS = {
        "research": ["search", "find", "look up", "research", "investigate", "discover", "gather"],
        "code": ["write code", "implement", "program", "function", "class", "test", "debug", "script"],
        "analysis": ["analyze", "compare", "evaluate", "assess", "review", "examine", "contrast", "pros and cons"],
        "writing": ["write", "summarize", "report", "document", "explain", "describe", "compile", "draft"],
    }
    
    async def route_step(self, step: StepDefinition) -> SpecializedAgent:
        """Determine which agent should handle this step.
        
        Routing priority:
        1. Tool-based: if step.tool_needed maps directly → use that agent
        2. Keyword-based: scan step.description for role keywords → highest match
        3. LLM classification: if ambiguous, ask LLM to classify
        4. Default: ANALYSIS_AGENT (generalist fallback)
        
        Returns: SpecializedAgent instance
        """
    
    def _keyword_classify(self, description: str) -> Optional[str]:
        """Score step description against role keywords. Return role with highest score."""
    
    async def _llm_classify(self, step: StepDefinition) -> str:
        """Use LLM to classify ambiguous steps. 
        Prompt: 'Classify this step into one of: research, code, analysis, writing.
                 Step: {description}
                 Respond with a single word.'
        Use cheapest model (gpt-4o-mini)."""

FILE 3: backend/agent/multi_agent/coordinator.py

class AgentCoordinator:
    """Orchestrates multi-agent task execution."""
    
    def __init__(self):
        self.router = AgentRouter()
        self.agent_history: Dict[str, List[dict]] = {}  # step_id → [{agent, action, result}]
        self.agent_stats: Dict[str, dict] = {}  # agent_name → {steps, total_tokens, total_quality}
    
    async def execute_step_with_agent(
        self, step: StepDefinition, state: AgentState
    ) -> Tuple[StepResult, SpecializedAgent]:
        """
        1. Route step to best agent
        2. Build prompt using agent's system_prompt + step context
        3. Call LLM with agent's preferred model (through fallback chain)
        4. Track agent assignment
        5. Return result with agent metadata
        """
    
    def build_agent_prompt(
        self, agent: SpecializedAgent, step: StepDefinition, context: str
    ) -> Tuple[str, str]:
        """Build system prompt and user prompt for the agent.
        Returns: (system_prompt, user_prompt)
        
        System prompt: agent.system_prompt + task context
        User prompt: step description + prior results + memory context
        """
    
    async def create_handoff_summary(
        self, from_agent: SpecializedAgent, to_agent: SpecializedAgent,
        prior_result: str
    ) -> str:
        """When one agent's output feeds into another agent's step,
        create a bridge summary that translates context between agent roles.
        
        Example: Research Agent found data → Analysis Agent needs structured input
        Generate a brief handoff note using the cheapest LLM."""
    
    def get_agent_contributions(self) -> Dict[str, dict]:
        """Return per-agent statistics:
        {agent_name: {steps_handled, avg_quality, total_tokens, roles_executed}}"""
    
    def get_assignment_log(self) -> List[dict]:
        """Return chronological agent assignment log for trace."""

FILE 4: backend/agent/multi_agent/__init__.py
Export: SpecializedAgent, AgentRouter, AgentCoordinator, AGENT_REGISTRY

Integration instructions (describe changes to existing files):

1. backend/agent/nodes/executor.py:
   - Add config check: if MULTI_AGENT_MODE:
     - Use coordinator.execute_step_with_agent() instead of direct call_with_fallback()
     - Add agent_name and agent_role to StepResult
     - Add agent_assigned trace event
   
2. backend/models/task.py:
   - Add to StepResult: agent_name: Optional[str], agent_role: Optional[str]
   
3. backend/agent/state.py:
   - Add to AgentState: agent_assignments: Dict[str, str], agent_contributions: Dict[str, dict]

4. backend/config.py:
   - Add: MULTI_AGENT_MODE: bool = True

Generate ALL files with COMPLETE implementations.
Each agent's system prompt must be detailed (at least 150 words) and specific to their role.
The router must handle ambiguous cases gracefully.
The coordinator must track per-agent metrics for the dashboard.
```

---

## Prompt 6: Full Frontend Integration with All New Features

```
You are doing the final integration of 4 new features into the AI agent React dashboard:
1. Execution Trace UI (flow graph + waterfall + step detail modal)
2. Metrics Dashboard (charts + provider health + agent stats)
3. Parallel Execution visualization
4. Multi-Agent indicators

Update: frontend/src/App.jsx (COMPLETE REWRITE)

The app now has a top-level navigation with these views:

1. "Execute" view (default):
   - Left panel: TaskInput + quick metrics summary + LiveLogs
   - Right panel: ExecutionFlowGraph (interactive DAG)
   - Bottom sheet (collapsible): StepCards in a horizontal scrollable row

2. "Trace" view:
   - Full-width TraceWaterfall chart
   - Below: TraceTimeline (vertical event list)
   - Click any event → StepDetailModal opens

3. "Metrics" view:
   - Full MetricsDashboard (stat cards, charts, provider health, agent contributions)

4. "Settings" view:
   - Toggle switches for:
     - Chaos Mode (on/off)
     - Parallel Execution (on/off)
     - Multi-Agent Mode (on/off)
   - Provider configuration (which models in fallback chain)
   - Max retries slider
   - Step timeout slider

Navigation: Horizontal tab bar at the top with icons:
  ▶️ Execute | 📊 Trace | 📈 Metrics | ⚙️ Settings

Global elements:
  - Header: "⚡ Reliable AI Agent" with gradient text
  - Status indicator: Idle / Planning / Executing (with level count if parallel) / Complete
  - Connection indicator: 🟢 Connected / 🔴 Disconnected (WebSocket status)
  - Toast notification system for key events

State management:
  - Use useTaskExecution hook (enhanced with parallel + agent data)
  - Wire WebSocket events to update all views simultaneously
  - Persist settings to localStorage

Responsive: works at 1920x1080 (projector) and 1440x900 (laptop)
Dark theme throughout. Premium, data-rich aesthetic.

Also create/update:
- frontend/src/services/api.js: add endpoints for /metrics, /config, /traces/summary
- frontend/src/hooks/useTaskExecution.js: add parallel levels, agent assignments, metrics

Generate the COMPLETE App.jsx and any new service/hook files.
This is the FINAL version of the frontend. It must be stunning.
```

---

# Appendix: Verification Checklist

After implementing all features, verify:

| # | Test | Expected |
|---|------|----------|
| 1 | Submit task → flow graph renders with steps | ✅ Nodes and edges appear |
| 2 | Step completes → node turns green, edge draws | ✅ Animated transition |
| 3 | Retry occurs → orange loop appears on node | ✅ Loop with "Retry 2/3" |
| 4 | Fallback occurs → provider badge changes | ✅ "→ Claude" label |
| 5 | Reflection → purple branch node appears | ✅ With strategy label |
| 6 | Click step → modal shows prompt + response | ✅ Full drill-down |
| 7 | Waterfall chart shows timing bars | ✅ Proportional widths |
| 8 | Metrics dashboard shows charts | ✅ All 4+ chart types |
| 9 | Provider health shows circuit state | ✅ Green/Red/Yellow |
| 10 | Parallel mode → steps execute concurrently | ✅ Overlapping timing |
| 11 | Parallel steps shown side-by-side in graph | ✅ Horizontal layout |
| 12 | Multi-agent → step cards show agent badge | ✅ 🔬💻📊✍️ |
| 13 | Agent contributions chart in metrics | ✅ Per-agent breakdown |
| 14 | Settings toggle chaos/parallel/multi-agent | ✅ Persisted, functional |
| 15 | Export trace as JSON works | ✅ Downloads valid JSON |

---

> **Key principle:** These 4 features don't just add functionality — they add **visual proof** that the system is sophisticated. The trace UI is what makes judges say "WOW." The metrics dashboard provides **data-backed credibility.** Parallel execution demonstrates **real system design.** Multi-agent shows **architectural maturity.**
