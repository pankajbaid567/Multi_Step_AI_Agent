# Prompts.md — Step-by-Step Build Playbook

> **System:** Reliable AI Agent for Multi-Step Task Execution Under Uncertainty  
> **Method:** Follow each step in order. Copy the Claude prompt. Paste into Claude. Apply the output.  
> **Result:** A complete, working hackathon project.

---

## How to Use This Document

1. **Go step by step.** Do not skip ahead.
2. **Copy the prompt** in each step's `Claude Prompt` section.
3. **Paste it into Claude** (Opus 4.6 or similar).
4. **Apply the generated code** to your project.
5. **Run the verification check** before moving to the next step.
6. **If a step fails verification**, re-run the prompt with the error message appended.

**Total steps:** 32  
**Estimated time:** 24–36 hours

---

# 🔰 Phase 0: Setup & Project Initialization

---

## Step 0.1 — Initialize Project Structure

### Goal
Create the complete monorepo folder structure with all directories and placeholder files.

### Claude Prompt (COPY-PASTE READY)

```
You are a senior Python/React engineer setting up a production-grade project.

Create the COMPLETE folder structure for a project called "Reliable AI Agent for Multi-Step Task Execution Under Uncertainty".

Root directory: Reliable_AI_Agent_Multi-Step_Task/

Structure:
backend/
├── main.py                         # FastAPI entry point (empty with TODO)
├── config.py                       # Environment configuration
├── models/
│   ├── __init__.py
│   ├── task.py                     # Pydantic models for task I/O
│   └── trace.py                    # Execution trace models
├── agent/
│   ├── __init__.py
│   ├── state.py                    # AgentState TypedDict
│   ├── graph.py                    # LangGraph DAG definition
│   ├── nodes/
│   │   ├── __init__.py
│   │   ├── planner.py
│   │   ├── executor.py
│   │   ├── validator.py
│   │   ├── reflector.py
│   │   └── finalizer.py
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── web_search.py
│   │   ├── code_exec.py
│   │   └── api_caller.py
│   └── reliability/
│       ├── __init__.py
│       ├── retry.py
│       ├── fallback.py
│       ├── checkpoint.py
│       └── circuit_breaker.py
├── services/
│   ├── __init__.py
│   ├── llm_service.py
│   ├── redis_service.py
│   ├── vector_service.py
│   └── trace_service.py
├── routes/
│   ├── __init__.py
│   ├── tasks.py
│   ├── execute.py
│   └── traces.py
├── requirements.txt
├── Dockerfile
└── .env.example

frontend/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── TaskInput.jsx
│   │   ├── ExecutionDAG.jsx
│   │   ├── StepCard.jsx
│   │   ├── TraceTimeline.jsx
│   │   ├── LiveLogs.jsx
│   │   └── MetricsBar.jsx
│   ├── hooks/
│   │   ├── useWebSocket.js
│   │   └── useTaskExecution.js
│   ├── services/
│   │   └── api.js
│   └── styles/
│       └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── Dockerfile

docker-compose.yml
README.md
demo/
├── scenarios.json
└── demo_script.md

For EACH file, generate the actual file content:
- Python files: proper imports, docstrings, TODO comments where logic will go
- __init__.py files: appropriate exports
- config files: working configurations
- requirements.txt: all dependencies with pinned versions
- package.json: all dependencies
- docker-compose.yml: backend + frontend + redis services
- .env.example: all required environment variables with descriptions
- Dockerfiles: multi-stage builds for backend and frontend

Rules:
- Every Python file must have a module docstring
- Every __init__.py must import and expose the module's public API
- Use Python 3.11+ typing
- requirements.txt must include: fastapi, uvicorn, redis, openai, anthropic, langgraph, langchain-core, pydantic, faiss-cpu, sentence-transformers, tavily-python, httpx, python-dotenv, websockets
- package.json must include: react, react-dom, axios, framer-motion, vite, tailwindcss, autoprefixer, postcss
- docker-compose.yml must expose: backend on 8000, frontend on 5173, redis on 6379

Generate ALL file contents. No placeholders like "add code here" — use proper TODO comments with descriptions of what will be implemented.
```

### Expected Output
- Complete folder structure with 40+ files
- All configuration files ready to use
- Docker Compose that boots all services

### Files Created
- All files listed in the structure above

### Verification Check
```bash
# Backend boots
cd backend && pip install -r requirements.txt && python -c "from main import app; print('Backend OK')"

# Frontend boots
cd frontend && npm install && npm run dev -- --host 0.0.0.0 &

# Docker Compose boots
docker-compose up --build -d && curl http://localhost:8000/health
```

---

## Step 0.2 — Backend Configuration & FastAPI Bootstrap

### Goal
Set up FastAPI with CORS, error handling, request logging, and health check. The server must be runnable.

### Claude Prompt (COPY-PASTE READY)

```
You are building a FastAPI backend for a reliable AI agent system.

Create TWO files:

FILE 1: backend/config.py
- Load environment variables using python-dotenv
- Define a Settings class (Pydantic BaseSettings) with:
  - OPENAI_API_KEY: str
  - ANTHROPIC_API_KEY: str
  - TAVILY_API_KEY: str
  - REDIS_URL: str = "redis://localhost:6379"
  - PRIMARY_MODEL: str = "gpt-4o"
  - FALLBACK_MODEL: str = "claude-3-5-sonnet-20241022"
  - VALIDATION_MODEL: str = "gpt-4o-mini"
  - MAX_RETRIES: int = 3
  - STEP_TIMEOUT: int = 60
  - MAX_STEPS: int = 15
  - CHAOS_MODE: bool = False
  - LOG_LEVEL: str = "INFO"
- Singleton pattern: get_settings() returns cached instance

FILE 2: backend/main.py
- FastAPI app with title "Reliable AI Agent API"
- Middleware stack:
  1. CORS middleware (allow localhost:5173, all methods, all headers)
  2. Custom request logging middleware (log: method, path, status_code, duration_ms)
  3. Global exception handler that catches ALL exceptions and returns:
     {"success": false, "error": {"type": "InternalError", "message": "..."}, "data": null}
- Health check endpoint: GET /health → {"status": "ok", "timestamp": "...", "redis": "connected|disconnected"}
  - Actually ping Redis (wrap in try/except — return "disconnected" if fails)
- Include routers from routes/ (tasks, execute, traces) with prefixes
- Startup event: log "Agent API starting...", verify Redis connection
- Shutdown event: close Redis connection pool

Use proper async/await everywhere. Include detailed docstrings.
Do NOT use placeholder comments — implement ALL logic fully.
```

### Expected Output
- `config.py` with Pydantic settings
- `main.py` with fully working FastAPI app

### Files Created/Modified
- `backend/config.py`
- `backend/main.py`

### Verification Check
```bash
cd backend
uvicorn main:app --reload --port 8000
# Visit http://localhost:8000/health → {"status": "ok", ...}
# Visit http://localhost:8000/docs → Swagger UI loads
```

---

## Step 0.3 — Redis Service + Connection Management

### Goal
Create the Redis service layer that handles connections, state persistence, Pub/Sub, and in-memory fallback.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Redis service layer for an AI agent system.

Create: backend/services/redis_service.py

This service handles:
1. Connection management (async redis via redis.asyncio)
2. State checkpointing (save/load full AgentState as JSON)
3. Step status tracking (individual step status reads)
4. Pub/Sub event publishing (for WebSocket streaming)
5. In-memory fallback (when Redis is unavailable)

Requirements:

class RedisService:
    """Manages Redis connections and state operations with in-memory fallback."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        # Initialize async Redis client
        # Initialize in-memory fallback stores
        # Track connection status
    
    async def connect(self) -> bool:
        """Establish Redis connection. Returns True if connected, False if falling back to memory."""
    
    async def disconnect(self):
        """Close Redis connection pool."""
    
    async def is_connected(self) -> bool:
        """Ping Redis. Returns False if unreachable."""
    
    # --- State Checkpointing ---
    
    async def save_checkpoint(self, task_id: str, state: dict) -> None:
        """Save full AgentState to Redis with 24h TTL.
        Key: task:{task_id}:state
        Falls back to in-memory dict if Redis unavailable."""
    
    async def load_checkpoint(self, task_id: str) -> Optional[dict]:
        """Load AgentState from Redis.
        Returns None if task doesn't exist."""
    
    async def delete_checkpoint(self, task_id: str) -> None:
        """Delete a task's checkpoint."""
    
    # --- Step Status ---
    
    async def update_step_status(self, task_id: str, step_index: int, status: str) -> None:
        """Update individual step status.
        Key: task:{task_id}:step:{step_index}:status
        Status values: pending, running, success, failed, retrying, reflecting, skipped"""
    
    async def get_step_status(self, task_id: str, step_index: int) -> Optional[str]:
        """Get single step's status without loading full state."""
    
    # --- Pub/Sub ---
    
    async def publish_event(self, task_id: str, event: dict) -> None:
        """Publish event to channel task:{task_id}:events.
        Event must include: event_type, timestamp, and event-specific data.
        Falls back to asyncio.Queue in memory mode."""
    
    async def subscribe_events(self, task_id: str) -> AsyncGenerator[dict, None]:
        """Subscribe to task events. Yields parsed JSON events.
        In memory mode, reads from asyncio.Queue."""
    
    # --- Circuit Breaker State ---
    
    async def get_circuit_state(self, provider: str) -> dict:
        """Get circuit breaker state for an LLM provider.
        Key: circuit:{provider}
        Returns: {state, failure_count, success_count, last_failure_time, opened_at}"""
    
    async def set_circuit_state(self, provider: str, state: dict) -> None:
        """Update circuit breaker state. TTL: 300 seconds."""

Implementation rules:
- Every method must try Redis first, catch ConnectionError/RedisError, fall back to in-memory
- Log a WARNING the first time fallback activates (not on every call)
- Use json.dumps/loads for serialization with datetime handling
- TTL for state: 86400 (24h), TTL for circuit: 300 (5min)
- In-memory stores: _state_store: Dict, _step_store: Dict, _event_queues: Dict[str, asyncio.Queue]
- Include a get_redis_service() singleton function

Generate the FULL implementation. No TODOs. No placeholders. Real, working code.
```

### Expected Output
- Complete Redis service with all methods implemented
- In-memory fallback for every operation
- Pub/Sub support

### Files Created/Modified
- `backend/services/redis_service.py`

### Verification Check
```python
# Test script
import asyncio
from services.redis_service import get_redis_service

async def test():
    redis = get_redis_service()
    await redis.connect()
    
    # Test checkpoint
    await redis.save_checkpoint("test-1", {"status": "planning", "steps": []})
    state = await redis.load_checkpoint("test-1")
    assert state["status"] == "planning"
    
    # Test step status
    await redis.update_step_status("test-1", 0, "running")
    status = await redis.get_step_status("test-1", 0)
    assert status == "running"
    
    # Test pub/sub
    await redis.publish_event("test-1", {"event_type": "test", "timestamp": "now"})
    
    print("All Redis tests passed!")
    await redis.disconnect()

asyncio.run(test())
```

---

# ⚙️ Phase 1: Core Agent MVP

---

## Step 1.1 — AgentState + Pydantic Models

### Goal
Define the complete type system: AgentState, StepDefinition, StepResult, TraceEntry, ErrorEntry, and all supporting types.

### Claude Prompt (COPY-PASTE READY)

```
You are designing the type system for a multi-step AI agent with reliability features.

Create TWO files:

FILE 1: backend/agent/state.py

Define AgentState as a TypedDict with these fields:
- task_id: str (UUID)
- original_input: str (user's task description)
- steps: List[StepDefinition] (planned steps)
- current_step_index: int (which step is executing)
- step_results: List[StepResult] (results per completed step)
- execution_trace: List[dict] (chronological event log — use dict for flexibility)
- retry_counts: Dict[str, int] (step_id → number of retries)
- reflection_counts: Dict[str, int] (step_id → number of reflections)
- error_log: List[dict] (all errors captured)
- context_memory: List[str] (accumulated context summaries from completed steps)
- llm_tokens_used: int (running total)
- status: str (planning|executing|validating|reflecting|completed|failed)
- started_at: str (ISO 8601)
- completed_at: Optional[str] (ISO 8601, None until done)
- final_output: Optional[dict] (set by finalizer)
- confidence_score: Optional[str] (High|Medium|Low)

Also include:
def create_initial_state(task_id: str, user_input: str) -> AgentState:
    """Factory function that returns a clean initial state with all fields set to defaults."""

FILE 2: backend/models/task.py

Define Pydantic v2 models:

class StepDefinition(BaseModel):
    step_id: str                                          # "step_1", "step_2"
    name: str                                             # Human-readable name
    description: str                                      # Detailed instruction for the executor
    tool_needed: Literal["web_search", "api_call", "code_exec", "llm_only", "none"]
    dependencies: List[str] = []                          # step_ids this depends on
    estimated_complexity: Literal["low", "medium", "high"] = "medium"

class StepResult(BaseModel):
    step_id: str
    status: Literal["success", "failed", "skipped"]
    output: str                                           # The actual result text
    tokens_used: int = 0
    latency_ms: int = 0
    model_used: str = ""
    tool_used: Optional[str] = None
    tool_result: Optional[dict] = None
    retry_count: int = 0
    validation: Optional[str] = None                      # pass, retry, reflect
    error: Optional[str] = None

class ErrorEntry(BaseModel):
    timestamp: str                                        # ISO 8601
    step_id: str
    error_type: Literal["EMPTY_OUTPUT", "PARSE_ERROR", "HALLUCINATION", "TIMEOUT", 
                         "CLIENT_ERROR", "SERVER_ERROR", "RATE_LIMITED", 
                         "TOKEN_OVERFLOW", "QUALITY_FAIL", "CONNECTION_ERROR"]
    error_message: str
    raw_response: Optional[str] = None
    attempt_number: int = 1

class TraceEntry(BaseModel):
    timestamp: str                                        # ISO 8601
    event_type: Literal["task_started", "planning_complete", "step_started", 
                         "step_completed", "step_failed", "retry_triggered",
                         "fallback_triggered", "reflection_started", 
                         "reflection_completed", "tool_called", "checkpoint_saved",
                         "task_completed", "task_failed"]
    step_id: Optional[str] = None
    step_name: Optional[str] = None
    details: dict = {}                                    # Event-specific payload
    duration_ms: Optional[int] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    error: Optional[str] = None

class TaskRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=2000, description="Task description")

class TaskResponse(BaseModel):
    success: bool = True
    task_id: str
    steps: List[StepDefinition]
    status: str

class ExecutionEvent(BaseModel):
    """WebSocket event sent to frontend"""
    event_type: str
    task_id: str
    timestamp: str
    data: dict = {}

FILE 3: backend/models/trace.py
- Re-export TraceEntry from task.py
- Add a TraceResponse model that wraps List[TraceEntry] with metadata (task_id, total_events, total_duration_ms)

Generate all 3 files with FULL implementation. Include model validators where appropriate (e.g., validate step_id format, validate timestamp is ISO 8601). Add docstrings to every class and field.
```

### Expected Output
- Complete type system with validation
- Factory function for initial state

### Files Created/Modified
- `backend/agent/state.py`
- `backend/models/task.py`
- `backend/models/trace.py`

### Verification Check
```python
from agent.state import create_initial_state
from models.task import StepDefinition, StepResult, TaskRequest

# State creation
state = create_initial_state("test-123", "Research quantum computing")
assert state["task_id"] == "test-123"
assert state["status"] == "planning"
assert state["steps"] == []

# Model validation
step = StepDefinition(step_id="step_1", name="Search", description="Search the web", tool_needed="web_search")
result = StepResult(step_id="step_1", status="success", output="Found 5 results")
req = TaskRequest(task="Research quantum computing")

# Validation failure
try:
    TaskRequest(task="")  # Should fail — min_length=1
    assert False, "Should have raised"
except Exception:
    pass

print("All model tests passed!")
```

---

## Step 1.2 — LLM Service (Unified Interface)

### Goal
Create a single interface for calling OpenAI and Anthropic LLMs with structured response handling.

### Claude Prompt (COPY-PASTE READY)

```
You are building the LLM service layer for an AI agent. This is the ONLY place in the codebase that makes direct LLM API calls.

Create: backend/services/llm_service.py

Requirements:

1. LLMResponse dataclass:
   - text: str (the response content)
   - tokens_used: int (total tokens: prompt + completion)
   - latency_ms: int
   - model_used: str (actual model string used)
   - provider: str ("openai" or "anthropic")

2. Core function:
   async def call_llm(
       prompt: str,
       system_prompt: str = "You are a helpful AI assistant.",
       model: str = "gpt-4o",
       provider: str = "openai",
       temperature: float = 0.7,
       max_tokens: int = 4096,
       json_mode: bool = False,
       timeout: int = 60
   ) -> LLMResponse:
       """
       Makes a single LLM call to the specified provider.
       
       For OpenAI: uses openai.AsyncOpenAI with chat completions
       For Anthropic: uses anthropic.AsyncAnthropic with messages
       
       If json_mode=True:
         - OpenAI: set response_format={"type": "json_object"}
         - Anthropic: append "Respond ONLY with valid JSON." to system prompt
       
       Must handle and raise typed exceptions:
         - LLMTimeoutError (wraps asyncio.TimeoutError)
         - LLMRateLimitError (wraps 429 errors)
         - LLMConnectionError (wraps connection failures)
         - LLMResponseError (empty/invalid response)
       """

3. Custom exceptions (define at top of file):
   class LLMError(Exception): ...
   class LLMTimeoutError(LLMError): ...
   class LLMRateLimitError(LLMError): ...
   class LLMConnectionError(LLMError): ...
   class LLMResponseError(LLMError): ...

4. Provider clients (lazy initialization):
   - get_openai_client() → cached AsyncOpenAI
   - get_anthropic_client() → cached AsyncAnthropic

Implementation details:
- Use asyncio.wait_for(coro, timeout=timeout) for timeout enforcement
- Measure latency with time.perf_counter()
- Extract token counts from response usage metadata
- For Anthropic, map the message format correctly (role: "user" → content)
- Handle empty responses: if response text is empty or whitespace, raise LLMResponseError
- Log every call: model, tokens, latency (use Python logging)
- Load API keys from config.get_settings()

Generate the FULL implementation. Every function must be complete and working.
Test it can be called with:
  result = await call_llm("Say hello", model="gpt-4o", provider="openai")
  print(result.text, result.tokens_used, result.latency_ms)
```

### Expected Output
- Complete LLM service with OpenAI and Anthropic support
- Custom exception hierarchy
- Lazy client initialization

### Files Created/Modified
- `backend/services/llm_service.py`

### Verification Check
```python
import asyncio
from services.llm_service import call_llm

async def test():
    # Test OpenAI
    result = await call_llm("Say 'hello world' and nothing else.", model="gpt-4o-mini", provider="openai")
    print(f"OpenAI: {result.text} ({result.tokens_used} tokens, {result.latency_ms}ms)")
    
    # Test Anthropic
    result = await call_llm("Say 'hello world' and nothing else.", model="claude-3-5-sonnet-20241022", provider="anthropic")
    print(f"Anthropic: {result.text} ({result.tokens_used} tokens, {result.latency_ms}ms)")
    
    print("LLM service tests passed!")

asyncio.run(test())
```

---

## Step 1.3 — Planner Node

### Goal
Build the Planner node that decomposes a natural language task into structured steps using an LLM.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Planner node for a LangGraph-based AI agent.

Create: backend/agent/nodes/planner.py

The Planner takes raw user input and produces a structured list of execution steps.

Requirements:

1. Function signature (LangGraph-compatible):
   async def planner_node(state: AgentState) -> AgentState:
       """Decomposes user's task into 2-10 executable steps using LLM."""

2. Prompt engineering:
   - System prompt: You are an expert task planner. Your job is to break down complex tasks into clear, sequential, executable steps.
   - Include 2 few-shot examples of good decompositions:
     Example 1: "Research the latest AI trends and write a summary"
       → 4 steps: search → extract key findings → analyze trends → write summary
     Example 2: "Compare prices of 3 products and recommend the best"
       → 3 steps: search for products → compile comparison → generate recommendation
   - User prompt: "Decompose this task into 2-10 sequential steps: {original_input}"
   - Require JSON output: array of step objects with fields: step_id, name, description, tool_needed (web_search|api_call|code_exec|llm_only|none), dependencies, estimated_complexity
   
3. Output parsing:
   - Parse JSON response into List[StepDefinition]
   - If JSON parsing fails: retry with stricter prompt (max 2 retries)
   - If still fails: generate 3 fallback steps (research → analyze → synthesize)
   - Validate: no circular dependencies (topological sort check)
   - Validate: cap at 10 steps (truncate with warning)
   - Validate: at least 2 steps (if 1, add a "review and finalize" step)

4. State mutations:
   - Set state["steps"] = parsed steps
   - Set state["status"] = "executing"
   - Append TraceEntry with event_type="planning_complete"
   - Log: number of steps, total planning time, model used

5. Use call_llm() from services.llm_service with json_mode=True

6. Error handling:
   - If ALL LLM calls fail: set state["status"] = "failed", add error to error_log, return state
   - Never raise exceptions — always return a valid state

Also create a helper:
def validate_step_order(steps: List[StepDefinition]) -> List[StepDefinition]:
    """Verify and fix dependency ordering. Returns reordered steps if needed."""

Generate the COMPLETE implementation with all prompt text, parsing logic, and error handling.
Include the full few-shot prompt text — do not abbreviate it.
```

### Expected Output
- Complete Planner node with prompt engineering
- JSON parsing with fallback
- Dependency validation

### Files Created/Modified
- `backend/agent/nodes/planner.py`

### Verification Check
```python
import asyncio
from agent.state import create_initial_state
from agent.nodes.planner import planner_node

async def test():
    state = create_initial_state("test-1", "Research the top 5 AI startups funded in 2025 and compare their valuations")
    result = await planner_node(state)
    
    print(f"Steps planned: {len(result['steps'])}")
    for step in result["steps"]:
        print(f"  {step.step_id}: {step.name} (tool: {step.tool_needed})")
    
    assert len(result["steps"]) >= 2
    assert result["status"] == "executing"
    print("Planner test passed!")

asyncio.run(test())
```

---

## Step 1.4 — Executor Node

### Goal
Build the Executor node that runs a single step using LLM + optional tools, with context from prior steps.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Executor node — the workhorse of the AI agent system.

Create: backend/agent/nodes/executor.py

The Executor takes the current step, constructs a context-rich prompt, optionally calls tools, and produces a StepResult.

Requirements:

1. Function signature:
   async def executor_node(state: AgentState) -> AgentState:
       """Execute the current step using LLM + optional tools."""

2. Context assembly (this is critical for quality):
   Build the prompt from these sources, in order:
   a. Original task: state["original_input"]
   b. Current step: state["steps"][state["current_step_index"]]
   c. Prior results: last 3 entries from state["step_results"] — summarized (first 500 chars each)
   d. Accumulated context: last 3 entries from state["context_memory"]
   e. Reflection notes: if this step was modified by reflector, include the modification reason
   
   System prompt:
   "You are executing step {N} of {total} in a multi-step task. Use the provided context from previous steps. Be thorough, accurate, and specific. Do NOT mention that you are an AI or that you cannot access real data — work with what you have."
   
   User prompt:
   "Overall Task: {original_input}
   
   Current Step ({step_id}): {step.name}
   Instructions: {step.description}
   
   Context from Previous Steps:
   {formatted_prior_results}
   
   Execute this step now. Provide a complete, detailed result."

3. Tool dispatch (BEFORE LLM call):
   Based on step.tool_needed:
   - "web_search": call web_search tool, inject results into prompt as "Search Results: ..."
   - "api_call": call api_caller tool (extract URL from step description), inject response
   - "code_exec": ask LLM to generate code first, then execute in sandbox, inject output
   - "llm_only": no tool, direct LLM call
   - "none": pass-through (return step description as output)
   
   If tool fails: log warning, proceed with LLM-only (graceful degradation)

4. LLM call:
   Use call_llm() from services.llm_service
   Wrap with reliability layer (retry + fallback) — import from agent.reliability
   If reliability layer isn't built yet, call call_llm directly (we'll wire it in Step 2.1)

5. Result construction:
   Build StepResult with all fields populated:
   - step_id, status, output, tokens_used, latency_ms, model_used
   - tool_used (if applicable), tool_result (raw tool output)
   - retry_count from state["retry_counts"]

6. State mutations:
   - Append StepResult to state["step_results"]
   - Append key takeaway (first 200 chars of output) to state["context_memory"]
   - Append TraceEntry with event_type="step_completed" (include: input prompt length, output length, tokens, latency, model, tool)
   - Update state["llm_tokens_used"]
   - Do NOT advance current_step_index here (that happens after validation)

7. Error handling on failures:
   - If LLM call fails entirely (after all retries/fallbacks): 
     Create StepResult with status="failed", error=str(exception)
     Append to step_results
     Append TraceEntry with event_type="step_failed"
   - Never raise — always return valid state

Generate the COMPLETE implementation. Include the full prompt templates.
Handle: empty responses, timeout, connection errors.
```

### Expected Output
- Complete Executor node with context assembly
- Tool dispatch logic
- Error handling for all failure modes

### Files Created/Modified
- `backend/agent/nodes/executor.py`

### Verification Check
```python
import asyncio
from agent.state import create_initial_state
from agent.nodes.planner import planner_node
from agent.nodes.executor import executor_node

async def test():
    state = create_initial_state("test-1", "List 3 benefits of exercise")
    state = await planner_node(state)
    
    # Execute first step
    state["current_step_index"] = 0
    state = await executor_node(state)
    
    assert len(state["step_results"]) == 1
    result = state["step_results"][0]
    print(f"Step result: {result.status}")
    print(f"Output: {result.output[:200]}...")
    print(f"Model: {result.model_used}, Tokens: {result.tokens_used}")
    
    assert result.status == "success"
    assert len(result.output) > 0
    print("Executor test passed!")

asyncio.run(test())
```

---

## Step 1.5 — Validator Node

### Goal
Build the LLM-based Validator that judges executor output quality and returns pass/retry/reflect verdicts.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Validator node for the AI agent's quality gate.

Create: backend/agent/nodes/validator.py

The Validator evaluates the Executor's output and decides: pass (continue), retry (try again), or reflect (fundamentally rethink).

Requirements:

1. Function signature:
   async def validator_node(state: AgentState) -> AgentState:
       """Validate the latest step result. Returns verdict: pass/retry/reflect."""

2. Validation prompt:
   Use a cheaper model (gpt-4o-mini or config.VALIDATION_MODEL).
   
   System prompt:
   "You are a strict quality assurance judge for AI-generated content. Your job is to evaluate whether a step's output meets the requirements. Be concise and fair."
   
   User prompt:
   "Task Step: {step.name}
   Step Instructions: {step.description}
   
   Output Produced:
   {latest_step_result.output}
   
   Evaluate on these criteria (score each 0-10):
   1. RELEVANCE: Does the output address the step's instructions?
   2. COMPLETENESS: Is the output thorough (not partial or truncated)?
   3. CONSISTENCY: Does it align with the overall task context?
   4. PLAUSIBILITY: Is it factually reasonable (not hallucinated)?
   
   Rules:
   - If ALL scores >= 6: verdict is 'pass'
   - If any score is 3-5: verdict is 'retry' (fixable with another attempt)
   - If any score < 3: verdict is 'reflect' (fundamentally wrong, needs rethinking)
   
   Respond with JSON only:
   {
     "verdict": "pass|retry|reflect",
     "reason": "brief explanation",
     "scores": {"relevance": N, "completeness": N, "consistency": N, "plausibility": N}
   }"

3. Parse validation response:
   - Parse JSON from LLM response
   - Extract verdict, reason, scores
   - If JSON parse fails: fall back to rule-based validation

4. Rule-based fallback validation (if validator LLM fails):
   def rule_based_validate(output: str, step_description: str) -> dict:
       checks:
       - output length > 50 characters (not empty/trivial)
       - output does NOT contain hallucination markers:
         ["As an AI", "I cannot", "I don't have access", "I'm unable to", "I apologize"]
       - output contains at least 2 keywords from step description
       
       All pass → {"verdict": "pass", "reason": "rule-based pass"}
       Any fail → {"verdict": "retry", "reason": "failed rule-based check: {which_check}"}

5. State mutations:
   - Update the latest StepResult's validation field with the verdict
   - Append TraceEntry with event_type="step_completed" or "step_failed" based on verdict
   - Include scores and reason in trace details
   
6. Post-validation routing (return updated state — routing happens in graph):
   The graph.py will read the validation and route accordingly.
   The validator just sets the verdict on the StepResult.

Generate COMPLETE implementation with full prompt text, JSON parsing, and rule-based fallback.
```

### Expected Output
- Validator node with LLM-based quality assessment
- Rule-based fallback when validator LLM fails
- Hallucination detection

### Files Created/Modified
- `backend/agent/nodes/validator.py`

### Verification Check
```python
import asyncio
from agent.state import create_initial_state
from models.task import StepDefinition, StepResult

async def test():
    state = create_initial_state("test-1", "List benefits of exercise")
    state["steps"] = [StepDefinition(step_id="step_1", name="List benefits", description="List 3 health benefits of regular exercise", tool_needed="llm_only")]
    state["current_step_index"] = 0
    state["step_results"] = [StepResult(step_id="step_1", status="success", output="1. Improves cardiovascular health by strengthening the heart. 2. Reduces stress and anxiety through endorphin release. 3. Helps maintain healthy body weight.")]
    
    from agent.nodes.validator import validator_node
    state = await validator_node(state)
    
    verdict = state["step_results"][0].validation
    print(f"Verdict: {verdict}")
    assert verdict in ["pass", "retry", "reflect"]
    print("Validator test passed!")

asyncio.run(test())
```

---

## Step 1.6 — Finalizer Node

### Goal
Build the Finalizer that aggregates all step results into a polished final output with confidence scoring.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Finalizer node — the last node in the agent pipeline.

Create: backend/agent/nodes/finalizer.py

The Finalizer aggregates all step results, computes a confidence score, and produces the final output.

Requirements:

1. Function signature:
   async def finalizer_node(state: AgentState) -> AgentState:
       """Aggregate all step results into final output with confidence score."""

2. Confidence score computation (rule-based, not LLM):
   def compute_confidence(state: AgentState) -> str:
       """
       Scoring logic:
       - Start with 100 points
       - For each failed step: -20 points
       - For each skipped step: -15 points
       - For each step that needed retries: -5 per retry
       - For each reflection used: -10 per reflection
       
       Score >= 80: "High"
       Score >= 50: "Medium"
       Score < 50: "Low"
       """

3. Final output generation (LLM call):
   Construct a prompt that asks the LLM to synthesize all step results into a coherent output:
   
   "You are a report synthesizer. Combine these step results into a clear, well-structured final output.
   
   Original Task: {original_input}
   
   Step Results:
   Step 1 ({name}): {output[:500]}
   Step 2 ({name}): {output[:500]}
   ... (all steps)
   
   Skipped/Failed Steps: {list any non-success steps with reasons}
   
   Create a coherent, comprehensive response that addresses the original task.
   Format with clear sections and key takeaways."
   
   If LLM call fails: concatenate step outputs with headers as fallback.

4. Execution summary:
   Build summary dict:
   {
     "total_steps": N,
     "successful_steps": N,
     "failed_steps": N,
     "skipped_steps": N,
     "total_retries": N,
     "total_reflections": N,
     "total_tokens": N,
     "estimated_cost_usd": float (calculate: input tokens * rate + output tokens * rate for each model used),
     "total_duration_ms": int (from started_at to now),
     "models_used": List[str] (unique models used across all steps),
     "confidence": str
   }

5. State mutations:
   - state["final_output"] = {"result": synthesized_text, "summary": summary_dict}
   - state["confidence_score"] = computed confidence
   - state["status"] = "completed" (or "failed" if confidence is Low and >50% steps failed)
   - state["completed_at"] = current ISO 8601 timestamp
   - Append TraceEntry with event_type="task_completed"

6. Cost estimation rates:
   GPT-4o: $2.50/1M input, $10.00/1M output
   GPT-4o-mini: $0.15/1M input, $0.60/1M output
   Claude 3.5 Sonnet: $3.00/1M input, $15.00/1M output
   (Rough estimates — use these constants)

Generate COMPLETE implementation.
```

### Expected Output
- Finalizer node with confidence scoring
- Cost estimation
- Execution summary generation

### Files Created/Modified
- `backend/agent/nodes/finalizer.py`

### Verification Check
```python
# Verified as part of full pipeline test in Step 1.7
```

---

## Step 1.7 — LangGraph DAG + Conditional Routing

### Goal
Wire all nodes into a LangGraph state machine with conditional edges for pass/retry/reflect routing.

### Claude Prompt (COPY-PASTE READY)

```
You are building the LangGraph DAG that orchestrates the entire AI agent pipeline.

Create: backend/agent/graph.py

This is the core orchestration layer. It wires: planner → executor → validator → conditional routing → finalizer, with retry loops and reflection branches.

Requirements:

1. Graph structure:

   START → planner_node
   planner_node → executor_node
   executor_node → validator_node
   validator_node → route_after_validation (conditional edge)
   
   Conditional routes from route_after_validation:
   - "next_step" → advance_step_node → executor_node (loop to next step)
   - "finalizer" → finalizer_node → END
   - "retry" → prepare_retry_node → executor_node (retry same step)
   - "reflect" → reflector_node → executor_node (re-execute after reflection)
   
   reflector_node → executor_node (after state is modified)
   finalizer_node → END

2. Routing function:
   def route_after_validation(state: AgentState) -> str:
       """Determine next action based on validation verdict."""
       
       latest_result = state["step_results"][-1]
       current_step = state["steps"][state["current_step_index"]]
       
       if latest_result.validation == "pass":
           # Check if this was the last step
           if state["current_step_index"] >= len(state["steps"]) - 1:
               return "finalizer"
           return "next_step"
       
       elif latest_result.validation == "retry":
           step_id = current_step.step_id
           retries = state["retry_counts"].get(step_id, 0)
           if retries >= 3:  # Max retries exceeded → escalate to reflection
               return "reflect"
           return "retry"
       
       elif latest_result.validation == "reflect":
           step_id = current_step.step_id
           reflections = state["reflection_counts"].get(step_id, 0)
           if reflections >= 2:  # Max reflections → force skip via finalizer
               return "finalizer"
           return "reflect"
       
       # Default: if validation is None (validator failed), treat as pass
       return "next_step" if state["current_step_index"] < len(state["steps"]) - 1 else "finalizer"

3. Helper nodes:
   def advance_step_node(state: AgentState) -> AgentState:
       """Increment current_step_index and publish event."""
       state["current_step_index"] += 1
       # Publish step_started event via redis
       return state
   
   def prepare_retry_node(state: AgentState) -> AgentState:
       """Increment retry count, remove last (failed) result, prepare for re-execution."""
       step_id = state["steps"][state["current_step_index"]].step_id
       state["retry_counts"][step_id] = state["retry_counts"].get(step_id, 0) + 1
       # Remove the failed result so executor produces a fresh one
       if state["step_results"] and state["step_results"][-1].step_id == step_id:
           state["step_results"].pop()
       # Add trace entry for retry
       return state

4. Build function:
   def build_graph() -> CompiledGraph:
       """Build and compile the LangGraph state machine."""
       # Use StateGraph with AgentState
       # Add all nodes
       # Add edges and conditional edges
       # Compile and return

5. Execution function:
   async def run_agent(task_id: str, user_input: str) -> AgentState:
       """Create initial state, build graph, and run full execution."""
       state = create_initial_state(task_id, user_input)
       graph = build_graph()
       final_state = await graph.ainvoke(state)
       return final_state

6. IMPORTANT: For the reflector_node, import from agent.nodes.reflector but handle ImportError gracefully — use a placeholder if reflector isn't built yet:
   async def placeholder_reflector(state):
       """Temporary: skip step instead of reflecting."""
       # Mark step as skipped, advance
       return state

Use langgraph.graph.StateGraph and langgraph.graph.END.
Import: from langgraph.graph import StateGraph, END

Generate the COMPLETE graph.py with all routing logic, helper nodes, and full implementation.
Include proper error handling — if any node throws an unexpected exception, catch it and route to finalizer with error state.
```

### Expected Output
- Complete LangGraph DAG with all nodes connected
- Conditional routing for pass/retry/reflect
- Helper nodes for step advancement and retry preparation
- Full pipeline execution function

### Files Created/Modified
- `backend/agent/graph.py`

### Verification Check
```python
import asyncio
from agent.graph import run_agent

async def test():
    result = await run_agent("test-1", "List 3 benefits of regular exercise and explain each one")
    
    print(f"Status: {result['status']}")
    print(f"Steps: {len(result['steps'])}")
    print(f"Results: {len(result['step_results'])}")
    print(f"Tokens: {result['llm_tokens_used']}")
    print(f"Confidence: {result['confidence_score']}")
    
    if result["final_output"]:
        print(f"\nFinal output:\n{result['final_output']['result'][:500]}...")
    
    assert result["status"] in ["completed", "failed"]
    assert len(result["step_results"]) > 0
    print("\n✅ Full pipeline test passed!")

asyncio.run(test())
```

---

# 🔁 Phase 2: Reliability Layer (MOST IMPORTANT)

---

## Step 2.1 — Retry with Exponential Backoff

### Goal
Implement retry logic with exponential backoff and jitter for transient failures.

### Claude Prompt (COPY-PASTE READY)

```
You are building the retry mechanism for an AI agent's reliability layer.

Create: backend/agent/reliability/retry.py

This module wraps any async function with retry logic using exponential backoff.

Requirements:

1. Main function:
   async def retry_with_backoff(
       func: Callable[..., Awaitable[T]],
       max_retries: int = 3,
       base_delay: float = 1.0,
       max_delay: float = 30.0,
       retryable_exceptions: tuple = (Exception,),
       non_retryable_exceptions: tuple = (),
       on_retry: Optional[Callable[[int, float, Exception], Awaitable[None]]] = None,
       task_id: Optional[str] = None,
       step_id: Optional[str] = None,
   ) -> T:
       """
       Retry an async function with exponential backoff + jitter.
       
       Backoff formula: delay = min(base_delay * 2^attempt + random(0, 1), max_delay)
       
       Args:
           func: Async callable to retry (takes no args — use functools.partial or lambda)
           max_retries: Maximum number of retry attempts
           base_delay: Initial delay in seconds
           max_delay: Cap on delay (prevents absurd waits)
           retryable_exceptions: Exception types that trigger retry
           non_retryable_exceptions: Exception types that immediately propagate (override retryable)
           on_retry: Optional async callback on each retry (receives: attempt, delay, exception)
           task_id: For logging context
           step_id: For logging context
       
       Returns: The result of func() on success
       Raises: MaxRetriesExceededError if all attempts fail
       """

2. Custom exceptions:
   class MaxRetriesExceededError(Exception):
       def __init__(self, attempts: int, last_error: Exception):
           self.attempts = attempts
           self.last_error = last_error
           super().__init__(f"Failed after {attempts} attempts. Last error: {last_error}")

3. Default retryable exceptions (import from llm_service):
   RETRYABLE_EXCEPTIONS = (
       LLMTimeoutError,
       LLMRateLimitError,
       LLMConnectionError,
       asyncio.TimeoutError,
       ConnectionError,
       TimeoutError,
   )
   
   NON_RETRYABLE_EXCEPTIONS = (
       LLMResponseError,  # Empty response — worth retrying actually, include in retryable
       ValueError,
       KeyError,
       TypeError,
   )

4. Logging:
   - Log each retry: f"Retry {attempt}/{max_retries} for {step_id} after {delay:.1f}s. Error: {error}"
   - Log final failure: f"All {max_retries} retries exhausted for {step_id}. Escalating."
   - Log success after retry: f"Succeeded on attempt {attempt+1} for {step_id}"

5. Implementation details:
   - Use asyncio.sleep(delay) for backoff
   - Use random.uniform(0, 1) for jitter
   - Track all attempt errors in a list for debugging
   - The on_retry callback can be used to publish retry events via Redis

Generate COMPLETE implementation with all edge cases handled.
Include a convenience wrapper:
   async def retry_llm_call(prompt: str, **llm_kwargs) -> LLMResponse:
       """Convenience: retry an LLM call with sensible defaults."""
       return await retry_with_backoff(
           lambda: call_llm(prompt, **llm_kwargs),
           retryable_exceptions=RETRYABLE_EXCEPTIONS,
       )
```

### Expected Output
- Complete retry module with backoff formula
- Retryable exception classification
- Convenience wrapper for LLM calls

### Files Created/Modified
- `backend/agent/reliability/retry.py`

### Verification Check
```python
import asyncio
from agent.reliability.retry import retry_with_backoff, MaxRetriesExceededError

call_count = 0

async def flaky_function():
    global call_count
    call_count += 1
    if call_count < 3:
        raise ConnectionError(f"Attempt {call_count} failed")
    return "success!"

async def test():
    global call_count
    call_count = 0
    result = await retry_with_backoff(flaky_function, max_retries=3, base_delay=0.1)
    assert result == "success!"
    assert call_count == 3
    print("✅ Retry succeeds on attempt 3")
    
    call_count = 0
    try:
        await retry_with_backoff(
            flaky_function, max_retries=1, base_delay=0.1
        )
        assert False
    except MaxRetriesExceededError as e:
        print(f"✅ MaxRetriesExceeded correctly raised: {e}")

asyncio.run(test())
```

---

## Step 2.2 — LLM Fallback Chain

### Goal
Implement provider failover: GPT-4o → GPT-4o-mini → Claude 3.5 Sonnet.

### Claude Prompt (COPY-PASTE READY)

```
You are building the LLM fallback chain for the AI agent's reliability layer.

Create: backend/agent/reliability/fallback.py

When the primary LLM provider fails, the system should automatically try the next provider in the chain.

Requirements:

1. Fallback chain definition:
   FALLBACK_CHAIN = [
       {"provider": "openai", "model": "gpt-4o", "label": "GPT-4o (Primary)"},
       {"provider": "openai", "model": "gpt-4o-mini", "label": "GPT-4o-mini (Fallback 1)"},
       {"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "label": "Claude 3.5 (Fallback 2)"},
   ]

2. Main function:
   async def call_with_fallback(
       prompt: str,
       system_prompt: str = "You are a helpful AI assistant.",
       json_mode: bool = False,
       temperature: float = 0.7,
       max_tokens: int = 4096,
       timeout: int = 60,
       task_id: Optional[str] = None,
       step_id: Optional[str] = None,
       fallback_chain: Optional[List[dict]] = None,
       circuit_breaker: Optional["CircuitBreakerManager"] = None,
   ) -> LLMResponse:
       """
       Try each provider in the fallback chain until one succeeds.
       
       For each provider:
         1. Check circuit breaker — if OPEN, skip to next
         2. Call call_llm() wrapped with retry_with_backoff()
         3. On success: record success in circuit breaker, return result
         4. On failure: record failure in circuit breaker, log fallback, try next
       
       If ALL providers fail: raise AllProvidersFailedError with all errors
       
       Returns LLMResponse with actual model/provider used
       """

3. Fallback logging:
   Each fallback generates a log entry:
   {
       "from_provider": "openai/gpt-4o",
       "to_provider": "anthropic/claude-3-5-sonnet",
       "reason": "ConnectionError: ...",
       "timestamp": "..."
   }

4. Custom exception:
   class AllProvidersFailedError(Exception):
       def __init__(self, errors: List[dict]):
           self.errors = errors  # List of {"provider": str, "error": str}
           providers = [e["provider"] for e in errors]
           super().__init__(f"All LLM providers failed: {providers}")

5. Integration with circuit breaker:
   If circuit_breaker is provided:
     - Before each call: check circuit_breaker.is_open(provider)
     - On success: circuit_breaker.record_success(provider)
     - On failure: circuit_breaker.record_failure(provider)
   If circuit_breaker is None: skip circuit breaker checks

6. Integration with retry:
   Each provider attempt is wrapped withretry_with_backoff (1 retry per provider, not 3 — save time in fallback mode)

Generate COMPLETE implementation. Include detailed logging at each stage.
```

### Expected Output
- Complete fallback mechanism with provider chain
- Circuit breaker integration points
- Comprehensive error collection

### Files Created/Modified
- `backend/agent/reliability/fallback.py`

### Verification Check
```python
import asyncio
from unittest.mock import AsyncMock, patch
from agent.reliability.fallback import call_with_fallback

async def test():
    # Test normal operation (first provider works)
    result = await call_with_fallback("Say hello", task_id="test-1", step_id="step_1")
    print(f"✅ Provider: {result.provider}/{result.model_used}")
    
    print("Fallback chain test passed!")

asyncio.run(test())
```

---

## Step 2.3 — Circuit Breaker

### Goal
Implement per-provider circuit breakers to prevent hammering dead APIs.

### Claude Prompt (COPY-PASTE READY)

```
You are building the circuit breaker pattern for the AI agent's reliability layer.

Create: backend/agent/reliability/circuit_breaker.py

The circuit breaker tracks failure rates per LLM provider and short-circuits calls to failing providers.

Requirements:

1. Circuit breaker states:
   CLOSED → normal operation, all calls go through
   OPEN → provider is failing, skip all calls (return immediately)
   HALF_OPEN → probe mode, allow 1 call to test if provider recovered

2. State transitions:
   CLOSED → OPEN: when failure rate > 50% in last 60 seconds (minimum 3 calls)
   OPEN → HALF_OPEN: after 120 seconds cooldown
   HALF_OPEN → CLOSED: if probe call succeeds
   HALF_OPEN → OPEN: if probe call fails (reset cooldown timer)

3. Class design:
   class CircuitBreaker:
       """Circuit breaker for a single provider."""
       
       def __init__(self, provider_name: str, failure_threshold: float = 0.5,
                    min_calls: int = 3, window_seconds: int = 60, cooldown_seconds: int = 120):
           self.provider_name = provider_name
           self.state = "closed"
           self.calls: List[dict] = []  # {"timestamp": float, "success": bool}
           self.opened_at: Optional[float] = None
       
       def is_open(self) -> bool:
           """Check if circuit is open (calls should be skipped)."""
           # If open, check if cooldown elapsed → transition to half_open
           # Return True if open, False if closed or half_open
       
       def record_success(self):
           """Record a successful call. If half_open → transition to closed."""
       
       def record_failure(self):
           """Record a failed call. Check if failure rate exceeds threshold."""
       
       def get_state(self) -> dict:
           """Return current state for debugging/UI display."""
           return {"state": self.state, "failure_rate": ..., "provider": self.provider_name, ...}
       
       def _cleanup_old_calls(self):
           """Remove calls outside the sliding window."""
       
       def _calculate_failure_rate(self) -> float:
           """Calculate failure rate in current window."""

4. Manager class:
   class CircuitBreakerManager:
       """Manages circuit breakers for all providers."""
       
       def __init__(self):
           self.breakers: Dict[str, CircuitBreaker] = {}
       
       def get_breaker(self, provider: str) -> CircuitBreaker:
           """Get or create circuit breaker for a provider."""
       
       def is_open(self, provider: str) -> bool:
       def record_success(self, provider: str):
       def record_failure(self, provider: str):
       def get_all_states(self) -> Dict[str, dict]:
           """Return all circuit breaker states (for UI/API)."""
   
   # Singleton
   _manager = None
   def get_circuit_breaker_manager() -> CircuitBreakerManager:

5. Thread safety: use asyncio.Lock for state transitions

Generate COMPLETE implementation with proper sliding window, state transitions, and logging.
```

### Expected Output
- Per-provider circuit breakers
- Sliding window failure tracking
- State transition logic

### Files Created/Modified
- `backend/agent/reliability/circuit_breaker.py`

### Verification Check
```python
import asyncio
from agent.reliability.circuit_breaker import CircuitBreakerManager

async def test():
    manager = CircuitBreakerManager()
    
    # Normal operation
    assert not manager.is_open("openai")
    
    # Record failures
    manager.record_failure("openai")
    manager.record_failure("openai")
    manager.record_failure("openai")  # 3/3 = 100% failure rate → OPEN
    
    assert manager.is_open("openai")
    print("✅ Circuit opened after 3 failures")
    
    # Verify state
    state = manager.get_breaker("openai").get_state()
    print(f"State: {state}")
    assert state["state"] == "open"
    
    print("Circuit breaker test passed!")

asyncio.run(test())
```

---

## Step 2.4 — Reflector Node (Self-Healing)

### Goal
Build the Reflector node that analyzes failures and decides recovery strategies.

### Claude Prompt (COPY-PASTE READY)

```
You are building the Reflector node — the AI agent's self-healing capability.

Create: backend/agent/nodes/reflector.py

The Reflector analyzes why a step failed and decides on a recovery strategy.

Requirements:

1. Function signature:
   async def reflector_node(state: AgentState) -> AgentState:
       """Analyze failed step and decide recovery: MODIFY_STEP, SKIP_STEP, DECOMPOSE, or ABORT."""

2. Context gathering:
   The reflector receives the FULL state and extracts:
   - failed_step: state["steps"][state["current_step_index"]]
   - failed_results: all StepResults for this step_id (may have multiple from retries)
   - error_log: errors related to this step
   - prior_context: results from successfully completed steps
   - reflection_count: how many times we've already reflected on this step

3. Reflection prompt:
   System: "You are a senior debugging engineer. A step in an automated task has failed multiple times. Analyze the failure and recommend a recovery strategy."
   
   User prompt:
   "## Failed Task Context
   Original Task: {original_input}
   
   ## Failed Step
   Step ID: {step_id}
   Name: {step.name}
   Description: {step.description}
   Tool: {step.tool_needed}
   
   ## Failure Details
   Attempts: {len(failed_results)}
   Last Output: {last_result.output[:500] if last_result.output else 'EMPTY'}
   Last Error: {last_result.error or 'No explicit error'}
   Error Types: {[e.error_type for e in related_errors]}
   
   ## Prior Context
   Completed Steps: {[r.step_id + ': ' + r.output[:100] for r in successful_results]}
   
   ## Reflection History
   Previous reflections on this step: {reflection_count}
   
   ## Available Strategies
   1. MODIFY_STEP: Rewrite the step description for better results. Use when the step's instructions were ambiguous, too broad, or led to a wrong approach.
   2. SKIP_STEP: Mark step as skipped with a partial result. Use when the step is non-critical or when partial data from failed attempts is sufficient.
   3. DECOMPOSE: Break this step into 2-3 smaller, more focused sub-steps. Use when the step is too complex for a single execution.
   4. ABORT: Stop the entire task. Use ONLY when the task fundamentally cannot be completed (e.g., requires unavailable external access).
   
   Choose ONE strategy. Respond with JSON:
   {
     'action': 'MODIFY_STEP|SKIP_STEP|DECOMPOSE|ABORT',
     'reasoning': 'Detailed explanation of why this strategy was chosen',
     'modified_step': 'New step description (for MODIFY_STEP only, empty otherwise)',
     'sub_steps': [{'name': '...', 'description': '...', 'tool_needed': '...'}],  // for DECOMPOSE only
     'partial_result': 'Best available partial result (for SKIP_STEP only)'
   }"

4. Apply reflection action:
   
   MODIFY_STEP:
     - Update state["steps"][current].description = reflection.modified_step
     - Reset state["retry_counts"][step_id] = 0
     - Increment state["reflection_counts"][step_id]
     - Append TraceEntry: reflection_completed, action=MODIFY_STEP
     - # Graph routes back to executor
   
   SKIP_STEP:
     - Append StepResult with status="skipped", output=reflection.partial_result
     - Increment state["current_step_index"]
     - Append TraceEntry: reflection_completed, action=SKIP_STEP
     - # Graph routes to next step or finalizer
   
   DECOMPOSE:
     - Create StepDefinition objects from reflection.sub_steps
     - Insert them into state["steps"] at current position (replace the failed step)
     - Reset current_step_index to point at first sub-step
     - Append TraceEntry: reflection_completed, action=DECOMPOSE
     - # Graph routes to executor (first sub-step)
   
   ABORT:
     - state["status"] = "failed"
     - Append TraceEntry: reflection_completed, action=ABORT
     - # Graph routes to finalizer

5. Safety guards:
   - If reflection_count >= 2: force SKIP_STEP (override LLM decision)
   - If total reflections across ALL steps >= 5: force ABORT
   - If DECOMPOSE produces > 3 sub-steps: truncate to 3
   - If LLM returns invalid action: default to SKIP_STEP

6. Parse reflection response:
   - Try JSON parse
   - If fails: extract action from text heuristically (look for "MODIFY", "SKIP", "DECOMPOSE", "ABORT")
   - If still unclear: default to SKIP_STEP

Generate COMPLETE implementation with full prompt text and all action handlers.
```

### Expected Output
- Complete Reflector with 4 recovery strategies
- Safety guards against infinite loops
- Robust JSON parsing with fallbacks

### Files Created/Modified
- `backend/agent/nodes/reflector.py`

### Verification Check
```python
import asyncio
from agent.state import create_initial_state
from models.task import StepDefinition, StepResult

async def test():
    state = create_initial_state("test-1", "Research quantum computing")
    state["steps"] = [StepDefinition(step_id="step_1", name="Scrape quantum papers", description="Scrape arxiv.org for quantum computing papers", tool_needed="web_search")]
    state["current_step_index"] = 0
    state["step_results"] = [
        StepResult(step_id="step_1", status="failed", output="Access denied. Cannot scrape website.", error="403 Forbidden", retry_count=3)
    ]
    state["retry_counts"] = {"step_1": 3}
    
    from agent.nodes.reflector import reflector_node
    result = await reflector_node(state)
    
    # Check that reflector took an action
    trace = result["execution_trace"]
    reflection_events = [t for t in trace if "reflection" in str(t.get("event_type", ""))]
    print(f"Reflection events: {reflection_events}")
    print(f"Status: {result['status']}")
    print("Reflector test passed!")

asyncio.run(test())
```

---

## Step 2.5 — Wire Reliability into Executor

### Goal
Update the Executor to use retry_with_backoff, call_with_fallback, and circuit_breaker for all LLM calls.

### Claude Prompt (COPY-PASTE READY)

```
You are integrating the reliability layer into the Executor node.

Modify: backend/agent/nodes/executor.py

Current state: executor.py calls call_llm() directly.
Target state: executor.py calls call_with_fallback() which internally uses retry_with_backoff and circuit_breaker.

Changes needed:

1. Replace direct call_llm() calls with call_with_fallback():
   BEFORE:
     response = await call_llm(prompt, model="gpt-4o", provider="openai")
   
   AFTER:
     from agent.reliability.fallback import call_with_fallback
     from agent.reliability.circuit_breaker import get_circuit_breaker_manager
     
     circuit_breaker = get_circuit_breaker_manager()
     response = await call_with_fallback(
         prompt=prompt,
         system_prompt=system_prompt,
         json_mode=False,
         task_id=state["task_id"],
         step_id=current_step.step_id,
         circuit_breaker=circuit_breaker,
     )

2. Add retry event publishing:
   When a retry occurs, publish via Redis:
   await redis_service.publish_event(state["task_id"], {
       "event_type": "retry_triggered",
       "step_id": current_step.step_id,
       "attempt": retry_count,
       "reason": str(error),
       "timestamp": datetime.utcnow().isoformat()
   })

3. Add fallback event publishing:
   When a fallback occurs, publish:
   {
       "event_type": "fallback_triggered",
       "step_id": current_step.step_id,
       "from_provider": original_provider,
       "to_provider": fallback_provider,
       "timestamp": ...
   }

4. Handle AllProvidersFailedError:
   If call_with_fallback raises AllProvidersFailedError:
     - Create StepResult with status="failed", error="All LLM providers unavailable"
     - Log in error_log
     - Return state (validator will route to reflector)

5. Update trace entries to include:
   - retry_count (from reliability layer)
   - model_used (actual model, may differ from primary due to fallback)
   - fallback_used: bool

Provide the COMPLETE updated executor.py file. Keep all existing functionality, only add reliability wrapper.
```

### Expected Output
- Updated executor with full reliability integration
- Retry and fallback events published

### Files Created/Modified
- `backend/agent/nodes/executor.py` (modified)

### Verification Check
```python
# Run full pipeline — should now handle simulated failures gracefully
import asyncio
from agent.graph import run_agent

async def test():
    result = await run_agent("test-rel-1", "Explain 3 benefits of meditation")
    print(f"Status: {result['status']}, Confidence: {result['confidence_score']}")
    print(f"Tokens: {result['llm_tokens_used']}")
    
    # Check trace for any reliability events
    for trace in result["execution_trace"]:
        if trace.get("event_type") in ["retry_triggered", "fallback_triggered"]:
            print(f"  Reliability event: {trace}")
    
    print("✅ Reliability integration test passed!")

asyncio.run(test())
```

---

# 🧠 Phase 3: State & Memory

---

## Step 3.1 — Checkpoint Integration into Graph

### Goal
Wire Redis checkpointing into every state transition in the LangGraph pipeline.

### Claude Prompt (COPY-PASTE READY)

```
You are integrating Redis state checkpointing into the LangGraph pipeline.

Modify: backend/agent/graph.py

Add checkpointing at every critical state transition:

1. After planner_node completes → save_checkpoint
2. After executor_node completes → save_checkpoint
3. After validator_node completes → save_checkpoint
4. After reflector_node completes → save_checkpoint
5. After finalizer_node completes → save_checkpoint
6. After advance_step_node → update_step_status
7. After prepare_retry_node → update_step_status

Implementation approach:
Create a wrapper decorator:

def with_checkpoint(node_func):
    """Decorator that saves checkpoint after node execution."""
    async def wrapper(state: AgentState) -> AgentState:
        result = await node_func(state)
        try:
            redis = get_redis_service()
            await redis.save_checkpoint(result["task_id"], result)
            
            # Publish checkpoint event
            await redis.publish_event(result["task_id"], {
                "event_type": "checkpoint_saved",
                "timestamp": datetime.utcnow().isoformat(),
                "node": node_func.__name__,
                "step_index": result["current_step_index"],
                "status": result["status"]
            })
        except Exception as e:
            logging.warning(f"Checkpoint save failed: {e}")  # Non-fatal
        return result
    wrapper.__name__ = node_func.__name__
    return wrapper

Apply this wrapper to all nodes in build_graph():
  graph.add_node("planner", with_checkpoint(planner_node))
  graph.add_node("executor", with_checkpoint(executor_node))
  ... etc

Also add:
- Step status updates via redis.update_step_status() in advance_step_node and executor
- Event publishing for step_started events in advance_step_node

Also add a resume function:
async def resume_agent(task_id: str) -> AgentState:
    """Resume a task from its last checkpoint."""
    redis = get_redis_service()
    state = await redis.load_checkpoint(task_id)
    if not state:
        raise ValueError(f"No checkpoint found for task {task_id}")
    
    # Determine where to resume
    # If status is "executing" or "validating": re-run from current step
    # If status is "reflecting": re-run reflector
    # If status is "completed" or "failed": return as-is
    
    graph = build_graph()
    # Set entry point based on state
    final_state = await graph.ainvoke(state)
    return final_state

Provide the COMPLETE updated graph.py with checkpoint integration.
```

### Expected Output
- Checkpoint decorator applied to all nodes
- Resume function for interrupted tasks
- Step status tracking in Redis

### Files Created/Modified
- `backend/agent/graph.py` (modified)

### Verification Check
```python
import asyncio
from services.redis_service import get_redis_service

async def test():
    from agent.graph import run_agent
    redis = get_redis_service()
    await redis.connect()
    
    result = await run_agent("ckpt-test-1", "List 3 programming languages")
    
    # Verify checkpoint exists
    checkpoint = await redis.load_checkpoint("ckpt-test-1")
    assert checkpoint is not None
    assert checkpoint["status"] in ["completed", "failed"]
    print(f"✅ Checkpoint found: status={checkpoint['status']}, steps={len(checkpoint['steps'])}")
    
    await redis.disconnect()

asyncio.run(test())
```

---

## Step 3.2 — Vector Memory Service (FAISS)

### Goal
Build the FAISS-based vector memory for contextual retrieval across steps.

### Claude Prompt (COPY-PASTE READY)

```
You are building the vector memory service using FAISS for the AI agent.

Create: backend/services/vector_service.py

This service provides episodic memory within a task execution — it stores step results as embeddings and retrieves similar context for future steps.

Requirements:

1. VectorMemory class:
   class VectorMemory:
       """FAISS-based vector memory for contextual retrieval."""
       
       def __init__(self):
           """Initialize FAISS index and sentence transformer encoder.
           Use all-MiniLM-L6-v2 (384 dimensions, fast, good quality).
           Lazy-load the model on first use to avoid slow imports."""
           
           self._embedder = None  # Lazy loaded
           self._index = None     # FAISS IndexFlatL2
           self._documents = []   # Parallel list of stored texts + metadata
           self._initialized = False
       
       def _ensure_initialized(self):
           """Lazy-initialize FAISS index and embedder on first use."""
           if not self._initialized:
               from sentence_transformers import SentenceTransformer
               import faiss
               self._embedder = SentenceTransformer('all-MiniLM-L6-v2')
               self._index = faiss.IndexFlatL2(384)
               self._initialized = True
       
       def store(self, text: str, metadata: dict = {}) -> None:
           """Store a text with metadata. Generates embedding and adds to FAISS index.
           metadata should include: step_id, step_name, task_id, type (result|error|reflection)"""
       
       def search(self, query: str, top_k: int = 3, score_threshold: float = 1.5) -> List[dict]:
           """Search for similar texts. Returns list of {text, metadata, score}.
           score_threshold: max L2 distance (lower = more similar).
           Returns empty list if no match below threshold."""
       
       def clear(self):
           """Clear all stored documents and reset index."""
       
       @property
       def size(self) -> int:
           """Number of documents stored."""

2. Task-scoped memory manager:
   class MemoryManager:
       """Manages separate VectorMemory instances per task."""
       
       def __init__(self):
           self._memories: Dict[str, VectorMemory] = {}
       
       def get_memory(self, task_id: str) -> VectorMemory:
           """Get or create memory for a specific task."""
       
       def clear_memory(self, task_id: str):
           """Delete memory for a task."""
       
       def store_step_result(self, task_id: str, step_id: str, step_name: str, output: str):
           """Convenience: store a step's result."""
           text = f"Step '{step_name}': {output[:500]}"
           metadata = {"step_id": step_id, "step_name": step_name, "type": "result"}
           self.get_memory(task_id).store(text, metadata)
       
       def store_error(self, task_id: str, step_id: str, error: str):
           """Convenience: store an error for future reference."""
       
       def query_relevant_context(self, task_id: str, query: str, top_k: int = 3) -> List[str]:
           """Return relevant context strings for a step."""
           results = self.get_memory(task_id).search(query, top_k)
           return [r["text"] for r in results]
   
   # Singleton
   _manager = None
   def get_memory_manager() -> MemoryManager:

3. Graceful degradation:
   If sentence-transformers or faiss is not installed:
   - Catch ImportError
   - Return a NoOpMemory that stores nothing and returns empty on search
   - Log warning once: "FAISS/sentence-transformers not available. Vector memory disabled."

Generate COMPLETE implementation with lazy loading and graceful fallback.
```

### Expected Output
- FAISS vector memory with task-scoped isolation
- Lazy model loading
- Graceful degradation when dependencies unavailable

### Files Created/Modified
- `backend/services/vector_service.py`

### Verification Check
```python
from services.vector_service import get_memory_manager

manager = get_memory_manager()
manager.store_step_result("test-1", "step_1", "Research AI", "Latest AI trends include LLMs, multimodal models, and AI agents")
manager.store_step_result("test-1", "step_2", "Analyze trends", "LLMs are the most impactful trend, with GPT-4 leading")

results = manager.query_relevant_context("test-1", "What are the latest AI developments?", top_k=2)
print(f"Found {len(results)} relevant results")
for r in results:
    print(f"  - {r[:100]}...")

assert len(results) > 0
print("✅ Vector memory test passed!")
```

---

# 🔌 Phase 4: Tool Integration

---

## Step 4.1 — Web Search Tool (Tavily)

### Goal
Build the Tavily web search tool wrapper with error handling and fallback.

### Claude Prompt (COPY-PASTE READY)

```
You are building tool integrations for the AI agent.

Create: backend/agent/tools/web_search.py

This tool wraps the Tavily API for web search functionality.

Requirements:

1. ToolResult dataclass (shared across all tools):
   class ToolResult:
       success: bool
       data: Any              # Tool-specific output
       error_message: str     # Empty if success
       latency_ms: int
       tool_name: str

2. Search function:
   async def web_search(
       query: str,
       max_results: int = 5,
       search_depth: str = "basic",  # "basic" or "advanced"
       include_domains: List[str] = [],
       exclude_domains: List[str] = [],
   ) -> ToolResult:
       """
       Search the web using Tavily API.
       
       Returns ToolResult with data = {
           "results": [
               {"title": str, "url": str, "content": str, "score": float},
               ...
           ],
           "query": str,
           "result_count": int
       }
       
       Error handling:
       - Tavily API key missing → ToolResult(success=False, error="Tavily API key not configured")
       - Tavily API error → ToolResult(success=False, error=str(e))
       - Timeout (>15s) → ToolResult(success=False, error="Search timed out")
       - No results → ToolResult(success=True, data={"results": [], "result_count": 0})
       """

3. Query extraction helper:
   def extract_search_query(step_description: str, context: str = "") -> str:
       """
       Extract a concise search query from a step description.
       - Remove filler words ("search for", "find information about", "look up")
       - Keep key terms
       - Limit to 10 words
       - If step description is too vague, use context to build query
       """

4. Format for LLM consumption:
   def format_search_results(tool_result: ToolResult) -> str:
       """
       Format search results as a string to inject into LLM prompts.
       Format:
       --- Web Search Results for "{query}" ---
       1. {title}
          URL: {url}
          {content[:300]}
       2. ...
       --- End of Search Results ---
       """

Also create: backend/agent/tools/api_caller.py

   async def call_api(
       url: str,
       method: str = "GET",
       headers: dict = {},
       body: dict = {},
       timeout: int = 30,
   ) -> ToolResult:
       """Generic HTTP API caller using httpx."""

Also create: backend/agent/tools/code_exec.py

   async def execute_code(
       code: str,
       language: str = "python",
       timeout: int = 10,
   ) -> ToolResult:
       """Execute code in a sandboxed subprocess.
       - Uses subprocess.run with timeout
       - Captures stdout and stderr
       - No network access (not enforced at OS level, but noted)
       - Returns exit code, stdout, stderr"""

Generate ALL THREE tool files with COMPLETE implementations.
```

### Expected Output
- Tavily search wrapper
- Generic HTTP API caller
- Sandboxed code executor
- Shared ToolResult format

### Files Created/Modified
- `backend/agent/tools/web_search.py`
- `backend/agent/tools/api_caller.py`
- `backend/agent/tools/code_exec.py`

### Verification Check
```python
import asyncio
from agent.tools.web_search import web_search, extract_search_query

async def test():
    # Test search query extraction
    query = extract_search_query("Search for the latest quantum computing breakthroughs in 2025")
    print(f"Extracted query: '{query}'")
    
    # Test web search (requires Tavily API key)
    result = await web_search("quantum computing 2025")
    print(f"Search success: {result.success}")
    print(f"Results: {result.data.get('result_count', 0) if result.success else result.error_message}")
    
    print("✅ Web search tool test passed!")

asyncio.run(test())
```

---

# 🎨 Phase 5: UI + Execution Trace

---

## Step 5.1 — API Routes (Tasks, Execute, Traces)

### Goal
Build all REST API routes and the WebSocket endpoint for real-time streaming.

### Claude Prompt (COPY-PASTE READY)

```
You are building the API layer for the AI agent system.

Create THREE files:

FILE 1: backend/routes/tasks.py
Endpoints:
- POST /tasks
  - Body: {"task": "string"}
  - Validates input (1-2000 chars)
  - Creates task_id (uuid4)
  - Runs planner_node (synchronous — waits for planning to complete)
  - Saves checkpoint to Redis
  - Returns: {"success": true, "task_id": "...", "steps": [...], "status": "planned"}

- GET /tasks/{task_id}
  - Loads state from Redis
  - Returns: {"success": true, "data": AgentState}
  - 404 if not found

- POST /tasks/{task_id}/resume
  - Loads checkpoint, resumes execution
  - Returns: {"success": true, "status": "resumed", "from_step": N}

FILE 2: backend/routes/execute.py
Endpoints:
- POST /tasks/{task_id}/execute
  - Loads state from Redis
  - Launches full graph execution as background task (asyncio.create_task)
  - Returns immediately: {"success": true, "status": "started"}
  - The execution publishes events via Redis Pub/Sub

- WebSocket /ws/{task_id}
  - Accepts connection
  - Subscribes to Redis Pub/Sub channel: task:{task_id}:events
  - Forwards each event as JSON to the WebSocket client
  - Handles client disconnect gracefully
  - Sends heartbeat ping every 30s
  - On task_completed or task_failed event: sends final event, closes connection

FILE 3: backend/routes/traces.py
Endpoints:
- GET /traces/{task_id}
  - Loads state from Redis
  - Extracts execution_trace from state
  - Returns: {"success": true, "task_id": "...", "trace": [...], "total_events": N}
  - 404 if not found

All routes must:
- Use FastAPI's APIRouter with proper tags
- Use Pydantic models for request/response validation
- Return consistent envelope: {"success": bool, "data": ..., "error": ...}
- Handle exceptions with proper HTTP status codes (400, 404, 500)
- Include docstrings for auto-generated Swagger docs

Generate ALL THREE files with COMPLETE implementations.
Include the WebSocket handler with full Redis Pub/Sub subscription logic.
```

### Expected Output
- All REST endpoints implemented
- WebSocket with Redis Pub/Sub subscription
- Consistent API envelope

### Files Created/Modified
- `backend/routes/tasks.py`
- `backend/routes/execute.py`
- `backend/routes/traces.py`

### Verification Check
```bash
# Start backend
cd backend && uvicorn main:app --reload --port 8000

# Test task creation
curl -X POST http://localhost:8000/tasks -H "Content-Type: application/json" -d '{"task": "List 3 benefits of exercise"}'

# Test task retrieval (use task_id from above)
curl http://localhost:8000/tasks/{task_id}

# Test execution (triggers agent)
curl -X POST http://localhost:8000/tasks/{task_id}/execute

# Test trace
curl http://localhost:8000/traces/{task_id}

# Test WebSocket (use wscat or browser console)
# wscat -c ws://localhost:8000/ws/{task_id}
```

---

## Step 5.2 — React Frontend Shell

### Goal
Build the core React application with dark mode, layout, and component structure.

### Claude Prompt (COPY-PASTE READY)

```
You are building the React frontend for the AI agent execution dashboard.

Tech: React 18 + Vite + Tailwind CSS + Framer Motion

Create/update these files:

FILE 1: frontend/src/styles/index.css
- Tailwind directives (@tailwind base, components, utilities)
- Custom CSS variables for the theme:
  --bg-primary: #0f0f23 (deep dark blue)
  --bg-secondary: #1a1a2e (slightly lighter)
  --bg-card: #16213e (card background)
  --accent-primary: #7c3aed (purple)
  --accent-secondary: #3b82f6 (blue)
  --accent-success: #10b981 (green)
  --accent-warning: #f59e0b (amber)
  --accent-error: #ef4444 (red)
  --accent-info: #8b5cf6 (light purple)
  --text-primary: #e2e8f0
  --text-secondary: #94a3b8
- Import Inter font from Google Fonts
- Glassmorphism utility class:
  .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
- Pulse animation for running state
- Smooth scrollbar styling for dark mode

FILE 2: frontend/src/services/api.js
- Axios instance with base URL http://localhost:8000
- Functions:
  - createTask(taskDescription) → POST /tasks
  - getTask(taskId) → GET /tasks/{taskId}
  - executeTask(taskId) → POST /tasks/{taskId}/execute
  - getTrace(taskId) → GET /traces/{taskId}
- Error handling: wrap all calls, return consistent {success, data, error}

FILE 3: frontend/src/hooks/useWebSocket.js
- Custom hook: useWebSocket(taskId)
- Returns: { events, isConnected, error }
- Connects to ws://localhost:8000/ws/{taskId}
- Auto-reconnects on disconnect (max 3 attempts, 3s delay)
- Falls back to polling (GET /tasks/{taskId} every 3s) if WebSocket fails
- Parses incoming JSON events and appends to events array

FILE 4: frontend/src/hooks/useTaskExecution.js
- Custom hook: useTaskExecution()
- Returns: { task, steps, results, trace, metrics, submitTask, isLoading, error }
- Manages full task lifecycle:
  1. submitTask(description) → creates task → triggers execution → opens WebSocket
  2. Updates steps/results/trace as WebSocket events arrive
  3. Computes metrics: totalTokens, estimatedCost, totalTime, retryCount, fallbackCount, reflectionCount
- Uses useWebSocket internally

FILE 5: frontend/src/App.jsx
- Main layout:
  - Top header bar: project name "Reliable AI Agent", tagline, dark theme
  - Left panel (40%): TaskInput + MetricsBar
  - Right panel (60%): ExecutionDAG / StepCards + TraceTimeline
- Responsive: stacks vertically on smaller screens
- Uses framer-motion for page transitions

Generate ALL files with COMPLETE implementations. Use Tailwind classes throughout.
Dark mode by default. Premium, modern aesthetic. Not generic or Bootstrap-looking.
```

### Expected Output
- Complete React app shell with dark mode
- API service layer
- WebSocket hook with reconnection
- Task execution state management

### Files Created/Modified
- `frontend/src/styles/index.css`
- `frontend/src/services/api.js`
- `frontend/src/hooks/useWebSocket.js`
- `frontend/src/hooks/useTaskExecution.js`
- `frontend/src/App.jsx`

### Verification Check
```bash
cd frontend && npm run dev
# Open http://localhost:5173 → dark mode layout renders
# No console errors
# TaskInput form visible
```

---

## Step 5.3 — TaskInput + StepCard Components

### Goal
Build the task input form and step status card components.

### Claude Prompt (COPY-PASTE READY)

```
You are building React UI components for the AI agent dashboard.

Create these components:

FILE 1: frontend/src/components/TaskInput.jsx
- Styled textarea with dark theme (glass card effect)
- Placeholder: "Describe your task... e.g., 'Research the top 5 AI startups funded in 2025 and compare their valuations'"
- Character counter (max 2000)
- Submit button with gradient (purple → blue)
  - Loading state: spinner + "Planning..." text
  - Disabled when empty or when task is running
- Pre-built example tasks as clickable chips below the input:
  - "Research quantum computing advances"
  - "Compare 5 programming languages"
  - "Analyze AI market trends"
- Props: { onSubmit: (task: string) => void, isLoading: boolean }
- Use framer-motion for button hover/tap animations

FILE 2: frontend/src/components/StepCard.jsx
- Card component for a single execution step
- Props: { step, result, index, isActive, onClick }
- Display:
  - Step number (circular badge)
  - Step name
  - Status badge with colors + icons:
    - pending: gray, clock icon, "Pending"
    - running: blue pulse animation, spinner, "Running..."
    - success: green, checkmark, "Complete"
    - failed: red, x-mark, "Failed"
    - retrying: orange, refresh icon, "Retry {N}/3"
    - reflecting: purple, brain icon, "Reflecting..."
    - skipped: dim gray, skip icon, "Skipped"
  - Tool badge (if tool used): small pill showing "web_search" or "llm_only"
  - Duration (if completed): e.g., "3.2s"
  - Token count (if available): e.g., "892 tokens"
- Expandable: click to show output preview (first 300 chars)
- Use framer-motion:
  - Slide in from left on appear (staggered)
  - Status badge transitions smoothly
  - Pulse animation on running state
- Glassmorphism card style

FILE 3: frontend/src/components/MetricsBar.jsx
- Horizontal bar showing execution metrics
- Props: { metrics } where metrics = { totalTokens, estimatedCost, totalTime, retryCount, fallbackCount, reflectionCount, confidence }
- Display as grid of metric cards:
  - 🔢 Tokens: {totalTokens}
  - 💰 Cost: ${estimatedCost}
  - ⏱ Time: {totalTime}
  - 🔁 Retries: {retryCount}
  - 🔄 Fallbacks: {fallbackCount}
  - 🤔 Reflections: {reflectionCount}
  - ✅ Confidence: {confidence} (colored badge)
- Animate numbers counting up when they change
- Compact design, fits in a single row

Generate ALL THREE components with COMPLETE implementations.
Use Tailwind CSS classes. Dark theme. Premium aesthetic.
Include all icons as inline SVGs (no external icon library needed).
```

### Expected Output
- TaskInput with example chips and character counter
- StepCard with status animations
- MetricsBar with live metric display

### Files Created/Modified
- `frontend/src/components/TaskInput.jsx`
- `frontend/src/components/StepCard.jsx`
- `frontend/src/components/MetricsBar.jsx`

### Verification Check
```bash
# Run dev server and verify components render
cd frontend && npm run dev
# TaskInput accepts text and shows char count
# StepCards render with mock data (if using storybook or test data)
```

---

## Step 5.4 — ExecutionDAG + TraceTimeline

### Goal
Build the visual execution flow and the expandable trace timeline.

### Claude Prompt (COPY-PASTE READY)

```
You are building the execution visualization components for the AI agent dashboard.

Create these components:

FILE 1: frontend/src/components/ExecutionDAG.jsx
- Visual representation of the agent's execution pipeline
- Props: { steps, results, currentStepIndex }
- Layout: vertical list of StepCards connected by lines/arrows
  - Each step is a StepCard (imported)
  - Between steps: a vertical connector line
    - Color: green if previous step completed, gray if pending, orange if retry
  - Show retry loops: if a step was retried, show a small curved arrow indicator
  - Show reflection: if a step was reflected, show a branching indicator
- At the top: "Planning → Executing → Complete" progress bar
- Current step highlighted with a glow effect
- Animate: steps appear one by one as they're created
- If no steps yet: show "Waiting for agent to plan..." skeleton

FILE 2: frontend/src/components/TraceTimeline.jsx
- Vertical timeline showing all execution events
- Props: { trace } (array of TraceEntry objects)
- Each event shows:
  - Timestamp (relative: "2s ago", "15s ago") 
  - Event type icon:
    - task_started: 🚀
    - planning_complete: 📋
    - step_started: ▶️
    - step_completed: ✅
    - step_failed: ❌
    - retry_triggered: 🔁
    - fallback_triggered: 🔄
    - reflection_started: 🤔
    - reflection_completed: 💡
    - checkpoint_saved: 💾
    - task_completed: 🎉
    - task_failed: 💥
  - Event description (auto-generated from event data)
  - Expandable detail panel:
    - For step events: show prompt (truncated), response (truncated), tokens, model, latency
    - For retry events: show attempt number, error, backoff delay
    - For fallback events: show from_provider → to_provider
    - For reflection events: show action taken, reasoning
- Color-coded left border by event type
- Auto-scroll to latest event (with "stick to bottom" toggle)
- Filter buttons: All | Steps | Errors | Reliability
- Max height with scroll

FILE 3: frontend/src/components/LiveLogs.jsx
- Simple scrolling log panel (alternative to timeline for compact view)
- Props: { events }
- Shows one-line log entries:
  "[12:34:56] ✅ Step 1 completed (GPT-4o, 892 tokens, 3.2s)"
  "[12:34:59] 🔁 Step 2 retry 1/3 (timeout)"
  "[12:35:02] 🔄 Fallback: openai → anthropic"
- Monospace font, terminal-style dark background
- Auto-scroll
- Copy-all button

Generate ALL THREE components with COMPLETE implementations.
Use Tailwind CSS. Dark theme. Smooth animations via framer-motion.
```

### Expected Output
- Visual execution flow with connected steps
- Expandable trace timeline
- Terminal-style log viewer

### Files Created/Modified
- `frontend/src/components/ExecutionDAG.jsx`
- `frontend/src/components/TraceTimeline.jsx`
- `frontend/src/components/LiveLogs.jsx`

### Verification Check
```bash
cd frontend && npm run dev
# Full app renders with all components
# Submit a task → steps appear → trace updates → metrics show
```

---

## Step 5.5 — Full Frontend Integration + Polish

### Goal
Wire all components together in App.jsx and add final UI polish.

### Claude Prompt (COPY-PASTE READY)

```
You are doing the final integration and polish of the AI agent dashboard.

Update: frontend/src/App.jsx (COMPLETE REWRITE)

Integrate all components into a cohesive, polished application:

1. Layout:
   - Full-height dark background
   - Sticky header:
     - Left: Logo/title "⚡ Reliable AI Agent" with gradient text
     - Center: Status indicator (Idle / Planning / Executing / Complete)
     - Right: Chaos Mode toggle switch (sends config to backend)
   - Main content (below header):
     - Left column (35%):
       - TaskInput component
       - MetricsBar component (appears after task starts)
       - LiveLogs component (compact, scrollable)
     - Right column (65%):
       - ExecutionDAG component (step visualization)
       - TabView: "Execution" | "Trace" tabs
         - Execution tab: StepCards in ExecutionDAG
         - Trace tab: TraceTimeline

2. State management:
   - Use useTaskExecution hook
   - Wire TaskInput.onSubmit → hook.submitTask
   - Wire WebSocket events → update all components
   - Compute and pass metrics to MetricsBar

3. UX polish:
   - Smooth transitions between states (idle → planning → executing → complete)
   - Toast notification system (bottom-right):
     - "✅ Planning complete: 5 steps"
     - "🔁 Step 2 retrying..."
     - "🔄 Switched to Claude 3.5 Sonnet"
     - "🎉 Task complete! Confidence: High"
   - Error state: if task fails, show red banner with error message
   - Empty state: show a hero section with features overview and example tasks

4. Animations:
   - Header status badge pulses during execution
   - Step cards slide in with stagger
   - Metrics numbers animate (count up)
   - Subtle background gradient animation

5. Responsive:
   - Desktop (>1024px): two-column layout
   - Tablet (<1024px): single column, tabs for switching between input and execution
   - Always dark mode

6. Final output display:
   - When task completes, show a "Result" modal or expanded section:
     - Final synthesized output
     - Confidence badge
     - Execution summary
     - Download trace as JSON button

Generate the COMPLETE App.jsx and any additional utility files needed (e.g., Toast component).
This should be the production-quality frontend. Premium look. No placeholder UI.
```

### Expected Output
- Fully integrated React application
- Toast notifications
- Responsive layout
- Complete execution flow: submit → plan → execute → result

### Files Created/Modified
- `frontend/src/App.jsx` (complete rewrite)
- `frontend/src/components/Toast.jsx` (new)

### Verification Check
```bash
# Full end-to-end test
cd frontend && npm run dev  # Terminal 1
cd backend && uvicorn main:app --reload --port 8000  # Terminal 2

# Open http://localhost:5173
# Submit "List 3 benefits of exercise"
# Watch: steps appear → execution progresses → result displayed
# Check: metrics bar shows tokens/cost/time
# Check: trace timeline has events
# Check: no console errors
```

---

# 🧪 Phase 6: Testing & Simulation

---

## Step 6.1 — Chaos Mode (Error Injection)

### Goal
Build the chaos mode middleware that deliberately injects failures for demo purposes.

### Claude Prompt (COPY-PASTE READY)

```
You are building the chaos mode (error injection) middleware for the AI agent.

Create: backend/agent/reliability/chaos.py

Chaos mode deliberately injects failures to demonstrate the system's reliability features.

Requirements:

1. ChaosMiddleware class:
   class ChaosMiddleware:
       """Injects random failures when CHAOS_MODE is enabled."""
       
       def __init__(self, enabled: bool = False):
           self.enabled = enabled
           self.injection_stats = {"latency": 0, "empty": 0, "rate_limit": 0, "corrupt": 0, "passthrough": 0}
       
       async def maybe_inject(self, context: str = "") -> Optional[str]:
           """
           Call before each external call. Returns None if no injection,
           or raises an appropriate exception if injecting.
           
           Injection probabilities:
           - 30%: Add 5s latency (await asyncio.sleep(5))
           - 20%: Raise LLMResponseError("Chaos: empty response")
           - 15%: Raise LLMRateLimitError("Chaos: rate limit")
           - 10%: Return "CORRUPT" (caller should truncate output to 50%)
           - 25%: Pass through (no injection)
           
           Log every injection: "CHAOS: Injected {type} at {context}"
           """
       
       def get_stats(self) -> dict:
           """Return injection statistics."""
       
       def reset_stats(self):
           """Reset statistics."""

2. Integration point:
   Add to fallback.py's call_with_fallback():
   
   # At the start of each provider attempt:
   if chaos_mode_enabled:
       chaos = get_chaos_middleware()
       injection = await chaos.maybe_inject(f"provider={provider}, step={step_id}")
       if injection == "CORRUPT":
           # After getting response, truncate to 50%
           response.text = response.text[:len(response.text)//2]

3. API endpoint to toggle chaos mode:
   Add to routes/tasks.py:
   POST /config/chaos
   Body: {"enabled": true/false}
   Response: {"chaos_mode": true/false, "stats": {...}}
   
   GET /config/chaos
   Response: {"chaos_mode": true/false, "stats": {...}}

4. Trace tagging:
   When chaos mode injects a failure, add a tag to the trace entry:
   {"chaos_injected": true, "injection_type": "latency|empty|rate_limit|corrupt"}
   This allows the UI to distinguish injected failures from organic ones.

Generate COMPLETE implementation with all injection types and API endpoints.
```

### Expected Output
- Chaos mode middleware with configurable injection
- API endpoints to toggle and monitor chaos
- Trace tagging for injected failures

### Files Created/Modified
- `backend/agent/reliability/chaos.py`
- `backend/routes/tasks.py` (add chaos endpoints)
- `backend/agent/reliability/fallback.py` (add chaos integration)

### Verification Check
```bash
# Enable chaos mode
curl -X POST http://localhost:8000/config/chaos -H "Content-Type: application/json" -d '{"enabled": true}'

# Run a task  — should see retries/fallbacks in trace
curl -X POST http://localhost:8000/tasks -H "Content-Type: application/json" -d '{"task": "List 3 facts about the moon"}'
# Execute and watch for chaos injections in trace

# Check chaos stats
curl http://localhost:8000/config/chaos
```

---

## Step 6.2 — Demo Scenarios

### Goal
Create pre-built demo scenarios with expected behaviors.

### Claude Prompt (COPY-PASTE READY)

```
You are preparing demo scenarios for the AI agent hackathon presentation.

Create: demo/scenarios.json

Define 3 demo scenarios, each with:
- id: unique identifier
- name: display name
- description: what to type in the task input
- expected_steps: expected number of steps (approximate)
- expected_duration: approximate execution time
- demonstrates: which features this scenario showcases
- chaos_mode: whether chaos mode should be on
- talking_points: what to say during demo

Scenarios:

1. "Happy Path" (Research Task):
   - Input: "Research the top 5 breakthroughs in quantum computing from 2024-2025. For each breakthrough, explain the technology, the research team, and potential real-world applications. Compile into a structured summary report."
   - Showcases: Task decomposition, web search, multi-step synthesis, final report
   - Chaos mode: OFF
   - Expected: 4-5 steps, ~2 minutes

2. "Failure Recovery" (API-Heavy Task):
   - Input: "Find the current weather in New York, Tokyo, London, Sydney, and Cairo. Compare the temperatures, identify the hottest and coldest cities, and recommend the best city to visit today based on weather."
   - Showcases: API calls, retry mechanism, fallback chain, partial results
   - Chaos mode: ON
   - Expected: 3-4 steps with 2-3 retries, ~3 minutes

3. "Reflection Demo" (Complex Task):
   - Input: "Write a Python function that implements a binary search tree with insert, search, and delete operations. Then write unit tests for it. Finally, document the code with docstrings and complexity analysis."
   - Showcases: Code generation, validation, reflection (code might fail tests), self-correction
   - Chaos mode: OFF (or light)
   - Expected: 4-5 steps with possible reflection, ~3 minutes

Also create: demo/demo_script.md

A detailed walkthrough script for the hackathon presentation:
- Total time: 5 minutes
- Include: what to say, when to click, what to point out
- Include backup plans for each scenario
- Include Q&A preparation (top 5 expected questions + answers)

Generate BOTH files with COMPLETE content.
```

### Expected Output
- 3 pre-built demo scenarios as JSON
- Detailed demo walkthrough script

### Files Created/Modified
- `demo/scenarios.json`
- `demo/demo_script.md`

### Verification Check
```bash
# Validate JSON
python -c "import json; print(json.load(open('demo/scenarios.json')))"

# Run each scenario manually and verify expected behavior
```

---

# 🎤 Phase 7: Demo Preparation

---

## Step 7.1 — Docker Compose + One-Command Setup

### Goal
Ensure the entire system boots with a single command.

### Claude Prompt (COPY-PASTE READY)

```
You are preparing the final deployment configuration for the AI agent system.

Create/update these files:

FILE 1: docker-compose.yml
Services:
1. redis:
   - Image: redis:7-alpine
   - Port: 6379
   - Healthcheck: redis-cli ping
   - Volume: redis-data (persistent)

2. backend:
   - Build from backend/Dockerfile
   - Port: 8000
   - Depends on: redis
   - Environment: load from .env
   - Healthcheck: curl localhost:8000/health
   - Restart: unless-stopped
   - Volume mount: ./backend:/app (for dev mode hot reload)

3. frontend:
   - Build from frontend/Dockerfile
   - Port: 5173
   - Depends on: backend
   - Environment: VITE_API_URL=http://localhost:8000

FILE 2: backend/Dockerfile
- Multi-stage build
- Base: python:3.11-slim
- Install system dependencies
- pip install requirements.txt
- Copy source code
- CMD: uvicorn main:app --host 0.0.0.0 --port 8000
- HEALTHCHECK: curl --fail http://localhost:8000/health

FILE 3: frontend/Dockerfile
- Stage 1 (build): node:20-alpine, npm install, npm run build
- Stage 2 (serve): nginx:alpine, copy build output
- Or for dev: node:20-alpine, npm run dev -- --host 0.0.0.0

FILE 4: README.md
- Project title + badge/shield
- One-paragraph description
- Architecture diagram (text-based)
- Quick Start:
  1. Clone the repo
  2. Copy .env.example to .env, add API keys
  3. docker-compose up --build
  4. Open http://localhost:5173
- Features list
- Tech stack
- Demo scenarios
- API documentation (key endpoints)
- Team members section
- License

FILE 5: .env.example (updated with all vars)

Generate ALL files with COMPLETE implementations.
The README should be impressive — judges read these.
```

### Expected Output
- Working Docker Compose setup
- Professional README
- One-command boot

### Files Created/Modified
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `README.md`
- `.env.example`

### Verification Check
```bash
# Clean build test
docker-compose down -v
docker-compose up --build

# Wait 60 seconds
curl http://localhost:8000/health
# Open http://localhost:5173

# Full test: submit a task from the UI
```

---

## Step 7.2 — Final Integration Test

### Goal
Run a comprehensive end-to-end test that verifies all components work together.

### Claude Prompt (COPY-PASTE READY)

```
You are writing the final integration test for the AI agent system.

Create: backend/tests/test_integration.py

This is NOT a unit test suite. This is a single end-to-end integration test that verifies the ENTIRE system works.

Test flow:

1. TEST: Health Check
   - GET /health → 200, status=ok, redis=connected

2. TEST: Task Creation
   - POST /tasks with "List 3 benefits of regular exercise"
   - Verify: 200, task_id is UUID, steps is non-empty list (2-10 items)
   - Verify: each step has step_id, name, description, tool_needed

3. TEST: Task Execution
   - POST /tasks/{task_id}/execute
   - Poll GET /tasks/{task_id} every 3 seconds until status is "completed" or "failed" (max 5 minutes)
   - Verify: status is "completed"
   - Verify: step_results has entries for each step
   - Verify: final_output is not None
   - Verify: confidence_score is set

4. TEST: Execution Trace
   - GET /traces/{task_id}
   - Verify: trace is non-empty
   - Verify: has "task_started" event
   - Verify: has at least one "step_completed" event
   - Verify: has "task_completed" event
   - Verify: events are in chronological order

5. TEST: Metrics Accuracy
   - From final state, verify:
     - llm_tokens_used > 0
     - completed_at is set and > started_at
     - len(step_results) == len(steps) (all steps have results)

6. TEST: Chaos Mode
   - POST /config/chaos {"enabled": true}
   - Create and execute a new task: "Explain photosynthesis"
   - Wait for completion (may take longer due to injected failures)
   - Verify: task completed (possibly with reduced confidence)
   - Verify: trace contains at least one reliability event (retry or fallback)
   - POST /config/chaos {"enabled": false}

7. TEST: Error Handling
   - POST /tasks with empty body → 422
   - GET /tasks/nonexistent-id → 404
   - GET /traces/nonexistent-id → 404

Use Python's requests library (synchronous — simpler for testing).
Include timing information for each test.
Print clear PASS/FAIL for each test.
Print summary at end.

Generate the COMPLETE test file. It should be runnable with: python tests/test_integration.py
```

### Expected Output
- Comprehensive integration test
- Tests all major flows
- Clear pass/fail output

### Files Created/Modified
- `backend/tests/test_integration.py`

### Verification Check
```bash
cd backend
python tests/test_integration.py
# Should see: all tests PASS
```

---

# 📋 Summary: All Steps in Order

| # | Phase | Step | Title | Critical? |
|---|-------|------|-------|-----------|
| 0.1 | Setup | 0.1 | Project Structure | ✅ P0 |
| 0.2 | Setup | 0.2 | FastAPI Bootstrap | ✅ P0 |
| 0.3 | Setup | 0.3 | Redis Service | ✅ P0 |
| 1.1 | Core | 1.1 | AgentState + Models | ✅ P0 |
| 1.2 | Core | 1.2 | LLM Service | ✅ P0 |
| 1.3 | Core | 1.3 | Planner Node | ✅ P0 |
| 1.4 | Core | 1.4 | Executor Node | ✅ P0 |
| 1.5 | Core | 1.5 | Validator Node | ✅ P0 |
| 1.6 | Core | 1.6 | Finalizer Node | ✅ P0 |
| 1.7 | Core | 1.7 | LangGraph DAG | ✅ P0 |
| 2.1 | Reliability | 2.1 | Retry with Backoff | ✅ P0 |
| 2.2 | Reliability | 2.2 | LLM Fallback Chain | ✅ P0 |
| 2.3 | Reliability | 2.3 | Circuit Breaker | 🟡 P1 |
| 2.4 | Reliability | 2.4 | Reflector Node | ✅ P0 |
| 2.5 | Reliability | 2.5 | Wire Reliability | ✅ P0 |
| 3.1 | State | 3.1 | Checkpoint Integration | ✅ P0 |
| 3.2 | State | 3.2 | Vector Memory (FAISS) | 🟢 P2 |
| 4.1 | Tools | 4.1 | Web Search + Tools | 🟡 P1 |
| 5.1 | UI | 5.1 | API Routes + WebSocket | ✅ P0 |
| 5.2 | UI | 5.2 | React Frontend Shell | ✅ P0 |
| 5.3 | UI | 5.3 | TaskInput + StepCard | ✅ P0 |
| 5.4 | UI | 5.4 | ExecutionDAG + Trace | 🟡 P1 |
| 5.5 | UI | 5.5 | Full Integration + Polish | 🟡 P1 |
| 6.1 | Testing | 6.1 | Chaos Mode | 🟡 P1 |
| 6.2 | Testing | 6.2 | Demo Scenarios | ✅ P0 |
| 7.1 | Demo | 7.1 | Docker + README | ✅ P0 |
| 7.2 | Demo | 7.2 | Integration Test | 🟡 P1 |

---

# ⚡ Speed Run: If You Have Only 12 Hours

Do these steps ONLY (in order):

1. **Step 0.1** — Project structure
2. **Step 0.2** — FastAPI bootstrap
3. **Step 1.1** — AgentState + Models
4. **Step 1.2** — LLM Service
5. **Step 1.3** — Planner Node
6. **Step 1.4** — Executor Node
7. **Step 1.6** — Finalizer Node (skip Validator — default to "pass")
8. **Step 1.7** — LangGraph DAG (no conditional routing — linear flow)
9. **Step 2.1** — Retry with Backoff
10. **Step 2.2** — LLM Fallback Chain
11. **Step 5.1** — API Routes (REST only, skip WebSocket)
12. **Step 5.2** — React Shell (minimal)
13. **Step 5.3** — TaskInput + StepCard
14. **Step 7.1** — README

This gives you: a working agent with retry + fallback, displayable in a basic UI.

---

> **Final note:** Every prompt in this document is self-contained. You can paste any single prompt into Claude and get working code. Follow the order for best results. Verify each step before proceeding. If a step fails, include the error message in a follow-up prompt to Claude.
