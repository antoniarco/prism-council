# PRISM Council

**PRISM Council** is a decision-grade, multi-model reasoning system that orchestrates multiple frontier AI models into a structured deliberation and evaluation process.

🌐 **Project website:**  
https://prism-thinking-layer.lovable.app/

Instead of relying on a single LLM response, PRISM Council enables **parallel, independent reasoning across many models**, followed by **blind review and consensus synthesis** — producing outputs that are more robust, explainable, and trustworthy.

PRISM Council is a core mechanism within the broader **PRISM** framework, which focuses on **governance, orchestration, and evaluation of intelligence at scale**.

---

## Why PRISM Council

Most AI systems answer questions by querying a single model and returning its output.

PRISM Council is designed for situations where:
- accuracy matters more than speed,
- bias must be reduced,
- reasoning quality must be compared,
- and decisions should not depend on a single model’s opinion.

Instead of asking *one model* to be right, PRISM Council asks *many models* to reason independently — and then evaluates their answers without bias.

---

## How It Works

When you submit a query, PRISM Council runs a structured, multi-stage deliberation pipeline:

### **Stage 1 — Independent Reasoning**
The same query is sent to multiple AI models in parallel.

Each model:
- reasons independently,
- has no visibility into the others,
- produces its own complete response.

All responses are preserved and can be inspected individually.

---

### **Stage 2 — Blind Review & Evaluation**
Each model is then shown the set of responses produced by the other models.

To reduce bias:
- model identities are anonymized,
- evaluations focus strictly on accuracy, clarity, and insight.

Each model critiques and ranks the responses without knowing which model authored them.

---

### **Stage 3 — Consensus Synthesis**
A designated synthesis model (the *Chairman*) aggregates:
- the original responses,
- the blind evaluations,
- and the rankings,

and produces a **single, consolidated response** that reflects the strongest reasoning rather than a single opinion.

The result is not a vote, but a **reasoned synthesis**.

---

## Key Capabilities

### Multi-Model Deliberation
- Run parallel reasoning across multiple frontier models (OpenAI, Anthropic, Google, etc.)
- Treat models as interchangeable reasoning engines, not authorities

### Blind Consensus Evaluation
- Reduce brand and identity bias during evaluation
- Prioritize reasoning quality over model reputation

### Decision-Grade Outputs
- Produce consolidated responses designed for action
- Preserve intermediate reasoning and dissent when needed

---

## Conversation Memory

PRISM Council maintains conversation history automatically.

Follow-up questions are evaluated in the context of prior exchanges, enabling natural multi-turn reasoning while preserving deliberative structure.

---

## Contexts (Authoritative Background)

Contexts allow you to define **stable, authoritative background information** that applies across conversations.

Contexts are:
- **Long-lived** — define once, reuse many times
- **Authoritative** — treated as fixed reference points
- **Versioned** — each conversation snapshots its context at creation time

Examples:
- professional background
- organizational constraints
- project goals
- personal principles

See [`CONTEXTS_FEATURE.md`](CONTEXTS_FEATURE.md) for details.

---

## Concept & Visual Overview

The PRISM framework and the Council mechanism are explained visually on the project website:

👉 https://prism-thinking-layer.lovable.app/

The website focuses on:
- the conceptual model behind PRISM,
- how governance and deliberation differ from simple multi-LLM querying,
- and why blind, multi-model evaluation leads to more reliable outcomes.

GitHub focuses on **implementation**.  
The website focuses on **system thinking and intent**.

---

## Relationship to LLM Council (Acknowledgement)

PRISM Council is inspired by early open-source explorations of multi-model “council” patterns, including the *LLM Council* project.

PRISM Council extends this idea by:
- formalizing blind evaluation,
- emphasizing governance and orchestration,
- and positioning deliberation as part of a broader decision-grade intelligence framework.

---

## Setup

### 1. Install Dependencies

The project uses [uv](https://docs.astral.sh/uv/) for Python project management.

**Backend**
```bash
uv sync

**Frontend**
cd frontend
npm install
cd ..

### 2. Configure API Key
OPENROUTER_API_KEY=sk-or-v1-...


### 3. Configure Models (Optional) / You can do it using Settings Interface
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]

CHAIRMAN_MODEL = "google/gemini-3-pro-preview"

## Running the Application
### Option 1 — Start Script
./start.sh

### Option 2 — Manual
#### Terminal 1 (Backend):
uv run python -m backend.main

#### Terminal 2 (Frontend):
cd frontend
npm run dev

Open:
http://localhost:5173

## Tech Stack

Backend: FastAPI (Python 3.10+), async httpx, OpenRouter API

Frontend: React + Vite, react-markdown

Storage: JSON-based conversation persistence

Tooling: uv (Python), npm (JavaScript)

# Project Status

PRISM Council is an experimental but structured exploration of decision-grade multi-model reasoning.

The goal is not to replace individual LLMs, but to govern how they are used when correctness, robustness, and transparency matter.

For conceptual background, system diagrams, and positioning:
🌐 https://prism-thinking-layer.lovable.app/



