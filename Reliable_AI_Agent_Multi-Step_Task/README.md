# Reliable AI Agent for Multi-Step Task Execution Under Uncertainty

Production-grade starter scaffold for a resilient multi-step AI agent with FastAPI, LangGraph, Redis, FAISS, and React.

## Project Layout

- `backend/`: FastAPI service, LangGraph agent, reliability modules, and integrations
- `frontend/`: React + Vite + Tailwind UI for task submission and live execution visibility
- `demo/`: Demo scenarios and walkthrough script
- `docker-compose.yml`: Local orchestration for backend, frontend, and Redis

## Quick Start

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Populate API keys in `backend/.env`.

### 2. Run services

```bash
docker compose up --build
```

### 3. Access applications

- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend UI: `http://localhost:5173`
- Redis: `localhost:6379`

## Development Notes

- Python: 3.11+
- Node.js: 20+
- The backend currently contains typed skeleton implementations with TODO-guided milestones for planner, executor, validator, reflector, and finalizer logic.
