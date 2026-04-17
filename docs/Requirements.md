# Requirements Document: Reliable AI Agent for Multi-Step Task Execution Under Uncertainty

> **Version:** 1.0  
> **Last Updated:** 2026-04-17  
> **Status:** Approved for Hackathon MVP  
> **Scope:** Production-grade MVP — 36-hour build window

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [User Stories](#3-user-stories)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Constraints](#5-constraints)
6. [Glossary](#6-glossary)

---

## 1. Functional Requirements

### FR-1: Task Planning & Decomposition

| ID | Requirement | Priority |
|----|------------|----------|
| FR-1.1 | The system SHALL accept a natural language task description (1–2000 chars) from the user via REST API and frontend form. | P0 |
| FR-1.2 | The system SHALL use an LLM to decompose the input task into an ordered list of 2–15 discrete executable steps. | P0 |
| FR-1.3 | Each decomposed step SHALL contain: `step_id`, `name`, `description`, `tool_needed` (enum: `llm`, `web_search`, `api_call`, `code_exec`, `none`), `dependencies` (list of step_ids), `estimated_complexity` (low/medium/high). | P0 |
| FR-1.4 | The planner SHALL output steps in dependency-aware order — no step shall execute before its dependencies are satisfied. | P0 |
| FR-1.5 | The planner SHALL use structured output (JSON mode) to guarantee parseable step definitions. If the LLM returns malformed JSON, the system SHALL retry with a stricter prompt up to 2 times before failing. | P0 |
| FR-1.6 | The user SHALL be able to view the planned steps before execution begins (preview mode). | P1 |
| FR-1.7 | The system SHOULD allow the user to modify or reorder planned steps before execution (optional, P2). | P2 |

---

### FR-2: Step Execution

| ID | Requirement | Priority |
|----|------------|----------|
| FR-2.1 | The system SHALL execute steps sequentially in dependency order, passing accumulated context from prior step results to the current step. | P0 |
| FR-2.2 | Each step execution SHALL produce a `StepResult` containing: `step_id`, `status` (success/failed/skipped), `output` (text), `tokens_used`, `latency_ms`, `model_used`, `tool_used`, `retry_count`, `error` (if any). | P0 |
| FR-2.3 | The system SHALL enforce a per-step timeout of 60 seconds. If a step exceeds this timeout, it SHALL be marked as failed and routed to the retry/fallback/reflection pipeline. | P0 |
| FR-2.4 | The system SHALL construct step-specific prompts that include: (a) the step description, (b) results from all completed dependency steps, (c) relevant vector memory context (if available), (d) any reflection notes from prior failed attempts. | P0 |
| FR-2.5 | The system SHALL support concurrent execution of independent steps (steps with no mutual dependencies) when possible. | P2 |
| FR-2.6 | The system SHALL maintain a running context window that accumulates key information across steps, truncated to fit model context limits (128K tokens for GPT-4o, 200K for Claude). | P1 |

---

### FR-3: API & Tool Integration

| ID | Requirement | Priority |
|----|------------|----------|
| FR-3.1 | The system SHALL integrate with Tavily Search API for web search operations, returning top 5 results with: `title`, `url`, `content_snippet`, `relevance_score`. | P0 |
| FR-3.2 | The system SHALL provide a generic HTTP tool (`api_caller`) capable of making GET, POST, PUT requests to external APIs with configurable: URL, headers, body, timeout (max 30s). | P1 |
| FR-3.3 | The system SHALL provide a sandboxed code execution tool (`code_exec`) that runs Python code in a subprocess with: 10-second timeout, no network access, no filesystem write access outside `/tmp`, captured stdout/stderr. | P1 |
| FR-3.4 | All tool calls SHALL return a uniform `ToolResult` structure: `success` (bool), `data` (any), `error_message` (str), `latency_ms` (int), `tool_name` (str). | P0 |
| FR-3.5 | The system SHALL log every tool invocation in the execution trace, including: input parameters, output, latency, and any errors. | P0 |
| FR-3.6 | Tool selection SHALL be driven by the `tool_needed` field in the step definition. If the specified tool is unavailable, the executor SHALL fall back to pure LLM reasoning. | P1 |

---

### FR-4: Failure Detection

| ID | Requirement | Priority |
|----|------------|----------|
| FR-4.1 | The system SHALL detect the following failure types and classify them: | P0 |

| Failure Type | Detection Method | Classification |
|-------------|-----------------|----------------|
| **Empty Response** | Output is empty string or whitespace-only | `EMPTY_OUTPUT` |
| **Malformed Output** | JSON parse failure when structured output expected | `PARSE_ERROR` |
| **Hallucination Markers** | LLM output contains disclaimer phrases ("As an AI...", "I cannot...", "I don't have access...") | `HALLUCINATION` |
| **Timeout** | Step execution exceeds 60s | `TIMEOUT` |
| **API Error (4xx)** | HTTP 400-499 from tool/LLM | `CLIENT_ERROR` |
| **API Error (5xx)** | HTTP 500-599 from tool/LLM | `SERVER_ERROR` |
| **Rate Limit** | HTTP 429 or rate limit error from provider | `RATE_LIMITED` |
| **Token Limit** | Context exceeds model's max tokens | `TOKEN_OVERFLOW` |
| **Quality Failure** | LLM validator judges output as inadequate | `QUALITY_FAIL` |
| **Connection Error** | Network timeout, DNS failure, connection refused | `CONNECTION_ERROR` |

| FR-4.2 | Each detected failure SHALL be logged as an `ErrorEntry` containing: `timestamp`, `step_id`, `error_type` (from above), `error_message`, `raw_response`, `attempt_number`. | P0 |
| FR-4.3 | The system SHALL use an LLM-based validator node to assess step output quality. The validator SHALL return a structured verdict: `pass`, `retry`, or `reflect` with a reason string. | P0 |
| FR-4.4 | The validator SHALL check for: (a) relevance to step description, (b) completeness (not partial), (c) consistency with prior step context, (d) factual plausibility. | P1 |

---

### FR-5: Retry & Fallback

| ID | Requirement | Priority |
|----|------------|----------|
| FR-5.1 | On transient failures (`SERVER_ERROR`, `RATE_LIMITED`, `TIMEOUT`, `CONNECTION_ERROR`), the system SHALL retry the failed operation with exponential backoff: `delay = min(base * 2^attempt + jitter, max_delay)` where `base=1s`, `max_delay=30s`, `jitter=random(0,1)`. | P0 |
| FR-5.2 | Maximum retry count per step SHALL be 3. After 3 failed retries, the system SHALL escalate to the reflection node. | P0 |
| FR-5.3 | The system SHALL maintain an ordered LLM fallback chain: | P0 |

```
Primary:   OpenAI GPT-4o
Fallback1: OpenAI GPT-4o-mini
Fallback2: Anthropic Claude 3.5 Sonnet
```

| FR-5.4 | On LLM provider failure, the system SHALL automatically switch to the next provider in the fallback chain. The switch SHALL be logged in the execution trace with: original provider, fallback provider, reason for switch. | P0 |
| FR-5.5 | The system SHALL implement a circuit breaker per LLM provider: if failure rate exceeds 50% in the last 60 seconds (minimum 3 calls), the provider SHALL be marked as `OPEN` (unavailable) for 120 seconds before attempting a probe. | P1 |
| FR-5.6 | Circuit breaker states SHALL be: `CLOSED` (normal) → `OPEN` (failing, skip) → `HALF_OPEN` (probe with single request). | P1 |
| FR-5.7 | On `QUALITY_FAIL` verdict from validator, the system SHALL retry with an enhanced prompt that includes the failed output and the validator's reason. This counts as a retry attempt. | P0 |
| FR-5.8 | On `TOKEN_OVERFLOW`, the system SHALL truncate context to the most recent 3 step results and retry, rather than failing immediately. | P1 |

---

### FR-6: State Persistence

| ID | Requirement | Priority |
|----|------------|----------|
| FR-6.1 | The system SHALL persist the full `AgentState` to Redis after each of the following events: (a) planning complete, (b) step execution complete, (c) retry attempt, (d) reflection complete, (e) task finalized. | P0 |
| FR-6.2 | State checkpoints SHALL be stored with key pattern: `task:{task_id}:state` with a TTL of 24 hours. | P0 |
| FR-6.3 | The system SHALL support resuming a task from the last checkpoint if execution is interrupted (server restart, crash). Resume SHALL be triggered via `POST /tasks/{task_id}/resume`. | P1 |
| FR-6.4 | Individual step statuses SHALL be stored separately at `task:{task_id}:step:{step_index}:status` for efficient WebSocket updates without reading full state. | P1 |
| FR-6.5 | The system SHALL publish state change events to Redis Pub/Sub channel `task:{task_id}:events` for real-time frontend consumption. | P0 |
| FR-6.6 | If Redis is unavailable, the system SHALL fall back to in-memory dict storage with a warning logged. This fallback SHALL NOT support resume or multi-instance deployment. | P1 |
| FR-6.7 | State serialization format SHALL be JSON. All datetime fields SHALL be ISO 8601 strings. | P0 |

---

### FR-7: Reflection & Self-Correction

| ID | Requirement | Priority |
|----|------------|----------|
| FR-7.1 | When a step exhausts all retry attempts (3) OR receives a `reflect` verdict from the validator, the system SHALL invoke the Reflector node. | P0 |
| FR-7.2 | The Reflector node SHALL analyze the failure context (step description, failed output, error log, prior context) and produce ONE of four actions: | P0 |

| Action | Behavior |
|--------|----------|
| `MODIFY_STEP` | Rewrite the step description/prompt for better results. Reset retry counter. Re-execute. |
| `SKIP_STEP` | Mark step as skipped with a partial/substitute result. Advance to next step. Reduce confidence score. |
| `DECOMPOSE` | Break the failed step into 2–3 smaller sub-steps. Insert into step list at current position. Execute sub-steps. |
| `ABORT` | Halt execution. Produce partial output from completed steps. Set task status to `failed`. |

| FR-7.3 | The Reflector SHALL output a structured JSON response: `{"action": "...", "reasoning": "...", "modified_step": "...", "sub_steps": [...]}`. | P0 |
| FR-7.4 | Reflection depth SHALL be limited to 2 per step (max 2 reflections before forced skip or abort). This prevents infinite reflection loops. | P0 |
| FR-7.5 | All reflection decisions and reasoning SHALL be logged in the execution trace as `ReflectionEntry` containing: `step_id`, `attempt`, `action_taken`, `reasoning`, `original_step`, `modified_step`. | P0 |
| FR-7.6 | The system SHOULD query FAISS vector memory for similar past failures before reflecting, providing historical context to the reflector prompt. | P2 |

---

### FR-8: Execution Trace & Visualization

| ID | Requirement | Priority |
|----|------------|----------|
| FR-8.1 | The system SHALL maintain a chronological execution trace for each task, stored as a list of `TraceEntry` objects. | P0 |
| FR-8.2 | Each `TraceEntry` SHALL contain: | P0 |

```python
class TraceEntry:
    timestamp: str          # ISO 8601
    event_type: str         # "step_started" | "step_completed" | "step_failed" | 
                            # "retry_triggered" | "fallback_triggered" | 
                            # "reflection_started" | "reflection_completed" |
                            # "tool_called" | "checkpoint_saved" | "task_completed"
    step_id: Optional[str]
    step_name: Optional[str]
    details: dict           # Event-specific payload
    duration_ms: Optional[int]
    tokens_used: Optional[int]
    model_used: Optional[str]
    error: Optional[str]
```

| FR-8.3 | The execution trace SHALL be queryable via `GET /traces/{task_id}` returning the full trace as a JSON array. | P0 |
| FR-8.4 | The frontend SHALL render the execution trace as: (a) a visual DAG showing step flow with color-coded statuses, (b) a vertical timeline with expandable entries, (c) a metrics summary bar. | P0 |
| FR-8.5 | The DAG visualization SHALL show: retry loops (curved arrows back to same node), reflection branches (side nodes), fallback indicators (provider label on edges). | P1 |
| FR-8.6 | Timeline entries SHALL be expandable to show: full prompt sent, full response received, token count, latency, model used. | P1 |
| FR-8.7 | The metrics bar SHALL display: total tokens used, estimated cost ($), total execution time, retry count, fallback count, reflection count, final confidence score. | P1 |
| FR-8.8 | The frontend SHALL receive trace updates in real-time via WebSocket, appending new entries as they occur without page refresh. | P0 |

---

## 2. Non-Functional Requirements

### NFR-1: Reliability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-1.1 | The system SHALL complete tasks successfully ≥85% of the time for well-formed inputs, even under simulated failure conditions (chaos mode). | 85% success rate |
| NFR-1.2 | The system SHALL gracefully degrade — never crash or return unhandled exceptions to the user. All errors SHALL result in structured error responses. | Zero unhandled crashes |
| NFR-1.3 | The system SHALL produce partial results when full task completion is impossible, rather than returning nothing. Partial results SHALL include all completed step outputs and a confidence score. | Always partial output |
| NFR-1.4 | The system SHALL survive individual LLM provider outages without task failure, provided at least one provider in the fallback chain is available. | Single-provider fault tolerance |
| NFR-1.5 | The system SHALL log all errors with sufficient context for debugging: timestamp, request ID, step ID, error type, stack trace (internal), user-facing message (external). | Full error traceability |
| NFR-1.6 | WebSocket connections SHALL auto-reconnect within 3 seconds on disconnect. | 3s reconnect SLA |

---

### NFR-2: Scalability (Basic Level)

| ID | Requirement | Target |
|----|------------|--------|
| NFR-2.1 | The system SHALL handle at least 5 concurrent task executions without degradation. | 5 concurrent tasks |
| NFR-2.2 | The system SHALL process task inputs up to 2000 characters without truncation. | 2000 char input |
| NFR-2.3 | The system SHALL handle task plans with up to 15 steps without memory or timeout issues. | 15 steps/task |
| NFR-2.4 | The system SHALL use async I/O for all external calls (LLM, tools, Redis) to avoid blocking the event loop. | Non-blocking I/O |
| NFR-2.5 | Redis memory usage SHALL not exceed 100MB under normal operation (assumes <100 active tasks with 24h TTL). | <100MB Redis |
| NFR-2.6 | FAISS index size SHALL not exceed 50MB (sufficient for ~50K embeddings). | <50MB FAISS |

---

### NFR-3: Latency Constraints

| ID | Requirement | Target |
|----|------------|--------|
| NFR-3.1 | Task planning (decomposition) SHALL complete within 10 seconds for typical inputs. | <10s planning |
| NFR-3.2 | Individual step execution SHALL complete within 60 seconds (hard timeout). | <60s per step |
| NFR-3.3 | End-to-end task execution (5-step task) SHALL complete within 5 minutes under normal conditions. | <5 min for 5 steps |
| NFR-3.4 | Frontend SHALL display the first step status update within 2 seconds of task submission. | <2s first update |
| NFR-3.5 | WebSocket event delivery latency (backend event → frontend render) SHALL be under 500ms. | <500ms WS latency |
| NFR-3.6 | API response time for non-execution endpoints (`GET /tasks`, `GET /traces`) SHALL be under 200ms. | <200ms API reads |
| NFR-3.7 | Retry backoff delays SHALL NOT count against the step timeout. Each retry attempt gets a fresh 60s window. | Independent timeouts |

---

### NFR-4: Fault Tolerance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-4.1 | The system SHALL tolerate Redis downtime by falling back to in-memory state storage. Tasks in progress during Redis failure SHALL continue executing. | Redis-down tolerance |
| NFR-4.2 | The system SHALL tolerate FAISS unavailability by skipping vector memory enrichment. Step execution SHALL proceed without memory context. | FAISS-optional |
| NFR-4.3 | The system SHALL tolerate Tavily API downtime by falling back to LLM-only reasoning for web search steps. | Search-fallback |
| NFR-4.4 | The system SHALL handle malformed LLM responses without crashing. JSON parsing errors SHALL trigger a retry with a stricter prompt. | Malformed-input safe |
| NFR-4.5 | Frontend SHALL remain functional if WebSocket connection fails, falling back to periodic polling (`GET /tasks/{id}` every 3 seconds). | WS-fallback to polling |
| NFR-4.6 | The system SHALL enforce resource limits: max 500K tokens per task, max 15 steps per plan, max 30 minutes total execution time. Hard kill on exceeding limits. | Resource bounded |

---

## 3. User Stories

### US-1: Basic Task Execution

> **As a** user,  
> **I want to** submit a complex task in natural language and have the agent break it into steps and execute them automatically,  
> **So that** I can accomplish multi-step work without manually coordinating each stage.

**Scenario:** User submits "Research the top 5 AI startups funded in 2025, compare their valuations, and write a summary report."  
**Expected:** Agent decomposes into: (1) search for AI startups funded in 2025, (2) extract top 5 by valuation, (3) compare valuations, (4) write summary report. Each step executes sequentially, producing a final compiled report.

---

### US-2: Transparent Execution Monitoring

> **As a** user,  
> **I want to** see each step's progress in real-time with status indicators,  
> **So that** I know exactly what the agent is doing and how far along it is.

**Scenario:** User submits a 6-step task. The dashboard shows 6 step cards. As the agent works, each card transitions: ⏳ pending → 🔄 running (with spinner) → ✅ success (green). The user sees step 3 is currently running while steps 1-2 are complete.  
**Expected:** Real-time WebSocket updates render status changes within 500ms. No page refresh needed.

---

### US-3: Automatic Retry on Transient Failure

> **As a** user,  
> **I want** the agent to automatically retry when an API call fails temporarily,  
> **So that** transient errors don't cause my entire task to fail.

**Scenario:** During step 2, the OpenAI API returns a 503 (Service Unavailable). The step card shows a 🔁 retry indicator with "Attempt 2/3". After a 2-second backoff, the step re-executes successfully.  
**Expected:** User sees retry happening in real-time. The step completes on attempt 2. Execution trace shows: attempt 1 (failed, 503), backoff 2.3s, attempt 2 (success).

---

### US-4: LLM Provider Fallback

> **As a** user,  
> **I want** the agent to switch to a backup AI model if the primary one is down,  
> **So that** my task completes even during provider outages.

**Scenario:** OpenAI is experiencing an outage. Step 1 fails with GPT-4o (connection error). The system automatically tries GPT-4o-mini (also fails). It switches to Claude 3.5 Sonnet (succeeds). The step card shows a small badge: "Fallback: Claude 3.5 Sonnet".  
**Expected:** User's task completes successfully. Metrics bar shows "1 fallback used". Trace shows the full fallback chain with timing.

---

### US-5: Self-Reflection and Recovery

> **As a** user,  
> **I want** the agent to analyze why a step failed and try a different approach,  
> **So that** the system can solve problems it couldn't handle on the first attempt.

**Scenario:** User asks "Write a Python script to scrape product prices from Amazon." Step 3 (scraping) fails 3 times because Amazon blocks automated requests. The reflector analyzes the failure and chooses `MODIFY_STEP`: rewrites the step to "Use a search API to find Amazon product prices instead of direct scraping." The modified step succeeds.  
**Expected:** Step card shows reflection indicator with reasoning visible in expanded view. Trace shows: 3 failed attempts → reflection → modified step → success.

---

### US-6: Partial Result Delivery

> **As a** user,  
> **I want** to receive whatever results were completed if the agent can't finish every step,  
> **So that** I get some value even when full execution isn't possible.

**Scenario:** A 5-step research task completes steps 1-3 successfully. Step 4 fails terminally (all retries + reflection exhausted). The agent aborts step 4, skips step 5 (depends on 4), and produces a partial report using steps 1-3 results. Confidence score: "Medium (3/5 steps completed)".  
**Expected:** User gets a partial but useful report. Failed/skipped steps are clearly marked. The system does NOT return nothing.

---

### US-7: Execution Trace Deep-Dive

> **As a** user,  
> **I want to** inspect the full execution trace including prompts, responses, and timing,  
> **So that** I can understand the agent's reasoning and debug issues.

**Scenario:** User clicks on a completed step in the timeline. An expanded view shows: the exact prompt sent to the LLM (with context injected), the raw response, token count (892 tokens), latency (3.2s), model used (GPT-4o), and validation verdict ("pass — output is relevant and complete").  
**Expected:** Full transparency. Every decision the agent made is inspectable. No black boxes.

---

### US-8: Cost & Resource Awareness

> **As a** user,  
> **I want to** see the total token usage and estimated cost for my task,  
> **So that** I can be aware of resource consumption.

**Scenario:** After task completion, the metrics bar shows: "Total tokens: 12,847 | Est. cost: $0.19 | Time: 2m 34s | Retries: 2 | Fallbacks: 0 | Reflections: 1 | Confidence: High".  
**Expected:** Metrics are accurate and update in real-time during execution.

---

### US-9: Chaos Mode Demonstration

> **As a** demo presenter,  
> **I want to** enable chaos mode to deliberately inject failures during execution,  
> **So that** I can showcase the system's reliability features to judges.

**Scenario:** Presenter toggles "Chaos Mode" in the UI. The next task execution experiences: artificial 5s latency on step 2, an empty response on step 3 (triggers retry), and a simulated rate limit on step 4 (triggers fallback). The system handles all injected failures gracefully — retrying, falling back, and ultimately completing the task.  
**Expected:** Judges watch the system fail and recover in real-time, demonstrating retry, fallback, and trace visibility working together.

---

### US-10: Task Resume After Interruption

> **As a** user,  
> **I want to** resume a task that was interrupted (server restart, network issue),  
> **So that** I don't lose progress on multi-step tasks.

**Scenario:** A 7-step task is on step 4 when the server restarts. User calls `POST /tasks/{id}/resume`. The system loads the checkpoint from Redis, identifies that steps 1-3 are complete with cached results, and resumes execution from step 4.  
**Expected:** Steps 1-3 are not re-executed. Step 4 begins fresh. Execution trace shows a gap (interruption) and resume event.

---

## 4. Acceptance Criteria

### AC-1: Task Planning & Decomposition

| Criteria | Test |
|----------|------|
| AC-1.1 | Submit "Research quantum computing advances and write a summary" → Returns 3–7 structured steps within 10 seconds. |
| AC-1.2 | Each step has all required fields (`step_id`, `name`, `description`, `tool_needed`, `dependencies`). |
| AC-1.3 | Steps are in valid dependency order — no step references an unresolved dependency. |
| AC-1.4 | Submit empty string → Returns 400 error with message "Task description is required". |
| AC-1.5 | Submit 5000-char input → Returns 400 error with message "Task description exceeds 2000 character limit". |
| AC-1.6 | If LLM returns malformed JSON, system retries up to 2 times. Verified by injecting a malformed response mock. |

---

### AC-2: Step Execution

| Criteria | Test |
|----------|------|
| AC-2.1 | A 3-step task executes all steps in order. Each `StepResult` has non-empty `output`, valid `status`, and positive `latency_ms`. |
| AC-2.2 | Step 2's prompt includes Step 1's result as context. Verified by inspecting trace entry prompts. |
| AC-2.3 | A step that takes >60 seconds is killed and marked as `TIMEOUT`. Verified with a `sleep(65)` mock. |
| AC-2.4 | Final `AgentState` has `status: "completed"` and all step results populated. |

---

### AC-3: Retry & Fallback

| Criteria | Test |
|----------|------|
| AC-3.1 | Inject a 503 error on attempt 1 of step 2. System retries. Step succeeds on attempt 2. `retry_count` = 1 in `StepResult`. |
| AC-3.2 | Inject 503 errors on all 3 attempts. System escalates to reflector. `retry_count` = 3. |
| AC-3.3 | Mock OpenAI as unavailable. System falls back to Claude. `model_used` shows Claude model. Trace has `fallback_triggered` event. |
| AC-3.4 | Mock all LLM providers as unavailable. System returns structured error with partial results (if any steps completed). |
| AC-3.5 | Verify exponential backoff timing: attempt 1 delay ~1s, attempt 2 delay ~2-3s, attempt 3 delay ~4-5s (with jitter). |

---

### AC-4: Reflection & Self-Correction

| Criteria | Test |
|----------|------|
| AC-4.1 | After 3 failed retries, reflector is invoked. Trace shows `reflection_started` event. |
| AC-4.2 | Reflector returns `MODIFY_STEP` → step description is updated → retry counter resets → step re-executes with new description. |
| AC-4.3 | Reflector returns `SKIP_STEP` → step marked as `skipped` → next step executes → confidence score reduced. |
| AC-4.4 | Reflector returns `DECOMPOSE` → 2-3 sub-steps inserted → sub-steps execute sequentially. |
| AC-4.5 | Reflector returns `ABORT` → task status set to `failed` → partial results returned with completed step outputs. |
| AC-4.6 | Reflection depth limit: after 2 reflections on same step, system forces `SKIP_STEP` or `ABORT`. No infinite loops. |

---

### AC-5: State Persistence

| Criteria | Test |
|----------|------|
| AC-5.1 | After step 2 completes, `Redis GET task:{id}:state` returns valid JSON with 2 completed step results. |
| AC-5.2 | Kill the FastAPI server mid-execution. Restart. Call `POST /tasks/{id}/resume`. Execution continues from last checkpoint. |
| AC-5.3 | State TTL: after 24 hours, `Redis GET task:{id}:state` returns `nil`. |
| AC-5.4 | Stop Redis. System continues operating with in-memory state. Warning logged. |

---

### AC-6: Execution Trace

| Criteria | Test |
|----------|------|
| AC-6.1 | `GET /traces/{task_id}` returns JSON array of `TraceEntry` objects in chronological order. |
| AC-6.2 | A successful 3-step task trace contains at minimum: `task_started`, 3x `step_started`, 3x `step_completed`, `task_completed` events. |
| AC-6.3 | A task with 1 retry contains additional: `step_failed`, `retry_triggered`, `step_started` (retry) events. |
| AC-6.4 | Trace entries with `event_type: "step_completed"` include `tokens_used` and `model_used`. |

---

### AC-7: Frontend & Visualization

| Criteria | Test |
|----------|------|
| AC-7.1 | Submit task → step cards appear within 2 seconds → statuses update in real-time. |
| AC-7.2 | Step cards show correct status badges: pending (gray), running (blue pulse), success (green), failed (red), retrying (orange), reflecting (purple). |
| AC-7.3 | Metrics bar displays non-zero values for: tokens, cost, time, retries (if any). |
| AC-7.4 | Timeline entries are expandable. Clicking shows prompt, response, timing. |
| AC-7.5 | UI is responsive at 1920x1080 (presentation) and 1440x900 (laptop) resolutions. |
| AC-7.6 | Dark mode renders without color contrast issues. Text is readable on all backgrounds. |

---

### AC-8: Chaos Mode

| Criteria | Test |
|----------|------|
| AC-8.1 | Enable chaos mode. Run a 5-step task. At least 2 steps experience injected failures. |
| AC-8.2 | Despite injected failures, task completes (possibly with reduced confidence). |
| AC-8.3 | Trace clearly shows which failures were injected vs organic. |

---

## 5. Constraints

### 5.1 Time Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| **36-hour hackathon window** | Cannot build enterprise features | Focus on critical path (planning → execution → retry → trace); cut P2 features |
| **Feature freeze at Hour 30** | No new code after H30 | Plan for 6 hours of testing, docs, and demo prep |
| **Demo time: ~5 minutes** | Must tell compelling story quickly | Pre-built scenarios; chaos mode toggle for instant drama |
| **Setup time for judges: ~2 minutes** | Must be trivial to run | Docker Compose single command; `.env.example` with clear instructions |

---

### 5.2 Infrastructure Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| **No cloud deployment required** | System runs locally only | Docker Compose for portability; test on 2+ machines |
| **Free-tier API keys** | Rate limits (OpenAI: 3 RPM on free, Tavily: 1000/mo) | Aggressive caching; fallback chain; cached demo results |
| **No GPU available** | Cannot run local LLMs | Use hosted APIs exclusively (OpenAI, Anthropic) |
| **Single-machine Redis** | No clustering | Sufficient for hackathon; in-memory fallback if Redis dies |
| **FAISS (local, not Pinecone)** | No persistence across restarts | Rebuild index on startup from Redis-stored documents; P2 feature anyway |

---

### 5.3 Technical Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| **LLM output non-determinism** | Same prompt → different outputs | JSON mode for structured output; validator node catches drift |
| **LLM context window limits** | Cannot send entire execution history | Rolling context: last 3 step results + current step + memory query |
| **LangGraph learning curve** | Team may be unfamiliar | Start with linear graph; add conditional edges incrementally; documented patterns |
| **Python GIL** | CPU-bound tasks block event loop | Use `asyncio` for I/O; `subprocess` for code execution; no CPU-heavy processing |
| **WebSocket scaling** | Single-server WS doesn't scale | Sufficient for hackathon; Redis Pub/Sub enables future multi-server support |

---

### 5.4 Scope Constraints (Explicit Non-Goals)

The following are **explicitly out of scope** for this MVP:

| Non-Goal | Reason |
|----------|--------|
| User authentication / multi-tenancy | No time; single-user demo system |
| Persistent database (PostgreSQL) | Redis + in-memory sufficient for demo |
| Production deployment (AWS/GCP) | Judges run locally |
| Multi-agent collaboration | Single-agent is hard enough in 36h |
| Custom tool creation by users | Pre-built tool set only |
| Streaming LLM responses | Batch responses simpler; stream is P2 |
| Mobile responsiveness | Desktop/projector only |
| Internationalization | English only |
| Comprehensive test suite | Manual + smoke tests; no 90% coverage goal |

---

## 6. Glossary

| Term | Definition |
|------|-----------|
| **AgentState** | The complete state object (TypedDict) flowing through the LangGraph DAG, containing all task data, step results, traces, and metadata. |
| **Step** | A single discrete unit of work within a decomposed task plan. Has a description, required tool, and produces one output. |
| **Node** | A function in the LangGraph DAG that processes AgentState and returns modified state. Examples: Planner, Executor, Validator, Reflector, Finalizer. |
| **Trace** | A chronological log of all events during task execution — every LLM call, tool invocation, retry, fallback, and reflection. |
| **Reflection** | The process by which the agent analyzes a failed step and decides on a recovery strategy (modify, skip, decompose, or abort). |
| **Circuit Breaker** | A fault-tolerance pattern that stops calling a failing service after repeated failures, preventing cascade failures. States: Closed → Open → Half-Open. |
| **Fallback Chain** | An ordered list of LLM providers/models to try sequentially when the primary provider fails. |
| **Checkpoint** | A snapshot of AgentState saved to Redis at key execution points, enabling task resume after interruption. |
| **Chaos Mode** | A testing/demo feature that randomly injects failures (latency, errors, empty responses) to showcase the system's reliability mechanisms. |
| **DAG** | Directed Acyclic Graph — the structure of the LangGraph workflow defining node execution order and conditional branching. |
| **Confidence Score** | A metric (High/Medium/Low) computed by the finalizer based on: steps completed, retries needed, reflections used, and validator pass rate. |

---

> **Document End.** This requirements document serves as the contract between architecture/design and implementation. All P0 requirements are mandatory for MVP. P1 requirements are expected. P2 requirements are cut-first candidates if behind schedule.
