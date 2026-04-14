# PactSafe API

FastAPI backend for PactSafe AI. Handles file ingestion, contract analysis via
LLMs (Ollama / Anthropic / Groq), job orchestration, and export.

## Quick start (local, without Docker)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

# copy env vars
cp ../../.env.example ../../.env

# run migrations
alembic upgrade head

# start server
uvicorn app.main:app --reload --port 8000
```

Open <http://localhost:8000/docs> for interactive OpenAPI docs.

## Running tests

```bash
pytest
```

## LLM providers

Set `LLM_PROVIDER` in `.env` to one of:

- `ollama` (default, free, local — needs `ollama serve`)
- `anthropic` (needs `ANTHROPIC_API_KEY`)
- `groq` (needs `GROQ_API_KEY`)

The router auto-falls-back to Anthropic if Ollama is the chosen provider but
isn't reachable and `ANTHROPIC_API_KEY` is set.

## Project layout

```
apps/api
├── app
│   ├── main.py              # FastAPI entrypoint
│   ├── config.py            # Settings (pydantic-settings)
│   ├── db.py                # SQLModel engine + session
│   ├── models.py            # DB tables (User, Job, Analysis)
│   ├── schemas.py           # Pydantic request/response models
│   ├── prompts/contract.py  # SYSTEM_PROMPT + build_prompt (single source)
│   ├── services
│   │   ├── ingestion.py     # PDF/DOCX/TXT → text + page_map
│   │   ├── analyzer.py      # ContractAnalyzer (ported from CLI)
│   │   └── llm/             # provider router
│   ├── routers              # health, jobs, analyses, export
│   ├── ws/jobs.py           # WebSocket /ws/jobs/{id}
│   └── workers/background.py
├── alembic/                 # migrations
├── tests/
├── Dockerfile
└── pyproject.toml
```
