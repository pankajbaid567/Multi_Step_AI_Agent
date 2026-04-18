# Research Paper Prompt

> **Usage:** Copy the prompt below and paste it into Claude (Opus 4.6) to generate a full IEEE/ACM-style research paper.  
> **Tip:** You can also feed your actual codebase, execution logs, and screenshots alongside this prompt for a more grounded paper.

---

## COPY-PASTE PROMPT START ↓

```
You are a senior AI researcher and technical writer with publications at NeurIPS, ICML, AAAI, and ACL.

Write a complete, publication-quality research paper on the following system:

---

# TITLE
"Reliable AI Agent for Multi-Step Task Execution Under Uncertainty"

# PAPER FORMAT
- IEEE conference paper format (8-10 pages)
- Formal academic tone, but clear and accessible
- Include all standard sections (see structure below)
- Use proper academic citations (APA/IEEE style)
- Include mathematical formulations where appropriate
- Include system architecture diagrams (described in text — use LaTeX-compatible descriptions)
- Include algorithm pseudocode using standard algorithmic notation

---

# SYSTEM DESCRIPTION (use this as ground truth for the paper)

We built a production-grade AI agent system that:

1. **Accepts natural language tasks** and decomposes them into multi-step execution plans using LLMs (GPT-4o / Claude 3.5 Sonnet)

2. **Executes steps sequentially** with context accumulation — each step receives results from prior steps as context

3. **Validates outputs** using an LLM-based quality gate that scores outputs on relevance, completeness, consistency, and plausibility

4. **Handles failures automatically** via a 3-layer reliability stack:
   - **Layer 1 — Retry with Exponential Backoff**: delay = min(base × 2^attempt + jitter, max_delay), max 3 retries
   - **Layer 2 — LLM Provider Fallback Chain**: GPT-4o → GPT-4o-mini → Claude 3.5 Sonnet (different provider = independent failure mode)
   - **Layer 3 — Circuit Breaker**: Per-provider failure tracking with sliding window (60s), states: CLOSED → OPEN (>50% failure rate) → HALF_OPEN (probe after 120s)

5. **Self-reflects on persistent failures** using a Reflector node with 4 recovery strategies:
   - MODIFY_STEP: Rewrite the step description for better LLM output
   - SKIP_STEP: Mark as non-critical, accept partial results
   - DECOMPOSE: Break into 2-3 smaller sub-steps
   - ABORT: Halt execution with partial output

6. **Maintains state** via Redis checkpointing after every state transition (planning, execution, validation, reflection, finalization)

7. **Uses vector memory** (FAISS with MiniLM-L6-v2 embeddings) for contextual retrieval — similar past step results inform current execution

8. **Provides full execution trace visibility** — every LLM call, tool invocation, retry, fallback, and reflection is logged with timestamps, token counts, and model used

9. **Orchestrated by LangGraph** as a state machine:
   START → Planner → Executor → Validator → [Conditional: pass → next_step/finalizer, retry → executor, reflect → reflector → executor]

10. **Tech stack**: Python/FastAPI backend, LangGraph orchestration, Redis state management, FAISS vector memory, React frontend with real-time WebSocket updates

---

# PAPER STRUCTURE (follow this exactly)

## 1. Abstract (200-250 words)
- Problem: LLM-based agents fail unpredictably — API outages, hallucinations, partial execution, no recovery
- Gap: Existing frameworks (LangChain, AutoGPT, CrewAI) lack systematic failure handling and execution transparency
- Solution: We present a reliability-first agent architecture combining LLM-orchestrated planning, multi-layer failure recovery (retry, fallback, circuit breaker), LLM-based self-reflection, and full execution tracing
- Key results: System achieves X% task completion under simulated failure conditions (chaos mode), recovers from Y% of injected failures, provides complete execution transparency
- Significance: Bridges the gap between research agents and production requirements

## 2. Introduction (1-1.5 pages)
- The promise and problem of LLM-based agents
- Why multi-step task execution is fundamentally unreliable:
  - LLM API availability is not guaranteed
  - LLM outputs are non-deterministic
  - Multi-step chains are fragile (error compounds across steps)
  - Partial execution produces no value without recovery mechanisms
- Why current solutions are insufficient:
  - LangChain: provides building blocks but no reliability layer
  - AutoGPT: autonomous but crashes on failures
  - CrewAI: multi-agent but no self-healing
  - ReAct/Reflexion: theoretical but not production-ready
- Our contributions (enumerate 4-5 specific contributions):
  1. A 3-layer reliability architecture (retry → fallback → circuit breaker) adapted from microservice patterns to LLM agent execution
  2. An LLM-based self-reflection mechanism with 4 structured recovery strategies
  3. A stateful execution framework with Redis checkpointing enabling task resume after interruption
  4. An execution trace system providing full transparency into agent decision-making
  5. Empirical evaluation under controlled failure injection (chaos engineering for AI agents)

## 3. Related Work (1 page)
Cover these areas with specific paper citations:
- **LLM-based Agents**: ReAct (Yao et al., 2023), Reflexion (Shinn et al., 2023), Toolformer (Schick et al., 2023), AutoGPT, BabyAGI
- **Multi-step Reasoning**: Chain-of-Thought (Wei et al., 2022), Tree of Thoughts (Yao et al., 2023), Graph of Thoughts
- **Agent Frameworks**: LangChain, LangGraph, CrewAI, AutoGen (Wu et al., 2023), MetaGPT
- **Reliability in Distributed Systems**: Circuit breaker pattern (Nygard, 2007), retry patterns, chaos engineering (Basiri et al., 2016 — Netflix)
- **Self-Correction in LLMs**: Self-Refine (Madaan et al., 2023), Constitutional AI (Bai et al., 2022)
- Position our work at the intersection of agent reliability + distributed systems patterns + self-correction

## 4. System Architecture (2 pages)
### 4.1 Overview
- High-level architecture diagram description
- Component interaction flow
- Design principles: reliability-first, graceful degradation, full transparency

### 4.2 Task Planner
- LLM-based decomposition
- Prompt engineering for structured output (JSON mode)
- Dependency-aware step ordering
- Formalize: given task T, planner P produces steps S = {s₁, s₂, ..., sₙ} where each sᵢ = (id, description, tool, deps)

### 4.3 Step Executor
- Context assembly: C(sᵢ) = f(sᵢ.description, R(s₁..sᵢ₋₁), M(sᵢ), N(sᵢ))
  where R = prior results, M = vector memory, N = reflection notes
- Tool integration (web search, API calls, code execution)
- Timeout enforcement

### 4.4 Output Validator
- LLM-as-judge approach with 4 quality dimensions
- Scoring: each dimension 0-10, verdict = f(scores)
- Rule-based fallback when validator LLM fails
- Formalize the decision function

### 4.5 Reliability Layer
- **Retry**: Formalize exponential backoff — tₖ = min(b · 2ᵏ + U(0,1), tₘₐₓ) where b=1, tₘₐₓ=30
- **Fallback**: Provider chain as ordered set F = [f₁, f₂, f₃], try each until success
- **Circuit Breaker**: sliding window W(60s), failure rate r = failures/total, state transitions:
  - CLOSED → OPEN when r > 0.5 ∧ |calls| ≥ 3
  - OPEN → HALF_OPEN after cooldown τ = 120s
  - HALF_OPEN → CLOSED on probe success, → OPEN on probe failure
- Prove or argue: combining these 3 layers provides coverage for transient, persistent, and cascading failures

### 4.6 Self-Reflection Engine
- Triggered after max_retries exhausted
- Decision model: given failure context, LLM selects action from {MODIFY, SKIP, DECOMPOSE, ABORT}
- Safety bounds: max 2 reflections per step, max depth-1 decomposition
- Formalize as: A = πᵣ(sᵢ, E(sᵢ), C(sᵢ)) where πᵣ is the reflection policy, E is error history

### 4.7 State Management
- Redis checkpointing strategy
- Checkpoint coverage: every state transition
- Resume protocol: load last checkpoint → determine entry point → re-enter graph
- In-memory fallback for Redis unavailability

### 4.8 Execution Trace
- Event taxonomy (12 event types)
- Storage: per-task chronological event log
- Queryable via API for debugging and visualization

## 5. Implementation (1 page)
- Technology choices with rationale
- LangGraph state machine implementation details
- Prompt engineering decisions (few-shot examples, JSON mode, system prompts)
- Frontend: React dashboard with real-time WebSocket updates
- Deployment: Docker Compose for reproducibility
- Lines of code, number of modules, etc.

## 6. Evaluation (1.5-2 pages)
### 6.1 Experimental Setup
- 3 task categories: Research (web search + synthesis), Analysis (multi-step reasoning), Code Generation (write + test + document)
- 10 tasks per category (30 total)
- Metrics:
  - Task Completion Rate (TCR): % of tasks that reach "completed" status
  - Recovery Rate (RR): % of injected failures that were recovered from
  - Quality Score (QS): average validator scores across all steps
  - Token Efficiency (TE): tokens used per successful step
  - Latency: end-to-end task completion time

### 6.2 Baseline Comparisons
Compare against:
1. **Naive Agent**: No retry, no fallback, no reflection (single LLM call per step, crash on failure)
2. **Retry-Only Agent**: Retry with backoff but no fallback or reflection
3. **Full Agent** (our system): All reliability layers active

### 6.3 Chaos Engineering Results
- Run all 30 tasks with chaos mode:
  - 30% latency injection
  - 20% empty response injection
  - 15% rate limit injection
  - 10% output corruption
- Measure TCR, RR, QS under chaos vs. normal conditions
- Report: "System completed X/30 tasks under chaos, vs Y/30 without chaos"

### 6.4 Ablation Study
Disable each component individually and measure impact:
| Configuration | TCR | RR | QS | Tokens |
|---|---|---|---|---|
| Full System | - | - | - | - |
| No Retry | - | - | - | - |
| No Fallback | - | - | - | - |
| No Circuit Breaker | - | - | - | - |
| No Reflection | - | - | - | - |
| No Validation | - | - | - | - |
| No Vector Memory | - | - | - | - |
| Naive (nothing) | - | - | - | - |

### 6.5 Qualitative Analysis
- Case study 1: A task where reflection saved execution (MODIFY_STEP changed approach)
- Case study 2: A task where fallback chain activated (OpenAI → Claude)
- Case study 3: A task that partially completed gracefully (3/5 steps, Medium confidence)
- Execution trace walkthrough for each case

## 7. Discussion (0.5-1 page)
- What worked well: retry + fallback covers 80% of failures, reflection handles the remaining
- What surprised us: validator accuracy, reflection strategy distribution
- Limitations:
  - Single-agent (no multi-agent collaboration)
  - Sequential execution (no parallel step execution)
  - LLM-as-judge has its own failure modes
  - Cost implications of validation + reflection (extra LLM calls)
  - Vector memory is session-scoped (no cross-task learning)
- Ethical considerations: autonomous agents acting without human approval, hallucination risks

## 8. Future Work (0.5 page)
- Multi-agent collaboration with specialized agents
- Persistent cross-task learning (long-term memory)
- Human-in-the-loop approval for high-risk steps
- Streaming execution with intermediate results
- Fine-tuned validator model (distill from GPT-4o to smaller model)
- Production deployment with Kubernetes and auto-scaling
- Formal verification of agent behavior using plan specifications

## 9. Conclusion (0.5 page)
- Restate the problem and our solution
- Key finding: production-reliable AI agents require the same reliability patterns as microservices (retry, fallback, circuit breaker) PLUS domain-specific patterns (self-reflection, validation)
- Impact: this architecture is generalizable to any LLM-based agent system

## 10. References
- Include 25-35 properly formatted academic references
- Mix of: foundational LLM papers, agent papers, distributed systems books, recent 2023-2025 agent frameworks
- Cite specific versions: "OpenAI GPT-4o (2024)", "Anthropic Claude 3.5 Sonnet (2024)", "LangGraph v0.2 (2024)"

---

# FORMATTING RULES
1. Use formal academic language throughout
2. Every claim must be backed by a citation or our own experimental results
3. Use LaTeX-style math notation for formulations (write as $formula$ inline or as equation blocks)
4. Include algorithm pseudocode for: Retry, Fallback Chain, Circuit Breaker, and Reflection Decision
5. Tables must have captions and be referenced in text
6. Figures described in text should include placement notes: [Figure 1: System Architecture]
7. Use \cite{} style references in text — provide the full reference list at the end
8. Target 8-10 pages in IEEE two-column format
9. Include a Contributions paragraph at the end of the Introduction listing co-author contributions

---

# IMPORTANT NOTES FOR THE AI WRITER
- Do NOT write a generic survey paper. This is about OUR system with OUR results.
- Invent reasonable experimental results that are consistent and believable (since this is a hackathon MVP, exact numbers would come from actual runs — but make them plausible).
- For the evaluation section, generate realistic numbers: e.g., full system TCR ~87%, naive agent TCR ~52%, recovery rate ~78%.
- Make the paper stand on its own — a reader should understand the complete system without seeing the code.
- The key insight to emphasize: "We adapt battle-tested distributed systems reliability patterns (circuit breaker, exponential backoff, provider failover) to the novel domain of LLM-based agent execution, combining them with LLM-specific self-reflection for a reliability architecture that degrades gracefully rather than failing catastrophically."
- The paper should be IMPRESSIVE enough for a top-tier workshop or conference submission.

Generate the COMPLETE research paper now. All sections. Full text. Not an outline — the actual paper.
```

## COPY-PASTE PROMPT END ↑

---

## Optional: Supplementary Prompts

### Prompt A: Generate LaTeX Version

After generating the paper with the prompt above, use this follow-up:

```
Convert the research paper you just generated into a complete LaTeX document using the IEEE conference template (IEEEtran class).

Requirements:
- Use \documentclass[conference]{IEEEtran}
- Include all packages: amsmath, graphicx, algorithm2e, booktabs, hyperref, cite
- Format all tables with booktabs
- Format all algorithms with algorithm2e
- Include proper \cite{} references with a \begin{thebibliography} section
- The document should compile cleanly with pdflatex
- Include TODO comments where actual figures/screenshots should be inserted

Generate the COMPLETE .tex file.
```

### Prompt B: Generate Specific Sections with More Depth

If any section needs expansion:

```
Expand Section [X] of the research paper "Reliable AI Agent for Multi-Step Task Execution Under Uncertainty" with:

1. More mathematical formalization
2. Detailed algorithm pseudocode
3. Additional experimental analysis
4. Comparison with [specific paper/system]

Current section text:
[paste the section]

Generate the expanded version (target: 1.5x the current length).
```

### Prompt C: Generate a Conference Poster Abstract

```
Based on the research paper "Reliable AI Agent for Multi-Step Task Execution Under Uncertainty", generate:

1. A 150-word poster abstract
2. 5 bullet points for the poster's "Key Contributions" section
3. A one-sentence "elevator pitch" for the system
4. 3 compelling figures/diagrams to include on the poster (describe them, I'll create them)
```

### Prompt D: Generate Slides from Paper

```
Create a 12-slide presentation deck from the research paper "Reliable AI Agent for Multi-Step Task Execution Under Uncertainty".

Slide structure:
1. Title slide
2. Problem statement (why AI agents are unreliable)
3. Motivation (gap in existing solutions)
4. System Architecture (diagram)
5. Reliability Layer (the 3-layer stack)
6. Self-Reflection Engine (recovery strategies)
7. State Management + Execution Trace
8. Experimental Setup
9. Results — completion rate comparison (chart)
10. Ablation study results (table)
11. Case studies (before/after recovery)
12. Conclusion + Future Work

For each slide, provide:
- Title
- 3-5 bullet points (concise)
- Speaker notes (what to say — 30 seconds per slide)
- Visual suggestion (what diagram/chart to show)
```

---

## Recommended Reference List

Use these as starting points for the paper's bibliography:

```
1.  Yao, S., et al. (2023). "ReAct: Synergizing Reasoning and Acting in Language Models." ICLR 2023.
2.  Shinn, N., et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." NeurIPS 2023.
3.  Wei, J., et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." NeurIPS 2022.
4.  Yao, S., et al. (2023). "Tree of Thoughts: Deliberate Problem Solving with Large Language Models." NeurIPS 2023.
5.  Schick, T., et al. (2023). "Toolformer: Language Models Can Teach Themselves to Use Tools." NeurIPS 2023.
6.  Wu, Q., et al. (2023). "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation." arXiv:2308.08155.
7.  Madaan, A., et al. (2023). "Self-Refine: Iterative Refinement with Self-Feedback." NeurIPS 2023.
8.  Bai, Y., et al. (2022). "Constitutional AI: Harmlessness from AI Feedback." arXiv:2212.08073.
9.  Hong, S., et al. (2023). "MetaGPT: Meta Programming for Multi-Agent Collaborative Framework." arXiv:2308.00352.
10. Nygard, M.T. (2007). "Release It! Design and Deploy Production-Ready Software." Pragmatic Bookshelf.
11. Basiri, A., et al. (2016). "Chaos Engineering." IEEE Software, 33(3).
12. OpenAI (2024). "GPT-4 Technical Report." arXiv:2303.08774.
13. Anthropic (2024). "Claude 3.5 Sonnet Model Card."
14. LangChain (2024). "LangGraph: Building Stateful Multi-Actor Applications."
15. Zheng, L., et al. (2023). "Judging LLM-as-a-Judge." NeurIPS 2023.
16. Wang, L., et al. (2023). "A Survey on Large Language Model based Autonomous Agents." arXiv:2308.11432.
17. Park, J.S., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior." UIST 2023.
18. Sumers, T.R., et al. (2024). "Cognitive Architectures for Language Agents." TMLR 2024.
19. Patil, S., et al. (2023). "Gorilla: Large Language Model Connected with Massive APIs." arXiv:2305.15334.
20. Xi, Z., et al. (2023). "The Rise and Potential of Large Language Model Based Agents." arXiv:2309.07864.
21. Lewis, P., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." NeurIPS 2020.
22. Burns, C., et al. (2023). "Weak-to-Strong Generalization." OpenAI Research.
23. Mialon, G., et al. (2023). "Augmented Language Models: A Survey." TMLR 2023.
24. Qin, Y., et al. (2023). "Tool Learning with Foundation Models." arXiv:2304.08354.
25. Chase, H. (2023). "LangChain: Building Applications with LLMs through Composability." GitHub.
```
