# Demo Script

## Goal
Show end-to-end multi-step execution with reliability mechanisms under uncertain conditions.

## Steps
1. Start the stack with `docker compose up --build`.
2. Open the frontend at `http://localhost:5173`.
3. Submit scenario 1 from `demo/scenarios.json`.
4. Highlight planned DAG nodes, live logs, and trace timeline placeholders.
5. Trigger execution and explain how retry/fallback/circuit breaker modules are wired in backend scaffolding.
6. Show backend API docs at `http://localhost:8000/docs`.
7. Conclude with next implementation milestones for validator quality gates and checkpoint resume.
