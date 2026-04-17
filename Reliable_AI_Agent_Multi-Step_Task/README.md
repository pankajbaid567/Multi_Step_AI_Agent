# Reliable AI Agent: Multi-Step Task Execution Under Uncertainty

![Docker Compose](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker&logoColor=white)

Reliable AI Agent is a reliability-first orchestration platform that plans, executes, validates, and self-corrects complex multi-step tasks using a graph-based backend and a real-time observability dashboard. Instead of treating AI output as one-shot text generation, this system treats AI work as an auditable runtime: every step is traced, failures are retried and routed through fallback providers, and reflection logic recovers from low-quality or unstable intermediate results.

## Architecture Diagram

```text
			+--------------------------------------+
			|         React + Vite Frontend        |
			| TaskInput | ExecutionDAG | Timeline   |
			+------------------+-------------------+
					   |
			      HTTP + WebSocket APIs
					   |
			+------------------v-------------------+
			|            FastAPI Backend            |
			|  /tasks | /execute | /traces | /ws   |
			+------------------+-------------------+
					   |
			 +-----------------v------------------+
			 |         LangGraph Orchestrator      |
			 | Planner -> Executor -> Validator    |
			 |              |          |           |
			 |              +-> Reflector -> Final |
			 +-----------------+-------------------+
					   |
		+--------------------------+---------------------------+
		|                          |                           |
	+-------v-------+          +-------v--------+          +-------v-------+
	| Redis         |          | LLM Providers  |          | Tool Layer    |
	| checkpoints   |          | OpenAI/Claude  |          | Web/API/Code  |
	| pub-sub trace |          | fallback chain |          | execution     |
	+---------------+          +----------------+          +---------------+
```

## Quick Start

1. Clone the repo.
2. Copy `.env.example` to `.env`, then add your API keys.
3. Run `docker compose up --build`.
4. Open http://localhost:5173.

## Features

- Multi-step task decomposition with dependency-aware planning.
- Real-time execution streaming via WebSocket and timeline traces.
- Reliability layer with retries, provider fallback, circuit breaker signals, and chaos testing support.
- Validation and reflection nodes for self-correction on low-quality outputs.
- Persistent checkpointing in Redis with resume-safe task state.
- Structured result summaries with confidence and execution metadata.

## Tech Stack

- Backend: FastAPI, Uvicorn, LangGraph, Pydantic, Redis.
- AI/Tools: OpenAI, Anthropic, Tavily, FAISS, Sentence Transformers.
- Frontend: React 18, Vite, Tailwind CSS, Framer Motion, Axios.
- Infra: Docker, Docker Compose, Nginx (production frontend stage).

## Demo Scenarios

- Happy Path: quantum computing research synthesis (clean run).
- Failure Recovery: multi-city weather comparison with Chaos Mode enabled.
- Reflection Demo: BST coding + tests + documentation with quality gating.

Scenario payloads and talking points live in `demo/scenarios.json`, with a 5-minute stage script in `demo/demo_script.md`.

## API Documentation

- Interactive docs: http://localhost:8000/docs
- Key endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /health | Service and Redis health check |
| POST | /tasks | Create and plan a new task |
| GET | /tasks/{task_id} | Retrieve full task state/checkpoint |
| POST | /tasks/{task_id}/execute | Start async execution |
| POST | /tasks/{task_id}/resume | Resume from latest checkpoint |
| GET | /traces/{task_id} | Retrieve execution trace timeline |
| GET | /config/chaos | Read runtime chaos mode and stats |
| POST | /config/chaos | Toggle runtime chaos mode |
| WS | /ws/{task_id} | Stream live task events |

## Team Members

- Pankaj Baid - System architecture, backend reliability, orchestration.
- Team Member 2 - Frontend experience and execution visualization.
- Team Member 3 - Integrations, testing, and demo operations.

## License

MIT License.
