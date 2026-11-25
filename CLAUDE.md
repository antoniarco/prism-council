# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRISM Council is a multi-model AI reasoning system that orchestrates frontier LLMs into a structured deliberation pipeline: independent reasoning → blind peer evaluation → consensus synthesis. It uses OpenRouter as a unified API gateway to access 300+ models.

## Commands

### Running the Application

```bash
# Quick start (both servers)
./start.sh

# Or manually:
# Backend (from project root)
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (from frontend/)
cd frontend && npm run dev
```

Backend runs on http://localhost:8001, frontend on http://localhost:5173.

### Dependencies

```bash
# Backend
uv sync

# Frontend
cd frontend && npm install
```

### Frontend Lint

```bash
cd frontend && npm run lint
```

### Frontend Build

```bash
cd frontend && npm run build
```

No test infrastructure exists (no pytest, no vitest/jest).

## Architecture

### Three-Stage Council Pipeline (backend/council.py)

1. **Stage 1 — Independent Reasoning**: Queries all council member models in parallel via `asyncio.gather`. Each model responds independently with no visibility to others.
2. **Stage 2 — Blind Peer Evaluation**: Each model evaluates anonymized responses (labeled "Response A", "Response B", etc.) and produces structured rankings. Rankings are parsed via regex and aggregated.
3. **Stage 3 — Consensus Synthesis**: A designated Chairman model synthesizes a final response considering all individual responses and peer rankings.

### Optional Clarification-First Mode (backend/clarification.py)

An analyst model asks clarifying questions before deliberation begins. Supports multi-round Q&A. The resulting briefing is prepended to the council's context.

### Backend (Python/FastAPI)

- **backend/main.py** — FastAPI app with 35+ REST endpoints. Uses Server-Sent Events for streaming deliberation progress to the frontend.
- **backend/openrouter.py** — Async HTTP client (httpx) for OpenRouter API. Caches model list for 1 hour. 120s default timeout.
- **backend/model_picker.py** — Dynamic model selection with four strategy modes (max_stakes, max_stakes_optimized, max_cultural_biases, cheapest). Heuristic keyword-based scoring.
- **backend/config.py** — Configuration loaded from settings storage with `.env` fallback for API key. Call `reload_config()` after settings changes.
- **backend/storage.py, context_storage.py, role_storage.py, settings_storage.py** — JSON file-based persistence under `data/` directory. No database.

### Frontend (React 19 + Vite 7)

- **frontend/src/App.jsx** — Main controller with tab-based navigation (Conversations, Contexts, Roles, Settings).
- **frontend/src/api.js** — Centralized API client. Uses fetch for REST and EventSource pattern for SSE streaming.
- **frontend/src/components/Stage1.jsx, Stage2.jsx, Stage3.jsx** — Render each deliberation stage.
- **frontend/src/components/ChatInterface.jsx** — Main conversation UI integrating clarification, model picking, and reasoning stages.
- Styling uses component-scoped CSS files with a design token system in `index.css`. No CSS framework.

### Data Model

- **Conversations**: Full deliberation history with all three stages preserved. Stage 3 consensus used for ongoing conversation context.
- **Contexts**: Reusable background information (e.g., professional constraints). Snapshotted at conversation creation time.
- **Roles**: Behavioral personas that guide reasoning style. Also snapshotted at creation.
- All stored as JSON files under `data/` (gitignored).

## Environment

Requires `OPENROUTER_API_KEY` — set in `.env` (see `.env.example`) or configure via the Settings UI. Python 3.10+, Node.js for frontend.
