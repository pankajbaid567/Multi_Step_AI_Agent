# System Architecture: Reliable AI Agent for Multi-Step Task Execution Under Uncertainty

> **Version:** 1.0  
> **Last Updated:** 2026-04-17  
> **Audience:** Engineers implementing the system + hackathon judges reviewing technical depth

---

## 1. High-Level Architecture

### 1.1 System Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Tailwind)                         │
│                                                                                  │
│   ┌──────────┐  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│   │TaskInput │  │ ExecutionDAG    │  │TraceTimeline │  │   MetricsBar       │   │
│   │  Form    │  │ (Live Steps)    │  │(Event Log)   │  │(Tokens/Cost/Time)  │   │
│   └────┬─────┘  └───────▲─────────┘  └──────▲───────┘  └────────▲───────────┘   │
│        │                │                    │                   │               │
│        │ POST /tasks    │ WebSocket Events   │ GET /traces       │ Computed      │
└────────┼────────────────┼────────────────────┼───────────────────┼───────────────┘
         │                │                    │                   │
─────────┼────────────────┼────────────────────┼───────────────────┼────── HTTP/WS ──
         │                │                    │                   │
┌────────▼────────────────┴────────────────────┴───────────────────┴───────────────┐
│                         API GATEWAY (FastAPI)                                    │
│                                                                                  │
│   ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────────────────┐ │
│   │POST      │  │GET         │  │GET         │  │WebSocket /ws/{task_id}      │ │
│   │/tasks    │  │/tasks/{id} │  │/traces/{id}│  │(Real-time event streaming)  │ │
│   └────┬─────┘  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────────────┘ │
│        │              │               │                     │                    │
└────────┼──────────────┼───────────────┼─────────────────────┼────────────────────┘
         │              │               │                     │
         ▼              ▼               ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION ENGINE (LangGraph)                             │
│                                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   ┌──────────┐  │
│   │ PLANNER  │───▶│ EXECUTOR │───▶│VALIDATOR │─┬─▶│FINALIZER │   │REFLECTOR │  │
│   │  Node    │    │  Node    │    │  Node    │ │  │  Node    │   │  Node    │  │
│   └──────────┘    └─────▲────┘    └──────────┘ │  └──────────┘   └─────┬────┘  │
│                         │                      │                       │        │
│                         │    ┌─────────────────┤                       │        │
│                         │    │ Conditional Edge │                       │        │
│                         │    │                  │                       │        │
│                         │    │  pass ──────────▶ next_step / finalizer │        │
│                         │    │  retry ─────────▶ executor (backoff)    │        │
│                         │    │  reflect ───────▶ reflector ────────────┘        │
│                         │    └─────────────────┘                                │
│                         │                                                       │
│                    ┌────┴─────────────────────────────────────────────┐          │
│                    │           RELIABILITY LAYER                      │          │
│                    │  ┌─────────┐ ┌──────────┐ ┌────────────────┐   │          │
│                    │  │ Retry   │ │ Fallback │ │Circuit Breaker │   │          │
│                    │  │(Backoff)│ │ (Chain)  │ │ (Per-Provider) │   │          │
│                    │  └─────────┘ └──────────┘ └────────────────┘   │          │
│                    └─────────────────────────────────────────────────┘          │
└──────────┬───────────────┬──────────────────┬───────────────────────────────────┘
           │               │                  │
     ┌─────▼─────┐  ┌─────▼──────┐   ┌──────▼──────┐
     │   Redis   │  │   FAISS    │   │  LLM APIs   │
     │  (State)  │  │ (Memory)   │   │  (AI Core)  │
     ├───────────┤  ├────────────┤   ├─────────────┤
     │Checkpoint │  │Embeddings  │   │OpenAI GPT-4o│
     │Pub/Sub    │  │Similarity  │   │GPT-4o-mini  │
     │Step Status│  │Past Context│   │Claude 3.5   │
     └───────────┘  └────────────┘   └──────┬──────┘
                                            │
                                     ┌──────▼──────┐
                                     │  TOOL LAYER │
                                     ├─────────────┤
                                     │Tavily Search│
                                     │HTTP Caller  │
                                     │Code Sandbox │
                                     └─────────────┘
```

### 1.2 Component Interaction Summary

```
User Request
    │
    ▼
API Gateway ──► Planner ──► [Step 1, Step 2, ..., Step N]
                               │
                               ▼
                    ┌──► Executor ──► Validator ──┐
                    │         │            │      │
                    │     Tool Layer    LLM Judge  │
                    │                              │
                    │  ┌───── Conditional ─────────┤
                    │  │                           │
                    │  ├─ pass ──► Next Step / Finalizer
                    │  ├─ retry ─► Retry (backoff) ─┘
                    │  └─ reflect ► Reflector ──► Modified Step ─┘
                    │
                    └── State checkpointed to Redis after EVERY transition
```

---

## 2. Detailed Component Design

---

### 2.1 API Gateway (FastAPI)

**Role:** Single entry point for all client interactions. Handles HTTP requests, WebSocket connections, input validation, error formatting, and CORS.

```
┌─────────────────────────────────────────────────────┐
│                   API GATEWAY                        │
│                                                      │
│  Middleware Stack:                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. CORS (allow localhost:5173)                │  │
│  │ 2. Request Logger (method, path, latency)     │  │
│  │ 3. Error Handler (catch-all → structured JSON)│  │
│  │ 4. Rate Limiter (10 req/min per IP — basic)   │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  Endpoints:                                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ POST /tasks                                   │  │
│  │   Input:  { "task": "string (1-2000 chars)" } │  │
│  │   Output: { "task_id": "uuid", "steps": [...]}│  │
│  │   Flow:   Validate → Create State → Planner   │  │
│  │           → Save Checkpoint → Return Steps    │  │
│  ├───────────────────────────────────────────────┤  │
│  │ POST /tasks/{task_id}/execute                 │  │
│  │   Input:  None (uses existing planned state)  │  │
│  │   Output: { "status": "started" }             │  │
│  │   Flow:   Load State → Launch Graph (async)   │  │
│  │           → Return immediately                │  │
│  ├───────────────────────────────────────────────┤  │
│  │ POST /tasks/{task_id}/resume                  │  │
│  │   Input:  None                                │  │
│  │   Output: { "status": "resumed", "from": N }  │  │
│  │   Flow:   Load Checkpoint → Resume from step N│  │
│  ├───────────────────────────────────────────────┤  │
│  │ GET /tasks/{task_id}                          │  │
│  │   Output: Full AgentState (current snapshot)  │  │
│  ├───────────────────────────────────────────────┤  │
│  │ GET /traces/{task_id}                         │  │
│  │   Output: [ TraceEntry, TraceEntry, ... ]     │  │
│  ├───────────────────────────────────────────────┤  │
│  │ WebSocket /ws/{task_id}                       │  │
│  │   Protocol: JSON messages                     │  │
│  │   Events:  step_started, step_completed,      │  │
│  │            step_failed, retry_triggered,      │  │
│  │            fallback_triggered,                │  │
│  │            reflection_started,                │  │
│  │            reflection_completed,              │  │
│  │            task_completed, task_failed         │  │
│  │   Backed by: Redis Pub/Sub subscription       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- Execution is **async** — `POST /execute` returns immediately, results stream via WebSocket
- All responses follow a unified envelope: `{"success": bool, "data": ..., "error": ...}`
- WebSocket backed by Redis Pub/Sub — decouples event production (agent) from consumption (frontend)

**Internal Interface:**
```python
# routes/tasks.py
@router.post("/tasks")
async def create_task(request: TaskRequest) -> TaskResponse:
    task_id = str(uuid4())
    state = create_initial_state(task_id, request.task)
    state = await run_planner(state)            # Synchronous — returns planned steps
    await redis.save_checkpoint(task_id, state)
    return TaskResponse(task_id=task_id, steps=state["steps"], status="planned")

@router.post("/tasks/{task_id}/execute")
async def execute_task(task_id: str) -> dict:
    state = await redis.load_checkpoint(task_id)
    if not state:
        raise HTTPException(404, "Task not found")
    asyncio.create_task(run_execution(task_id, state))  # Fire-and-forget
    return {"status": "started", "task_id": task_id}
```

---

### 2.2 Planner (LLM-Powered Task Decomposition)

**Role:** Takes a natural language task and decomposes it into an ordered list of executable steps.

```
┌──────────────────────────────────────────────────────────┐
│                      PLANNER NODE                        │
│                                                          │
│  Input:  AgentState.original_input (str)                 │
│  Output: AgentState.steps (List[StepDefinition])         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              PROMPT CONSTRUCTION                   │  │
│  │                                                    │  │
│  │  System: You are a task planning expert.           │  │
│  │  Decompose the user's task into 2-10 discrete,     │  │
│  │  executable steps. Each step should be             │  │
│  │  independently completable.                        │  │
│  │                                                    │  │
│  │  Output JSON array:                                │  │
│  │  [{                                                │  │
│  │    "step_id": "step_1",                            │  │
│  │    "name": "Research quantum computing papers",    │  │
│  │    "description": "Search for and summarize...",   │  │
│  │    "tool_needed": "web_search",                    │  │
│  │    "dependencies": [],                             │  │
│  │    "estimated_complexity": "medium"                │  │
│  │  }, ...]                                           │  │
│  │                                                    │  │
│  │  Few-shot examples: 2 examples included            │  │
│  │  JSON mode: ENABLED                                │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │              OUTPUT PARSING                        │  │
│  │                                                    │  │
│  │  1. Parse JSON response                            │  │
│  │  2. Validate each step has required fields         │  │
│  │  3. Verify dependency ordering (topological sort)  │  │
│  │  4. Cap at 10 steps (truncate if LLM overplans)   │  │
│  │  5. Assign sequential IDs if missing               │  │
│  │                                                    │  │
│  │  On parse failure:                                 │  │
│  │    → Retry with stricter prompt (max 2 retries)    │  │
│  │    → If still fails: generate 3 generic steps      │  │
│  │      (research → analyze → summarize)              │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│  Trace: log(event="planning_complete", steps=N,          │
│              tokens=T, model=M, latency=L)               │
│  Checkpoint: save state to Redis                         │
└──────────────────────────────────────────────────────────┘
```

**StepDefinition Schema:**
```python
class StepDefinition(BaseModel):
    step_id: str                                          # "step_1", "step_2", ...
    name: str                                             # Human-readable name
    description: str                                      # Detailed instruction
    tool_needed: Literal["web_search", "api_call",        # Which tool to use
                         "code_exec", "llm_only", "none"]
    dependencies: List[str]                               # step_ids this depends on
    estimated_complexity: Literal["low", "medium", "high"]
```

**Edge Cases Handled:**
| Scenario | Handler |
|----------|---------|
| LLM returns non-JSON | Retry with `response_format={"type": "json_object"}` |
| Too many steps (>10) | Truncate to first 10, log warning |
| Too few steps (0) | Generate fallback: "research → analyze → summarize" |
| Circular dependencies | Detect via topological sort, flatten to sequential |
| Ambiguous input | Plan conservatively with generic steps |

---

### 2.3 Executor (Step Execution Engine)

**Role:** Executes a single step using LLM reasoning + optional tool calls. Core workhorse of the system.

```
┌────────────────────────────────────────────────────────────────┐
│                        EXECUTOR NODE                           │
│                                                                │
│  Input:  AgentState (full — reads current step + context)      │
│  Output: AgentState (updated with StepResult + trace)          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 CONTEXT ASSEMBLY                         │  │
│  │                                                          │  │
│  │  1. Current step: state.steps[state.current_step_index]  │  │
│  │  2. Prior results: state.step_results[-3:]  (last 3)     │  │
│  │  3. Vector memory: FAISS.search(step.description, k=3)   │  │
│  │  4. Reflection notes: if step was modified by reflector   │  │
│  │  5. Accumulated context: state.context_memory             │  │
│  │                                                          │  │
│  │  Assembled into prompt:                                   │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │ System: You are executing step {N} of a task.    │    │  │
│  │  │ Overall task: {original_input}                    │    │  │
│  │  │ This step: {step.description}                     │    │  │
│  │  │ Previous results: {context_summary}               │    │  │
│  │  │ Memory context: {relevant_memories}               │    │  │
│  │  │ {reflection_note if applicable}                   │    │  │
│  │  │                                                    │    │  │
│  │  │ Produce a thorough, accurate result for this step.│    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               TOOL DISPATCH                              │  │
│  │                                                          │  │
│  │  Based on step.tool_needed:                              │  │
│  │                                                          │  │
│  │  "web_search" ──► Tavily API                             │  │
│  │       │           Query: extracted from step description  │  │
│  │       │           Returns: top 5 results                  │  │
│  │       └──► Inject search results into LLM prompt          │  │
│  │                                                          │  │
│  │  "api_call"  ──► HTTP Client                             │  │
│  │       │           URL/method from step description        │  │
│  │       └──► Inject API response into LLM prompt            │  │
│  │                                                          │  │
│  │  "code_exec" ──► Python Subprocess                       │  │
│  │       │           Code: LLM generates, sandbox runs       │  │
│  │       └──► Inject stdout/stderr into LLM prompt           │  │
│  │                                                          │  │
│  │  "llm_only"  ──► Direct LLM call (no tool)               │  │
│  │                                                          │  │
│  │  "none"      ──► Pass-through (noop step)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               LLM CALL (via Reliability Layer)           │  │
│  │                                                          │  │
│  │  call_with_fallback(prompt)                              │  │
│  │    ├── Try: GPT-4o (primary)                             │  │
│  │    ├── Try: GPT-4o-mini (fallback 1)                     │  │
│  │    └── Try: Claude 3.5 Sonnet (fallback 2)               │  │
│  │                                                          │  │
│  │  Wrapped with: retry_with_backoff(max=3)                 │  │
│  │  Guarded by: circuit_breaker(per_provider)               │  │
│  │  Timeout: 60 seconds                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                     │
│                          ▼                                     │
│  Build StepResult:                                             │
│  {                                                             │
│    step_id, status, output, tokens_used,                       │
│    latency_ms, model_used, tool_used, retry_count, error       │
│  }                                                             │
│                                                                │
│  Update state:                                                 │
│    state.step_results.append(result)                           │
│    state.context_memory.append(key_takeaway)                   │
│    state.execution_trace.append(trace_entry)                   │
│    state.llm_tokens_used += result.tokens_used                 │
│                                                                │
│  Publish event: Redis Pub/Sub → "step_completed"               │
│  Checkpoint: save state to Redis                               │
└────────────────────────────────────────────────────────────────┘
```

**StepResult Schema:**
```python
class StepResult(BaseModel):
    step_id: str
    status: Literal["success", "failed", "skipped"]
    output: str                        # The actual result text
    tokens_used: int
    latency_ms: int
    model_used: str                    # "gpt-4o", "claude-3-5-sonnet", etc.
    tool_used: Optional[str]           # "tavily", "http", "code_sandbox", None
    tool_result: Optional[dict]        # Raw tool output
    retry_count: int
    validation: Optional[str]          # Set by validator: "pass", "retry", "reflect"
    error: Optional[str]
```

---

### 2.4 Tool Layer

**Role:** Provides executable capabilities beyond pure LLM reasoning. Each tool has a uniform interface.

```
┌─────────────────────────────────────────────────────────┐
│                      TOOL LAYER                          │
│                                                          │
│  Uniform Interface:                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  class ToolResult(BaseModel):                      │  │
│  │      success: bool                                 │  │
│  │      data: Any             # Tool-specific output  │  │
│  │      error_message: str    # Empty if success      │  │
│  │      latency_ms: int                               │  │
│  │      tool_name: str                                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │   WEB SEARCH        │  │   API CALLER            │   │
│  │   (Tavily)          │  │   (Generic HTTP)        │   │
│  ├─────────────────────┤  ├─────────────────────────┤   │
│  │ Input:              │  │ Input:                  │   │
│  │   query: str        │  │   url: str              │   │
│  │   max_results: 5    │  │   method: GET/POST/PUT  │   │
│  │                     │  │   headers: dict         │   │
│  │ Output:             │  │   body: dict            │   │
│  │   results: [{       │  │   timeout: 30s          │   │
│  │     title,          │  │                         │   │
│  │     url,            │  │ Output:                 │   │
│  │     content,        │  │   status_code: int      │   │
│  │     score           │  │   body: str/dict        │   │
│  │   }]                │  │   headers: dict         │   │
│  │                     │  │                         │   │
│  │ Fallback:           │  │ Fallback:               │   │
│  │   API down → skip,  │  │   Timeout → retry once  │   │
│  │   return empty      │  │   Error → return error  │   │
│  └─────────────────────┘  └─────────────────────────┘   │
│                                                          │
│  ┌─────────────────────┐                                 │
│  │   CODE EXECUTOR     │                                 │
│  │   (Python Sandbox)  │                                 │
│  ├─────────────────────┤                                 │
│  │ Input:              │                                 │
│  │   code: str         │                                 │
│  │   timeout: 10s      │                                 │
│  │                     │                                 │
│  │ Execution:          │                                 │
│  │   subprocess.run()  │                                 │
│  │   No network access │                                 │
│  │   No filesystem     │                                 │
│  │     (except /tmp)   │                                 │
│  │   Memory limit: 256MB│                                │
│  │                     │                                 │
│  │ Output:             │                                 │
│  │   stdout: str       │                                 │
│  │   stderr: str       │                                 │
│  │   exit_code: int    │                                 │
│  │                     │                                 │
│  │ Fallback:           │                                 │
│  │   Timeout → kill    │                                 │
│  │   Error → capture   │                                 │
│  └─────────────────────┘                                 │
│                                                          │
│  Tool Dispatch Logic:                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  async def dispatch_tool(step: StepDefinition,     │  │
│  │                          context: str) -> ToolResult│  │
│  │      match step.tool_needed:                       │  │
│  │          case "web_search":                        │  │
│  │              query = extract_search_query(          │  │
│  │                  step.description, context)        │  │
│  │              return await tavily_search(query)     │  │
│  │          case "api_call":                          │  │
│  │              params = parse_api_params(             │  │
│  │                  step.description)                 │  │
│  │              return await http_call(**params)      │  │
│  │          case "code_exec":                         │  │
│  │              code = await llm_generate_code(        │  │
│  │                  step.description, context)        │  │
│  │              return await sandbox_exec(code)       │  │
│  │          case _:                                   │  │
│  │              return ToolResult(success=True,       │  │
│  │                  data=None, tool_name="none")      │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### 2.5 Validator (Output Quality Gate)

**Role:** LLM-based judge that evaluates whether a step's output is acceptable.

```
┌───────────────────────────────────────────────────────────┐
│                     VALIDATOR NODE                         │
│                                                           │
│  Input:  Step description + Executor output               │
│  Output: Verdict (pass / retry / reflect) + reason        │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                VALIDATION PROMPT                     │  │
│  │                                                     │  │
│  │  System: You are a quality assurance judge.          │  │
│  │                                                     │  │
│  │  Task Step: {step.description}                      │  │
│  │  Output Produced: {executor_output}                  │  │
│  │                                                     │  │
│  │  Evaluate this output on 4 criteria:                 │  │
│  │  1. RELEVANCE: Does it address the step?             │  │
│  │  2. COMPLETENESS: Is it thorough, not partial?       │  │
│  │  3. CONSISTENCY: Does it align with prior context?   │  │
│  │  4. PLAUSIBILITY: Is it factually reasonable?        │  │
│  │                                                     │  │
│  │  Respond with JSON:                                  │  │
│  │  {                                                   │  │
│  │    "verdict": "pass" | "retry" | "reflect",          │  │
│  │    "reason": "explanation",                          │  │
│  │    "scores": {                                       │  │
│  │      "relevance": 0-10,                              │  │
│  │      "completeness": 0-10,                           │  │
│  │      "consistency": 0-10,                            │  │
│  │      "plausibility": 0-10                            │  │
│  │    }                                                 │  │
│  │  }                                                   │  │
│  │                                                     │  │
│  │  Rules:                                              │  │
│  │  - pass: all scores >= 6                             │  │
│  │  - retry: any score 3-5 (fixable with another try)  │  │
│  │  - reflect: any score < 3 (fundamentally wrong)     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Model: GPT-4o-mini (cheaper — validation is frequent)    │
│                                                           │
│  Fallback: If validator LLM itself fails:                 │
│    → Rule-based checks:                                   │
│      1. Output length > 50 chars? (not empty)             │
│      2. No hallucination markers? ("As an AI...")          │
│      3. Contains keywords from step description?          │
│    → All pass → verdict: "pass"                           │
│    → Any fail → verdict: "retry"                          │
│                                                           │
│  Output: Updates StepResult.validation field              │
│  Trace: log validation verdict + scores                   │
└───────────────────────────────────────────────────────────┘
```

**Conditional Routing Post-Validation:**
```
                    Validator Output
                         │
              ┌──────────┼──────────┐
              │          │          │
           "pass"     "retry"   "reflect"
              │          │          │
              ▼          ▼          ▼
        ┌─────────┐ ┌────────┐ ┌──────────┐
        │ Is last  │ │Retries │ │ Reflector│
        │ step?    │ │< 3?   │ │ Node     │
        └────┬─────┘ └───┬───┘ └──────────┘
          Y  │  N     Y   │  N
          │  │        │   │
          ▼  ▼        ▼   ▼
     Finalizer  Next  Executor  Reflector
                Step  (retry)   (escalate)
```

---

### 2.6 State Manager (Redis)

**Role:** Durable state persistence, real-time event pub/sub, and step-level status tracking.

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGER (Redis)                      │
│                                                              │
│  Data Structures:                                            │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  KEY: task:{task_id}:state                            │   │
│  │  TYPE: String (JSON blob)                             │   │
│  │  VALUE: Serialized AgentState                         │   │
│  │  TTL: 86400 seconds (24 hours)                        │   │
│  │                                                       │   │
│  │  Operations:                                          │   │
│  │    save_checkpoint(task_id, state)  → SET + TTL       │   │
│  │    load_checkpoint(task_id)         → GET + deserialize│   │
│  │    delete_checkpoint(task_id)       → DEL             │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  KEY: task:{task_id}:step:{index}:status              │   │
│  │  TYPE: String                                         │   │
│  │  VALUE: "pending" | "running" | "success" | "failed"  │   │
│  │         | "retrying" | "reflecting" | "skipped"       │   │
│  │  TTL: 86400 seconds                                   │   │
│  │                                                       │   │
│  │  Purpose: Lightweight status reads without             │   │
│  │           deserializing full state                     │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  CHANNEL: task:{task_id}:events                       │   │
│  │  TYPE: Pub/Sub                                        │   │
│  │  MESSAGES: JSON events                                │   │
│  │                                                       │   │
│  │  Event schema:                                        │   │
│  │  {                                                    │   │
│  │    "event_type": "step_completed",                    │   │
│  │    "timestamp": "2026-04-17T21:30:00Z",               │   │
│  │    "step_id": "step_2",                               │   │
│  │    "step_name": "Analyze results",                    │   │
│  │    "data": { ... event-specific payload ... }         │   │
│  │  }                                                    │   │
│  │                                                       │   │
│  │  Publisher: Agent nodes (after each state transition)  │   │
│  │  Subscriber: WebSocket handler (forwards to client)   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  KEY: circuit:{provider}                              │   │
│  │  TYPE: Hash                                           │   │
│  │  FIELDS:                                              │   │
│  │    state: "closed" | "open" | "half_open"             │   │
│  │    failure_count: int                                  │   │
│  │    success_count: int                                  │   │
│  │    last_failure_time: timestamp                        │   │
│  │    opened_at: timestamp                                │   │
│  │  TTL: 300 seconds (auto-cleanup)                      │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  In-Memory Fallback (when Redis is unavailable):             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  _memory_store: Dict[str, AgentState] = {}            │   │
│  │  _event_queues: Dict[str, asyncio.Queue] = {}         │   │
│  │                                                       │   │
│  │  Same interface as Redis service                      │   │
│  │  Limitations: no persistence, no multi-instance       │   │
│  │  Warning logged on activation                         │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Checkpoint Strategy:**
```
Checkpoint saved at:
  ✓ After planner completes (steps defined)
  ✓ After each step execution (result recorded)
  ✓ After each retry attempt (retry count updated)
  ✓ After each reflection (modified state recorded)
  ✓ After finalizer completes (terminal state)

This means: worst case on crash, we lose only the
in-progress step. All completed steps are safe.
```

---

### 2.7 Memory Service (FAISS Vector DB)

**Role:** Short-term episodic memory within a task execution. Stores step results as embeddings for contextual retrieval.

```
┌──────────────────────────────────────────────────────────┐
│                  MEMORY SERVICE (FAISS)                    │
│                                                           │
│  Embedding Model: all-MiniLM-L6-v2 (384 dimensions)      │
│  Index Type: IndexFlatL2 (brute-force, fast for <10K)     │
│  Scope: Per-task (new index per task execution)            │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   STORE                              │  │
│  │                                                     │  │
│  │  When: After each successful step execution         │  │
│  │  What: step_description + step_output + metadata    │  │
│  │                                                     │  │
│  │  def store(text: str, metadata: dict):              │  │
│  │      embedding = embedder.encode(text)              │  │
│  │      index.add(np.array([embedding]))               │  │
│  │      documents.append({                             │  │
│  │          "text": text,                              │  │
│  │          "metadata": metadata,                      │  │
│  │          "timestamp": now()                         │  │
│  │      })                                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   QUERY                              │  │
│  │                                                     │  │
│  │  When: Before each step execution                   │  │
│  │  What: Current step description → similar context   │  │
│  │                                                     │  │
│  │  def search(query: str, top_k: int = 3):            │  │
│  │      query_embed = embedder.encode(query)           │  │
│  │      distances, indices = index.search(             │  │
│  │          np.array([query_embed]), top_k)            │  │
│  │      return [documents[i] for i in indices[0]       │  │
│  │              if distances[0][j] < threshold]        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Use Cases:                                               │
│  1. Step 4 needs context from Step 1 (not in last 3)      │
│     → Vector search finds Step 1's result by similarity   │
│  2. Reflector querying "have we seen this error before?"   │
│     → Returns similar past failures + resolutions         │
│  3. Executor enriching prompt with relevant prior work     │
│     → Better coherence across steps                       │
│                                                           │
│  Degradation: If FAISS unavailable → skip memory          │
│  enrichment, proceed with rolling context only.            │
│  This is a P2 feature.                                    │
└──────────────────────────────────────────────────────────┘
```

---

### 2.8 Failure Handler (Reliability Layer)

**Role:** Wraps all external calls with retry, fallback, and circuit breaker logic. No node calls an LLM or tool directly — everything goes through this layer.

```
┌──────────────────────────────────────────────────────────────────┐
│                     RELIABILITY LAYER                             │
│                                                                   │
│  Every external call passes through this stack (bottom to top):   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  LAYER 3: CIRCUIT BREAKER (outermost)                       │ │
│  │                                                             │ │
│  │  Before calling provider, check circuit state:              │ │
│  │                                                             │ │
│  │  CLOSED ─── failure_rate < 50% ─── normal operation         │ │
│  │    │                                                        │ │
│  │    │ failure_rate >= 50% (min 3 calls in 60s window)        │ │
│  │    ▼                                                        │ │
│  │  OPEN ──── skip provider ──── try next in fallback chain    │ │
│  │    │                                                        │ │
│  │    │ 120 seconds elapsed                                    │ │
│  │    ▼                                                        │ │
│  │  HALF_OPEN ── send 1 probe request                          │ │
│  │    │                                                        │ │
│  │    ├── success → CLOSED (resume normal)                     │ │
│  │    └── failure → OPEN (wait another 120s)                   │ │
│  │                                                             │ │
│  │  Storage: Redis hash per provider (circuit:{provider_name}) │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  LAYER 2: FALLBACK CHAIN (middle)                           │ │
│  │                                                             │ │
│  │  Ordered provider list:                                     │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  1. OpenAI GPT-4o          (primary — best quality)    │ │ │
│  │  │  2. OpenAI GPT-4o-mini     (cheaper — good enough)     │ │ │
│  │  │  3. Anthropic Claude 3.5   (different provider)        │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  Logic:                                                     │ │
│  │    for provider in chain:                                   │ │
│  │        if circuit_breaker.is_open(provider): continue       │ │
│  │        try:                                                 │ │
│  │            result = await retry_with_backoff(               │ │
│  │                lambda: call_provider(provider, prompt))     │ │
│  │            circuit_breaker.record_success(provider)         │ │
│  │            return result                                    │ │
│  │        except Exception:                                    │ │
│  │            circuit_breaker.record_failure(provider)          │ │
│  │            log_fallback(provider, next_provider)             │ │
│  │    raise AllProvidersFailedError()                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                          │                                        │
│                          ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  LAYER 1: RETRY WITH BACKOFF (innermost)                    │ │
│  │                                                             │ │
│  │  Parameters:                                                │ │
│  │    max_retries: 3                                           │ │
│  │    base_delay: 1.0 seconds                                  │ │
│  │    max_delay: 30.0 seconds                                  │ │
│  │    jitter: random(0, 1.0)                                   │ │
│  │                                                             │ │
│  │  Retry on:                                                  │ │
│  │    ✓ HTTP 429 (Rate Limited)                                │ │
│  │    ✓ HTTP 500-599 (Server Error)                            │ │
│  │    ✓ ConnectionError                                        │ │
│  │    ✓ TimeoutError                                           │ │
│  │    ✗ HTTP 400-499 (Client Error — not retryable)            │ │
│  │    ✗ AuthenticationError (bad API key — not retryable)      │ │
│  │                                                             │ │
│  │  Backoff formula:                                           │ │
│  │    delay = min(base * 2^attempt + random(0, 1), max_delay)  │ │
│  │                                                             │ │
│  │  Timeline:                                                  │ │
│  │    Attempt 1: immediate                                     │ │
│  │    Attempt 2: ~1.0-2.0s wait                                │ │
│  │    Attempt 3: ~2.0-4.0s wait                                │ │
│  │    Attempt 4: ~4.0-8.0s wait (if max_retries > 3)          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Chaos Mode (Error Injection):                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  When CHAOS_MODE=true:                                      │ │
│  │    Before each external call, roll dice:                    │ │
│  │    ├── 30% → inject 5s artificial latency                   │ │
│  │    ├── 20% → return empty response                          │ │
│  │    ├── 15% → raise RateLimitError (HTTP 429)                │ │
│  │    ├── 10% → corrupt output (truncate to 50%)               │ │
│  │    └── 25% → let call proceed normally                      │ │
│  │                                                             │ │
│  │  Injected failures are tagged in trace for transparency     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2.9 Reflection Engine

**Role:** Intelligent failure analysis and recovery strategy selection. The "senior engineer" that debugs why a step failed and decides what to do.

```
┌──────────────────────────────────────────────────────────────────┐
│                      REFLECTOR NODE                               │
│                                                                   │
│  Triggered when:                                                  │
│    1. Step exhausts all 3 retry attempts                          │
│    2. Validator returns "reflect" verdict                         │
│                                                                   │
│  Input Context:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  • original_task: The user's full task description          │ │
│  │  • failed_step: The step that failed                        │ │
│  │  • failed_output: What the executor produced (if any)       │ │
│  │  • error_log: List of errors from all attempts              │ │
│  │  • prior_context: Results from completed steps              │ │
│  │  • reflection_count: How many times we've reflected (0,1,2) │ │
│  │  • memory_context: Similar past failures from FAISS         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Decision Process:                                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  LLM Prompt:                                                │ │
│  │  "You are a debugging expert. A step in a multi-step        │ │
│  │   task has failed. Analyze the failure and recommend         │ │
│  │   ONE recovery strategy."                                   │ │
│  │                                                             │ │
│  │  + All input context above                                  │ │
│  │                                                             │ │
│  │  Available strategies:                                      │ │
│  │                                                             │ │
│  │  1. MODIFY_STEP                                             │ │
│  │     └─ When: Step description was ambiguous or led to       │ │
│  │             wrong approach. Can be fixed with clearer       │ │
│  │             instructions.                                   │ │
│  │     └─ Action: Provide rewritten step description           │ │
│  │     └─ Effect: Reset retry counter, re-execute              │ │
│  │                                                             │ │
│  │  2. SKIP_STEP                                               │ │
│  │     └─ When: Step is non-critical OR sufficient partial     │ │
│  │             data exists from failed attempts.               │ │
│  │     └─ Action: Provide best-effort partial result           │ │
│  │     └─ Effect: Mark skipped, reduce confidence, move on     │ │
│  │                                                             │ │
│  │  3. DECOMPOSE                                               │ │
│  │     └─ When: Step is too complex for a single execution.    │ │
│  │             Breaking it down might succeed.                 │ │
│  │     └─ Action: Provide 2-3 smaller sub-steps               │ │
│  │     └─ Effect: Insert sub-steps, execute them               │ │
│  │                                                             │ │
│  │  4. ABORT                                                   │ │
│  │     └─ When: Task fundamentally cannot be completed.        │ │
│  │             No workaround exists.                           │ │
│  │     └─ Action: Provide explanation of why                   │ │
│  │     └─ Effect: Halt execution, return partial results       │ │
│  │                                                             │ │
│  │  Output JSON:                                               │ │
│  │  {                                                          │ │
│  │    "action": "MODIFY_STEP",                                 │ │
│  │    "reasoning": "The step asked to scrape a website...",    │ │
│  │    "modified_step": "Use search API instead of...",         │ │
│  │    "sub_steps": [],                                         │ │
│  │    "partial_result": ""                                     │ │
│  │  }                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Safety Guards:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  • Max 2 reflections per step                               │ │
│  │    - After 2 → force SKIP_STEP or ABORT                    │ │
│  │  • Max 5 total reflections per task                         │ │
│  │    - After 5 → ABORT entire task                            │ │
│  │  • DECOMPOSE limited to 3 sub-steps                         │ │
│  │  • DECOMPOSE depth limited to 1 (no recursive decompose)   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  State Mutation After Reflection:                                 │
│                                                                   │
│  MODIFY_STEP:                                                     │
│    state.steps[current].description = modified_step               │
│    state.retry_counts[step_id] = 0  (reset)                      │
│    → route back to EXECUTOR                                       │
│                                                                   │
│  SKIP_STEP:                                                       │
│    state.step_results.append(StepResult(                          │
│        status="skipped", output=partial_result))                  │
│    state.current_step_index += 1                                  │
│    → route to EXECUTOR (next step) or FINALIZER                   │
│                                                                   │
│  DECOMPOSE:                                                       │
│    state.steps = (                                                │
│        state.steps[:current] +                                    │
│        sub_steps +                                                │
│        state.steps[current+1:]                                    │
│    )                                                              │
│    → route to EXECUTOR (first sub-step)                           │
│                                                                   │
│  ABORT:                                                           │
│    state.status = "failed"                                        │
│    → route to FINALIZER (produce partial output)                  │
└──────────────────────────────────────────────────────────────────┘
```

**Reflection Decision Tree:**
```
Step Failed (3 retries exhausted)
    │
    ├── reflection_count < 2?
    │   │
    │   ├── YES → Invoke Reflector LLM
    │   │         │
    │   │         ├── MODIFY_STEP → Update description → Retry
    │   │         ├── SKIP_STEP → Mark skipped → Next step
    │   │         ├── DECOMPOSE → Insert sub-steps → Execute
    │   │         └── ABORT → Stop → Partial results
    │   │
    │   └── NO → Force SKIP (if non-critical) or ABORT (if critical)
    │
    └── Is this the last step?
        │
        ├── YES + has some results → FINALIZER with partial output
        └── YES + no results → ABORT with error message
```

---

## 3. Data Flow: Complete Execution Lifecycle

### 3.1 Step-by-Step Sequence

```
TIME ──────────────────────────────────────────────────────────────────────────►

T0: User submits task
│
│   Frontend                         API Gateway                    
│   ─────────── POST /tasks ────────► Validate input               
│                                     Create task_id (UUID)         
│                                     Create initial AgentState     
│                                            │                      
│                                            ▼                      
│                                     ┌─────────────┐              
│                                     │   PLANNER   │              
│                                     │             │              
│                                     │ LLM Call:   │              
│                                     │ Decompose   │              
│                                     │ into steps  │              
│                                     └──────┬──────┘              
│                                            │                      
│                                     Save checkpoint (Redis)       
│                                     Publish: "planning_complete"  
│   ◄─── 200 OK {task_id, steps} ────┘                              
│                                                                   
T1: Frontend receives steps, renders StepCards                     
│   Initiates WebSocket connection to /ws/{task_id}                
│   Sends POST /tasks/{task_id}/execute                            
│                                                                   
│                                     Load checkpoint              
│                                     Start async execution         
│   ◄─── 200 OK {status: started} ──┘                              
│                                                                   
T2: Step 1 Execution                                               
│                                     ┌─────────────┐              
│                                     │  EXECUTOR   │              
│                                     │             │              
│   ◄── WS: step_started ──────────── │ Assemble    │              
│                                     │ context     │              
│                                     │             │              
│                                     │ Tool call?  │──► Tavily/HTTP/Code
│                                     │             │◄── Tool result
│                                     │             │              
│                                     │ LLM call    │──► GPT-4o (via reliability layer)
│                                     │             │◄── Response
│                                     │             │              
│                                     │ Build       │              
│                                     │ StepResult  │              
│                                     └──────┬──────┘              
│                                            │                      
│                                     ┌──────▼──────┐              
│                                     │  VALIDATOR  │              
│                                     │             │              
│                                     │ LLM judge   │──► GPT-4o-mini
│                                     │ verdict     │◄── {pass/retry/reflect}
│                                     └──────┬──────┘              
│                                            │                      
│                                     verdict == "pass"            
│                                            │                      
│                                     Save checkpoint              
│                                     Update step status            
│   ◄── WS: step_completed ──────────┘                              
│                                     Store in FAISS memory         
│                                                                   
T3: Step 2 Execution (same flow, with Step 1 context injected)     
│   ...                                                            
│                                                                   
TN: Final Step → Validator → pass                                  
│                                     ┌─────────────┐              
│                                     │  FINALIZER  │              
│                                     │             │              
│                                     │ Aggregate   │              
│                                     │ results     │              
│                                     │             │              
│                                     │ Compute     │              
│                                     │ confidence  │              
│                                     │             │              
│                                     │ Generate    │              
│                                     │ summary     │              
│                                     └──────┬──────┘              
│                                            │                      
│                                     Save final checkpoint         
│   ◄── WS: task_completed ─────────┘                              
│                                                                   
│   Frontend renders final output + metrics                        
```

### 3.2 Data at Each Stage

```
┌──────────────────────────────────────────────────────────────────────┐
│ Stage        │ State Changes                │ Data Added             │
├──────────────┼─────────────────────────────┼────────────────────────┤
│ Init         │ status: "planning"           │ task_id, original_input│
│ Planner      │ status: "executing"          │ steps[0..N]            │
│ Executor(i)  │ current_step_index: i        │ step_results[i]        │
│              │                              │ execution_trace += 1   │
│              │                              │ context_memory += text │
│              │                              │ llm_tokens_used += N   │
│ Validator(i) │ step_results[i].validation   │ validation scores      │
│ Retry(i)     │ retry_counts[step_id] += 1   │ error_log += 1         │
│ Reflector    │ steps may be modified/added  │ reflection entry       │
│ Finalizer    │ status: "completed"|"failed" │ final_output,          │
│              │ completed_at: timestamp      │ confidence_score       │
└──────────────┴─────────────────────────────┴────────────────────────┘
```

---

## 4. Failure Handling Flows

### 4.1 API Failure (LLM Provider Down)

```
Executor calls LLM
        │
        ▼
  ┌── Retry Layer ──┐
  │                  │
  │ Attempt 1: GPT-4o ──── ConnectionError
  │   wait 1.3s
  │ Attempt 2: GPT-4o ──── ConnectionError
  │   wait 2.7s
  │ Attempt 3: GPT-4o ──── ConnectionError
  │                  │
  │ Max retries hit  │
  └──────┬───────────┘
         │
         ▼
  ┌── Fallback Layer ──┐
  │                     │
  │ Circuit breaker:    │
  │ GPT-4o → OPEN       │
  │                     │
  │ Try GPT-4o-mini ─── ConnectionError (same provider, same outage)
  │ Circuit: GPT-4o-mini → OPEN
  │                     │
  │ Try Claude 3.5 ──── ✅ SUCCESS
  │ Circuit: Claude → CLOSED
  │                     │
  └──────┬──────────────┘
         │
         ▼
  StepResult:
    model_used: "claude-3-5-sonnet"
    retry_count: 3
    
  Trace entries:
    [retry_triggered, retry_triggered, retry_triggered,
     fallback_triggered(openai→anthropic),
     step_completed]
```

### 4.2 Invalid Output (Quality Failure)

```
Executor produces output
        │
        ▼
  Validator evaluates
        │
        ├── Scores: relevance=8, completeness=4, consistency=7, plausibility=6
        │
        ▼
  Verdict: "retry" (completeness < 6)
  Reason: "Output only covers 2 of 5 requested items"
        │
        ▼
  Executor retry #1:
    Enhanced prompt: original + "Previous attempt was incomplete.
    Specifically: {validator_reason}. Please be more thorough."
        │
        ▼
  Validator evaluates again
        │
        ├── Scores: relevance=8, completeness=8, consistency=7, plausibility=7
        │
        ▼
  Verdict: "pass"
  → Continue to next step

  ═══════════════════════════════════════════════

  ALTERNATE PATH: 3 retries all fail validation

  Validator: "reflect" (relevance=2)
  Reason: "Output is about wrong topic entirely"
        │
        ▼
  Reflector analyzes:
    "The step asked for quantum computing research
     but the LLM produced content about classical computing.
     The step description is ambiguous."
        │
        ▼
  Action: MODIFY_STEP
  Modified: "Search specifically for QUANTUM computing
             papers published in 2025-2026, focusing on
             error correction and qubit stability"
        │
        ▼
  Executor with new description → Validator → pass ✅
```

### 4.3 Step Timeout

```
Executor starts step
        │
  ┌─────┴─────┐
  │ 60s timer  │
  │ started    │
  │            │
  │  LLM call  │──── no response for 65 seconds
  │            │
  │ TIMEOUT    │
  └─────┬──────┘
        │
        ▼
  Error logged: {type: "TIMEOUT", step_id: "step_3", attempt: 1}
        │
        ▼
  Retry #1: fresh 60s window
  (timeout is per-attempt, not cumulative)
        │
        ├── Success within 60s → Continue
        │
        └── Timeout again → Retry #2
                │
                ├── Success → Continue
                │
                └── Timeout → Retry #3
                        │
                        └── Timeout → REFLECTOR
                                │
                                ▼
                         Reflector analysis:
                         "Step is too complex for
                          single LLM call. Decompose."
                                │
                                ▼
                         DECOMPOSE into:
                         - sub_step_3a (simpler, faster)
                         - sub_step_3b (simpler, faster)
                         - sub_step_3c (simpler, faster)
```

### 4.4 Compound Failure (Multiple Systems Down)

```
Scenario: OpenAI down + Tavily down + Redis intermittent

Step 1 (web_search):
  Tool: Tavily → ConnectionError
  Fallback: Skip search, use LLM knowledge only
  LLM: GPT-4o → ConnectionError
  Fallback: Claude 3.5 → ✅ Success
  State: In-memory (Redis intermittent)
  Result: Partial (no web sources, LLM-only)

Step 2 (llm_only):
  LLM: GPT-4o → still down (circuit: OPEN)
  Skip to Claude 3.5 → ✅ Success
  State: Redis recovered → save checkpoint
  Result: Full

Step 3 (web_search):
  Tool: Tavily → still down
  Fallback: LLM knowledge only
  LLM: GPT-4o → circuit HALF_OPEN → probe → success!
  Circuit: GPT-4o → CLOSED (recovered)
  State: Redis → checkpoint
  Result: Partial (no web sources)

Finalizer:
  Confidence: Medium (2/3 steps had degraded tool access)
  Output: Complete but with caveat about limited web data
```

---

## 5. Tech Stack Mapping

```
┌────────────────────────┬──────────────────────────┬──────────────────────────┐
│ Component              │ Technology               │ Why This Choice          │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ API Gateway            │ FastAPI (Python 3.11)    │ Async, Pydantic, native  │
│                        │                          │ WebSocket, auto OpenAPI  │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Orchestration          │ LangGraph 0.2+           │ Native state machines,   │
│                        │                          │ conditional edges,       │
│                        │                          │ built-in checkpointing   │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Primary LLM            │ OpenAI GPT-4o            │ Best quality, JSON mode  │
│ Validation LLM         │ OpenAI GPT-4o-mini       │ Cheap, fast for judging  │
│ Fallback LLM           │ Anthropic Claude 3.5     │ Different provider =     │
│                        │ Sonnet                   │ independent failure mode │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ State Storage          │ Redis 7                  │ Sub-ms reads, Pub/Sub,   │
│                        │                          │ TTL, battle-tested       │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Vector Memory          │ FAISS (CPU, IndexFlatL2) │ Zero infra, no API key,  │
│                        │                          │ sufficient for <10K docs │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Embeddings             │ sentence-transformers    │ Local, free, fast        │
│                        │ (all-MiniLM-L6-v2)      │ 384 dims = efficient     │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Web Search             │ Tavily API               │ Built for AI agents,     │
│                        │                          │ structured results       │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Code Sandbox           │ subprocess (Python)      │ Simple, built-in, safe   │
│                        │                          │ with timeout + no-net    │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Frontend Framework     │ React 18 + Vite          │ Fast HMR, modern DX     │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Frontend Styling       │ Tailwind CSS 3           │ Rapid UI development,    │
│                        │                          │ consistent design system │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Animations             │ Framer Motion            │ Declarative, React-native│
│                        │                          │ animation library        │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ WebSocket (Frontend)   │ Native WebSocket API     │ No library needed,       │
│                        │                          │ custom reconnect logic   │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ HTTP Client (Frontend) │ Axios                    │ Interceptors, error      │
│                        │                          │ handling, widely used    │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ Containerization       │ Docker + Docker Compose  │ One-command setup,       │
│                        │                          │ reproducible builds      │
├────────────────────────┼──────────────────────────┼──────────────────────────┤
│ DAG Visualization      │ react-flow (or custom    │ Interactive node graph   │
│ (Frontend)             │ SVG)                     │ with minimal code        │
└────────────────────────┴──────────────────────────┴──────────────────────────┘
```

**Python Dependencies (backend/requirements.txt):**
```
fastapi==0.115.0
uvicorn==0.30.0
redis==5.0.0
openai==1.40.0
anthropic==0.34.0
langchain-core==0.3.0
langgraph==0.2.0
pydantic==2.9.0
faiss-cpu==1.8.0
sentence-transformers==3.0.0
tavily-python==0.4.0
httpx==0.27.0
python-dotenv==1.0.1
```

**Node Dependencies (frontend/package.json):**
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "axios": "^1.7.0",
    "framer-motion": "^11.0.0",
    "@reactflow/core": "^11.11.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 6. Scaling Considerations (Lightweight)

> These are NOT implemented in the hackathon MVP. They document that we've thought about production scale.

### 6.1 Current Limitations (Acceptable for Hackathon)

| Limitation | Impact | When It Matters |
|-----------|--------|----------------|
| Single FastAPI instance | Max ~50 concurrent WebSockets | >50 simultaneous users |
| Single Redis instance | No HA, no clustering | Production deployment |
| In-process FAISS | Memory-bound, no persistence | >100K embeddings |
| No auth | Anyone can submit tasks | Public deployment |
| No rate limiting per user | Abuse possible | Public deployment |

### 6.2 Production Scaling Path

```
                    HACKATHON (Now)              PRODUCTION (Future)
                    ──────────────               ───────────────────

API Gateway         Single FastAPI     →    FastAPI behind nginx + 
                                            Kubernetes HPA (auto-scale)

State               Single Redis       →    Redis Cluster (3+ nodes)
                                            with Sentinel for HA

Vector DB           FAISS (in-process) →    Pinecone / Weaviate
                                            (managed, persistent)

LLM Calls           Direct API calls   →    Queue-based (Celery/RQ)
                                            with worker pools

WebSocket           In-process         →    Redis-backed WS adapter
                                            (supports multi-instance)

Execution           Sync in-process    →    Async task workers
                                            (Celery + Redis broker)

Monitoring          Console logs       →    OpenTelemetry → Grafana
                                            Structured JSON logs

Auth                None               →    JWT + API keys
                                            Rate limiting per user
```

### 6.3 Horizontal Scaling Architecture (Future)

```
                         Load Balancer
                              │
                    ┌─────────┼─────────┐
                    │         │         │
               FastAPI-1  FastAPI-2  FastAPI-3
                    │         │         │
                    └─────────┼─────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              Redis Cluster   │    Task Queue
              (State + PubSub)│    (Celery)
                              │         │
                              │    ┌────┼────┐
                              │    │    │    │
                              │  Worker Worker Worker
                              │  (LangGraph execution)
                              │
                         Pinecone
                       (Vector DB)
```

**Key insight:** The architecture we're building (Redis Pub/Sub for events, stateless API handlers, state in Redis) is **already horizontally scalable** with minor changes. The hackathon version just runs everything on one machine.

---

## 7. Security Considerations (Brief)

| Risk | Mitigation (Hackathon) | Mitigation (Production) |
|------|----------------------|------------------------|
| API keys in code | `.env` file, `.gitignore` | Vault / AWS Secrets Manager |
| Prompt injection | System prompt defense | Input sanitization + guardrails |
| Code execution RCE | subprocess with timeout, no network | Container sandbox (gVisor) |
| DoS via large tasks | Max 15 steps, 30 min timeout | Rate limiting + queue depth limits |
| Data exposure | Local only | Encryption at rest + in transit |

---

## 8. AgentState: Complete Schema Reference

```python
class AgentState(TypedDict):
    # Identity
    task_id: str                                    # UUID
    original_input: str                             # User's task description
    
    # Planning
    steps: List[StepDefinition]                     # Decomposed steps
    
    # Execution Tracking
    current_step_index: int                         # Which step we're on
    step_results: List[StepResult]                  # Results per step
    
    # Reliability
    retry_counts: Dict[str, int]                    # step_id → retry count
    reflection_counts: Dict[str, int]               # step_id → reflection count
    error_log: List[ErrorEntry]                     # All errors captured
    
    # Context
    context_memory: List[str]                       # Rolling context summaries
    
    # Observability
    execution_trace: List[TraceEntry]               # Full event timeline
    llm_tokens_used: int                            # Running token counter
    
    # Status
    status: Literal[
        "planning",                                 # Planner working
        "executing",                                # Steps being executed
        "validating",                               # Validator checking output
        "reflecting",                               # Reflector analyzing failure
        "completed",                                # Task done successfully
        "failed"                                    # Task failed terminally
    ]
    
    # Timestamps
    started_at: str                                 # ISO 8601
    completed_at: Optional[str]                     # ISO 8601, None until done
    
    # Output
    final_output: Optional[dict]                    # Set by finalizer
    confidence_score: Optional[str]                 # "High" | "Medium" | "Low"
```

---

> **Architecture document complete.** This serves as the technical blueprint. Every component, interface, data flow, and failure scenario is specified to implementation level. Build from top (API Gateway) down (tools), wire through the middle (LangGraph), and wrap with reliability.
