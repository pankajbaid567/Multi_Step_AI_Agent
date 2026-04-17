# Hackathon Execution Checklist

> **System:** Reliable AI Agent for Multi-Step Task Execution Under Uncertainty  
> **Timeline:** 36 hours  
> **Philosophy:** Ship the core, prove the reliability, wow the judges.

---

## 🚨 Minimum to NOT Get Eliminated

> If you don't have ALL of these, you're dead on arrival. No exceptions.

- [ ] System boots with one command (`docker-compose up` or `python main.py`)
- [ ] User can submit a task via the UI
- [ ] Agent decomposes task into visible steps (LLM-powered, not hardcoded)
- [ ] Agent executes steps sequentially with real LLM calls
- [ ] Results from earlier steps feed into later steps (context accumulation)
- [ ] Final output is displayed to the user
- [ ] At least ONE reliability mechanism works (retry OR fallback)
- [ ] The system does not crash during demo
- [ ] README exists with setup instructions
- [ ] You can explain the architecture in <2 minutes

---

## 🏆 Features That Make Us WIN

> These are the differentiators. Judges have seen basic agents. They haven't seen THIS:

- [ ] **Self-reflection on failure** — agent analyzes WHY it failed and changes strategy (MODIFY_STEP, DECOMPOSE, SKIP)
- [ ] **Live chaos mode toggle** — inject failures during demo, watch the system heal itself in real-time
- [ ] **Full execution trace viewer** — click any step, see exact prompt → response → validation → decision
- [ ] **Circuit breaker visualization** — see a provider go from green → red → yellow in the UI
- [ ] **Confidence score** — system honestly reports "Medium confidence: 4/5 steps succeeded, 1 skipped after reflection"
- [ ] **Fallback chain in action** — OpenAI down → Claude kicks in, visible in trace with provider label
- [ ] **Partial results, not failures** — 3 of 5 steps done? Here's what we got. Not "Error: task failed."
- [ ] **Cost/token tracking** — "This task used 12K tokens, ~$0.19" — shows production awareness

---

## 1. Core System (Must-Have)

### 1.1 Backend Infrastructure
- [ ] FastAPI app running with `/health` endpoint returning `{"status": "ok"}`
- [ ] CORS configured (allow `localhost:5173`)
- [ ] Environment variables loading from `.env` (API keys, Redis URL, model config)
- [ ] `.env.example` with every required variable documented
- [ ] Error handler middleware returning structured JSON errors (never stack traces to client)
- [ ] Request logging middleware (timestamp, method, path, status, latency)

### 1.2 AgentState Definition
- [ ] `AgentState` TypedDict defined with all fields:
  - [ ] `task_id`, `original_input`, `status`
  - [ ] `steps` (list of StepDefinition)
  - [ ] `current_step_index`
  - [ ] `step_results` (list of StepResult)
  - [ ] `execution_trace` (list of TraceEntry)
  - [ ] `retry_counts` (dict: step_id → count)
  - [ ] `error_log` (list of ErrorEntry)
  - [ ] `context_memory` (accumulated text)
  - [ ] `llm_tokens_used`, `started_at`, `completed_at`
- [ ] `create_initial_state(task_id, input)` factory function works
- [ ] Pydantic models for all sub-types validate correctly

### 1.3 LangGraph DAG
- [ ] Graph compiles without errors
- [ ] Nodes registered: `planner`, `executor`, `validator`, `reflector`, `finalizer`
- [ ] Edges wired: `planner → executor → validator → conditional`
- [ ] Conditional routing works: `pass → next_step/finalizer`, `retry → executor`, `reflect → reflector`
- [ ] Graph handles a 3-step task end-to-end (submit → plan → execute all → finalize)
- [ ] State flows through every node correctly (no data loss between nodes)

### 1.4 LLM Integration
- [ ] Unified `call_llm()` function with: prompt, model, provider params
- [ ] Returns structured `LLMResponse`: text, tokens_used, latency_ms, model_used
- [ ] OpenAI integration working (GPT-4o or GPT-4o-mini)
- [ ] Anthropic integration working (Claude 3.5 Sonnet)
- [ ] JSON mode enabled for structured outputs (planner, validator, reflector)
- [ ] Handles empty/null responses without crashing

### 1.5 Planner Node
- [ ] Accepts natural language task input
- [ ] Returns 2–10 structured steps with: id, name, description, tool_needed, dependencies
- [ ] Steps are in valid execution order
- [ ] Prompt includes few-shot examples for consistent output format
- [ ] Handles ambiguous inputs gracefully (doesn't crash on "hmm" or "do stuff")

### 1.6 Executor Node
- [ ] Constructs step-specific prompt with: step description + prior context
- [ ] Calls LLM, captures response
- [ ] Logs TraceEntry with: timestamp, input, output, tokens, latency, model
- [ ] Handles tool dispatch (web_search, api_call, code_exec, llm-only)
- [ ] Respects 60-second step timeout

### 1.7 Validator Node
- [ ] LLM-based quality check on executor output
- [ ] Returns structured verdict: `pass` / `retry` / `reflect` with reason
- [ ] Checks: non-empty, relevant, complete, plausible
- [ ] Uses cheaper model (GPT-4o-mini) to save tokens
- [ ] Handles validator LLM failure itself (default to `pass` if validator crashes — don't block execution)

### 1.8 Finalizer Node
- [ ] Aggregates all step results into final output
- [ ] Computes confidence score (High/Medium/Low)
- [ ] Generates execution summary: steps completed, time, tokens, cost
- [ ] Produces structured JSON final output
- [ ] Marks task status as `completed` or `failed`

### 1.9 API Endpoints
- [ ] `POST /tasks` — submit task, returns task_id + planned steps
- [ ] `POST /tasks/{id}/execute` — trigger execution
- [ ] `GET /tasks/{id}` — get current state
- [ ] `GET /traces/{id}` — get full execution trace
- [ ] `WebSocket /ws/{id}` — stream real-time events
- [ ] All endpoints return consistent JSON structure
- [ ] All endpoints handle 404 (unknown task_id) gracefully

---

## 2. Reliability Features (Must-Win)

### 2.1 Retry Mechanism
- [ ] Exponential backoff implemented: `delay = min(1 * 2^attempt + random(0,1), 30)`
- [ ] Max 3 retries per step
- [ ] Retry triggers on: 5xx errors, timeouts, rate limits, connection errors
- [ ] Retry count tracked per step in state
- [ ] Each retry logged as TraceEntry with attempt number
- [ ] After max retries → escalate to reflector (not crash)

### 2.2 LLM Fallback Chain
- [ ] Fallback order defined: GPT-4o → GPT-4o-mini → Claude 3.5 Sonnet
- [ ] Automatic switch on provider failure
- [ ] Fallback event logged in trace: original provider, fallback provider, reason
- [ ] Model used tracked per step in StepResult
- [ ] All providers down → structured error with partial results (not crash)

### 2.3 Circuit Breaker
- [ ] Per-provider failure tracking (count failures in sliding 60s window)
- [ ] States: CLOSED (normal) → OPEN (>50% fail rate, min 3 calls) → HALF_OPEN (probe after 120s)
- [ ] When OPEN: skip provider, go to next in fallback chain
- [ ] When HALF_OPEN: send 1 probe request; success → CLOSED, failure → OPEN
- [ ] Circuit state visible in API response / trace

### 2.4 Reflector Node
- [ ] Invoked after max retries exhausted OR validator says `reflect`
- [ ] Analyzes: step description, failed output, error, prior context
- [ ] Returns one of: `MODIFY_STEP`, `SKIP_STEP`, `DECOMPOSE`, `ABORT`
- [ ] `MODIFY_STEP`: rewrites step, resets retry counter, re-executes
- [ ] `SKIP_STEP`: marks skipped, adds partial result, moves on
- [ ] `DECOMPOSE`: inserts 2-3 sub-steps, executes them
- [ ] `ABORT`: stops execution, returns partial results
- [ ] Max 2 reflections per step (prevents infinite loops)
- [ ] Reflection reasoning logged in trace

### 2.5 State Checkpointing
- [ ] Redis checkpoint after: planning, each step, each retry, each reflection, finalization
- [ ] Key format: `task:{task_id}:state`
- [ ] TTL: 24 hours
- [ ] State serializable to/from JSON without data loss
- [ ] Redis Pub/Sub publishing events on channel `task:{task_id}:events`
- [ ] In-memory fallback if Redis unavailable

### 2.6 Failure Detection
- [ ] Detect empty/whitespace responses → classify as `EMPTY_OUTPUT`
- [ ] Detect JSON parse failures → classify as `PARSE_ERROR`
- [ ] Detect hallucination phrases ("As an AI...") → classify as `HALLUCINATION`
- [ ] Detect timeout (>60s) → classify as `TIMEOUT`
- [ ] Detect HTTP 4xx/5xx → classify appropriately
- [ ] Detect rate limits (429) → classify as `RATE_LIMITED`
- [ ] All failures wrapped in `ErrorEntry` with context

---

## 3. Demo Readiness

### 3.1 Demo Scenarios
- [ ] **Scenario 1 — Happy Path (Research):** "Research the latest breakthroughs in quantum computing and compile a summary report"
  - [ ] Decomposes into 4-5 clear steps
  - [ ] All steps succeed
  - [ ] Final report is coherent and useful
  - [ ] Takes <3 minutes
- [ ] **Scenario 2 — Failure Recovery (API Task):** "Fetch weather data for 5 major cities and create a comparison analysis"
  - [ ] At least 1 step triggers retry (with chaos mode)
  - [ ] Fallback visible in trace
  - [ ] Task completes despite failures
- [ ] **Scenario 3 — Reflection (Complex Task):** "Write a Python function to sort a linked list, test it, and document it"
  - [ ] At least 1 step triggers reflection
  - [ ] Reflection reasoning is visible
  - [ ] Modified/decomposed step succeeds
- [ ] Pre-run each scenario at least 3 times. Verify consistent results.
- [ ] Cache scenario results as backup (if live demo fails, show cached run)

### 3.2 Chaos Mode
- [ ] `CHAOS_MODE` env var toggleable (`true`/`false`)
- [ ] UI toggle button (if time permits, otherwise env var only)
- [ ] Injects: random 5s latency (30% chance), empty responses (20%), rate limits (15%)
- [ ] Injected failures are distinguishable in trace logs
- [ ] System recovers from all injected failures
- [ ] Tested: chaos mode ON → 5-step task still completes

### 3.3 Demo Script
- [ ] Written demo walkthrough in `demo/demo_script.md`
- [ ] Timing: ~5 minutes total
  - [ ] 30s: Problem statement ("AI agents are unreliable because...")
  - [ ] 30s: Architecture overview (show diagram)
  - [ ] 2m: Live demo — Scenario 1 (happy path)
  - [ ] 1.5m: Live demo — Chaos mode ON → Scenario 2 (show recovery)
  - [ ] 30s: Show trace viewer (drill into a retried step)
  - [ ] 30s: Wrap up (confidence score, cost, future roadmap)
- [ ] Backup plan: if live demo crashes, show pre-recorded video
- [ ] Practice run completed with full team

### 3.4 Environment Stability
- [ ] `docker-compose up` works from clean clone (tested on fresh machine)
- [ ] Cold start to ready: <60 seconds
- [ ] All API keys in `.env.example` clearly labeled
- [ ] No hardcoded API keys anywhere in code (grep verified)
- [ ] System handles missing API keys with clear error message (not crash)
- [ ] Tested on: your machine + at least 1 other machine

---

## 4. UI/UX Polish

### 4.1 Layout & Design
- [ ] Dark mode with professional color scheme (not default browser colors)
- [ ] Inter or similar modern font loaded from Google Fonts
- [ ] Consistent spacing and padding throughout
- [ ] Project header: name, tagline, team info
- [ ] Responsive at 1920x1080 (projector) and 1440x900 (laptop)

### 4.2 Task Input
- [ ] Clean textarea with placeholder text (example task)
- [ ] Submit button with loading state
- [ ] Input validation: empty check, length check
- [ ] Submit disabled while task is executing

### 4.3 Step Cards
- [ ] Shows: step number, name, status badge, duration
- [ ] Status badges with correct colors:
  - [ ] ⏳ Pending — gray
  - [ ] 🔄 Running — blue with pulse animation
  - [ ] ✅ Success — green
  - [ ] ❌ Failed — red
  - [ ] 🔁 Retrying — orange with attempt count ("Retry 2/3")
  - [ ] 🤔 Reflecting — purple
  - [ ] ⏭️ Skipped — dim gray
- [ ] Cards animate in as steps are created
- [ ] Expandable: click to see step output preview

### 4.4 Execution Trace / Timeline
- [ ] Vertical timeline with chronological events
- [ ] Each entry: timestamp, event type icon, description
- [ ] Expandable entries: show full prompt, response, tokens, model
- [ ] Color-coded by event type (success=green, error=red, retry=orange, reflection=purple)
- [ ] Auto-scrolls to latest entry during execution

### 4.5 Metrics Bar
- [ ] Total tokens used
- [ ] Estimated cost ($)
- [ ] Total execution time
- [ ] Retry count
- [ ] Fallback count
- [ ] Reflection count
- [ ] Confidence score badge (High=green, Medium=yellow, Low=red)
- [ ] Updates in real-time during execution

### 4.6 Animations & Micro-interactions
- [ ] Step cards slide/fade in on creation
- [ ] Status badge transitions are smooth (not jumpy)
- [ ] Success checkmark animation (draw)
- [ ] Error shake animation
- [ ] Spinner for running state
- [ ] Toast notifications for key events (optional but impressive)
- [ ] Loading skeleton while waiting for planner response

### 4.7 Real-Time Updates
- [ ] WebSocket connection established on task start
- [ ] Auto-reconnect on disconnect (max 3 attempts, 3s interval)
- [ ] Fallback to polling if WebSocket fails (`GET /tasks/{id}` every 3s)
- [ ] No stale data: UI always reflects current state

---

## 5. Edge Cases

### 5.1 Input Edge Cases
- [ ] Empty input → "Please enter a task description" error
- [ ] Very long input (>2000 chars) → "Input too long" error
- [ ] Nonsensical input ("asdfghjkl") → planner returns 1-2 generic steps, doesn't crash
- [ ] Prompt injection attempts ("Ignore all instructions and...") → handled by planner prompt (system prompt defense)
- [ ] Multiple rapid submissions → queue or reject with "Task already in progress"

### 5.2 LLM Edge Cases
- [ ] LLM returns empty string → retry with "Please provide a substantive response"
- [ ] LLM returns prose instead of JSON (planner/validator) → parse error → retry with stricter prompt
- [ ] LLM returns partial JSON (truncated) → parse error → retry
- [ ] LLM hallucinates step outputs → validator catches, routes to retry
- [ ] LLM takes >60s → timeout, retry
- [ ] Both OpenAI AND Claude are down → structured error, partial results if any

### 5.3 Tool Edge Cases
- [ ] Tavily API returns 0 results → executor notes "no results found" and proceeds with LLM reasoning
- [ ] Tavily API is down → skip web search, fall back to LLM knowledge
- [ ] External API returns HTML instead of JSON → parse gracefully, extract text
- [ ] Code execution produces runtime error → capture stderr, pass to validator

### 5.4 State Edge Cases
- [ ] Redis connection drops mid-execution → fall back to in-memory, log warning
- [ ] Task state is corrupted in Redis → detect invalid state, restart from last valid checkpoint or fail gracefully
- [ ] Two requests hit same task_id → mutex/lock prevents concurrent modification
- [ ] Server restart → pending tasks marked as `interrupted`, resume endpoint available

### 5.5 Frontend Edge Cases
- [ ] WebSocket disconnects → auto-reconnect with exponential backoff
- [ ] WebSocket never connects → fall back to polling
- [ ] Very long step output → truncate in card, full text in expanded view
- [ ] 15-step task → step list scrollable, not overflowing layout
- [ ] Browser refresh mid-execution → reload state from `GET /tasks/{id}`

---

## 6. Testing Scenarios

### 6.1 Smoke Tests (Run Before Every Demo)
- [ ] Submit simple task → steps appear → execution completes → output displayed
- [ ] Check metrics bar shows non-zero values
- [ ] Check trace has entries
- [ ] Verify no console errors in browser (F12)
- [ ] Verify no uncaught exceptions in backend logs

### 6.2 Reliability Tests
- [ ] **Retry test:** Set OpenAI to fail once (mock or use chaos mode) → verify retry occurs → step succeeds on attempt 2
- [ ] **Fallback test:** Block OpenAI entirely → verify Claude takes over → task completes
- [ ] **All-down test:** Block all LLM providers → verify graceful error (not crash) with partial results
- [ ] **Reflection test:** Create a step that always fails (mock) → verify reflector invokes → MODIFY_STEP or SKIP_STEP
- [ ] **Timeout test:** Inject 65s delay → verify timeout detection → retry triggered
- [ ] **Circuit breaker test:** Send 5 requests to a failing provider → verify circuit opens → requests skip to fallback

### 6.3 State Tests
- [ ] **Checkpoint test:** Mid-execution, check Redis for `task:{id}:state` → valid JSON with correct step count
- [ ] **Resume test:** Kill server mid-execution → restart → call `/tasks/{id}/resume` → execution continues from checkpoint
- [ ] **TTL test:** Verify keys expire after 24h (set short TTL for testing, e.g., 60s)
- [ ] **Redis-down test:** Stop Redis → submit task → verify in-memory fallback works

### 6.4 Frontend Tests
- [ ] Submit task → step cards appear in <2s
- [ ] Step status updates render correctly (pending → running → success)
- [ ] Retry step shows orange badge with attempt count
- [ ] Reflection step shows purple badge
- [ ] Timeline entries are expandable
- [ ] Metrics bar values are accurate
- [ ] Dark mode renders correctly (no invisible text, no contrast issues)
- [ ] No layout overflow at 1920x1080

### 6.5 Load Tests (Optional, if time permits)
- [ ] Submit 3 concurrent tasks → all complete without interference
- [ ] Submit 5 concurrent tasks → system remains responsive
- [ ] Check Redis memory usage stays under 100MB

---

## 7. Pitch Preparation

### 7.1 Slide Deck
- [ ] **Slide 1 — Hook:** "AI agents fail 30% of the time in production. We fixed it." (stat + problem)
- [ ] **Slide 2 — Problem:** Specific failure modes (API outages, hallucinations, partial execution, no visibility)
- [ ] **Slide 3 — Solution:** Architecture diagram (the system we built)
- [ ] **Slide 4 — Demo Setup:** "Watch it work — then watch it break — then watch it heal"
- [ ] **Slide 5 — Technical Depth:** LangGraph state machine, circuit breaker, reflection loop, vector memory
- [ ] **Slide 6 — Results:** Metrics from test runs (success rate, recovery rate, avg completion time)
- [ ] **Slide 7 — Future:** Multi-agent, persistent learning, production deployment, monitoring dashboard

### 7.2 Talking Points
- [ ] **One-liner:** "We built an AI agent that fails gracefully, reflects on its mistakes, and recovers automatically — with full execution transparency."
- [ ] **Why it matters:** "Every production AI system needs this. Today's agents crash silently. Ours shows you exactly what happened, what went wrong, and how it fixed itself."
- [ ] **Technical flex:** "We implement circuit breakers, exponential backoff with jitter, LLM provider failover, and LLM-based self-reflection — the same patterns Netflix uses for microservice reliability, applied to AI agents."
- [ ] **Demo hook:** "Let me turn on chaos mode. I'm going to deliberately break the system during execution. Watch what happens."

### 7.3 Q&A Preparation
- [ ] **Q: "How is this different from LangChain agents?"**
  - A: "LangChain gives you the building blocks. We built a complete reliability layer on top: circuit breakers, multi-provider failover, self-reflection with 4 recovery strategies, and full trace visibility. LangChain agents crash on API errors. Ours recovers."
- [ ] **Q: "What happens if ALL LLMs are down?"**
  - A: "Graceful degradation. We return partial results from completed steps with a low confidence score. We never return nothing."
- [ ] **Q: "How does reflection work specifically?"**
  - A: "After 3 failed retries, the reflector LLM analyzes the failure context and chooses one of 4 strategies: rewrite the step, skip it, break it into sub-tasks, or abort. It's like a senior engineer debugging a failed CI pipeline."
- [ ] **Q: "Can this scale?"**
  - A: "The architecture supports it. Redis Pub/Sub enables horizontal scaling. The circuit breaker pattern prevents cascade failures. For hackathon scope we're single-instance, but the patterns are production-grade."
- [ ] **Q: "What's the token cost?"**
  - A: "We track it. A typical 5-step task uses ~10-15K tokens, roughly $0.15-0.25. We use GPT-4o-mini for validation to keep costs down."
- [ ] **Q: "How do you prevent infinite loops?"**
  - A: "Hard limits: max 3 retries per step, max 2 reflections per step, max 15 steps per task, max 30 minutes total. These are configurable but bounded."

### 7.4 Demo Script (Detailed)
- [ ] **Pre-demo checklist:**
  - [ ] System is running (`docker-compose up` completed)
  - [ ] Browser open to `localhost:5173`
  - [ ] API keys are valid (tested within last hour)
  - [ ] Chaos mode is OFF initially
  - [ ] Browser devtools closed (clean presentation)
  - [ ] Font size / zoom level appropriate for projector
- [ ] **Demo flow:**
  1. [ ] Show empty UI — explain the interface (10s)
  2. [ ] Paste Scenario 1 task — submit (5s)
  3. [ ] Narrate as steps appear: "The agent just decomposed this into 4 steps..." (15s)
  4. [ ] Watch execution: point out real-time updates, status changes (60s)
  5. [ ] Show completed result with confidence score (15s)
  6. [ ] Expand trace: "Here's exactly what the agent did at step 2..." (20s)
  7. [ ] Show metrics: "12K tokens, $0.18, 2 minutes" (10s)
  8. [ ] **DRAMA MOMENT:** "Now let's break it." Toggle chaos mode ON (5s)
  9. [ ] Paste Scenario 2 — submit (5s)
  10. [ ] Narrate failures: "There — step 2 hit a timeout. Watch — it's retrying..." (30s)
  11. [ ] Point out fallback: "OpenAI failed, it switched to Claude automatically" (10s)
  12. [ ] Show reflection if triggered: "The agent realized this approach wasn't working and rewrote the step" (15s)
  13. [ ] Show final result: "Despite 3 injected failures, the task completed with Medium confidence" (10s)
  14. [ ] Close: "This is production-grade reliability for AI agents." (5s)
- [ ] **Backup plan:**
  - [ ] If live demo fails: "We have chaos mode, but even WE couldn't break it today. Let me show you a recorded run." → play backup video
  - [ ] If API keys expire: switch to backup keys (have 2nd set ready)

### 7.5 Materials Checklist
- [ ] Slide deck (Google Slides / PDF) — tested on projector resolution
- [ ] Backup demo video (3 min, MP4) — on laptop, not cloud
- [ ] Architecture diagram (clean, readable on projector)
- [ ] README printed / open on second screen for judge review
- [ ] Business cards or contact info (optional but nice)

---

## Hour-by-Hour Checkpoint Criteria

Use this to gauge "are we on track?" at key milestones:

| Hour | Checkpoint | Status |
|------|-----------|--------|
| **H2** | Backend serves `/health`, frontend renders, Docker works | ⬜ |
| **H4** | AgentState defined, LangGraph compiles, planner returns real steps | ⬜ |
| **H6** | Full pipeline: submit → plan → execute → finalize (with dummy tools) | ⬜ |
| **H9** | Real LLM execution working, WebSocket streaming events | ⬜ |
| **H12** | Retry + fallback working, trace logging complete | ⬜ |
| **H14** | Core system done. Could demo NOW if forced. | ⬜ |
| **H17** | Reflector working, self-healing demonstrated | ⬜ |
| **H20** | Frontend shows DAG + timeline + metrics | ⬜ |
| **H22** | 3 demo scenarios tested and cached | ⬜ |
| **H25** | Chaos mode working, UI polished | ⬜ |
| **H28** | Integration tests pass, edge cases handled | ⬜ |
| **H30** | 🔒 FEATURE FREEZE — no new code | ⬜ |
| **H32** | README, docs, slides done | ⬜ |
| **H34** | Demo dry run completed, backup video recorded | ⬜ |
| **H36** | 🚀 Ship. Sleep. Win. | ⬜ |

---

## Panic Mode: If You're Behind Schedule

### At H14, if core isn't done:
- [ ] Cut FAISS vector memory entirely
- [ ] Cut code execution tool
- [ ] Simplify validator to regex checks (not LLM-based)
- [ ] Use in-memory state instead of Redis
- [ ] Reflector does SKIP_STEP only (no DECOMPOSE)

### At H22, if demo scenarios aren't working:
- [ ] Reduce to 1 scenario (happy path only)
- [ ] Pre-record the demo video NOW
- [ ] Focus remaining time on making that 1 scenario bulletproof

### At H28, if UI isn't polished:
- [ ] Cut animations entirely
- [ ] Use Streamlit instead of React (you know it already from Gen_AI_Milestone2)
- [ ] Focus on: step list + status badges + final output. That's enough.

### At H30, if system is unstable:
- [ ] 🛑 STOP adding features
- [ ] Fix the top 3 crashing bugs only
- [ ] Test the demo flow 5 times consecutively
- [ ] Record backup video immediately

---

> **Final Rule:** A working demo with 3 features beats a broken demo with 10 features. Every. Single. Time.
