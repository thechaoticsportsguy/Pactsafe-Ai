# PactSafe AI

AI-powered contract analyzer for freelancers. Drop a contract PDF/DOCX/TXT and
get plain-English red flags, missing protections, and negotiation suggestions.

This repo is a **monorepo** with the refactored production SaaS:

```
.
├── apps
│   ├── api      # FastAPI backend (Python)    ← this phase
│   └── web      # Next.js 14 frontend         ← next phase
├── packages
│   └── schemas  # Shared AnalysisResult (Python + TS)
├── docker-compose.yml
├── contract_analyzer.py     # original CLI (kept for reference)
└── contractAnalyzer.js      # original JS (kept for reference)
```

## Status

- Phase 1 — **Backend + Docker (this PR)**: FastAPI, SQLModel + Postgres,
  Alembic migrations, ingestion with OCR fallback, LLM router (Ollama /
  Anthropic / Groq), jobs + WebSocket progress, export (JSON/PDF), tests,
  Docker Compose.
- Phase 2 — **Next.js frontend**: upload → WebSocket progress → result view,
  history, compare, PDF export.

## Quick start (Docker, recommended)

```bash
cp .env.example .env
# optionally edit .env to add ANTHROPIC_API_KEY / GROQ_API_KEY
docker compose up --build
```

Then:

- API:  <http://localhost:8000/docs>
- Web:  <http://localhost:3000> (once phase 2 lands)
- Ollama: <http://localhost:11434>

After containers are up, pull a small model once:

```bash
docker compose exec ollama ollama pull qwen2.5:0.5b
```

## Security principles

- **All secrets live server-side only** (`os.getenv` inside the API).
- The frontend **never** calls `api.anthropic.com`, `api.groq.com`, or
  `openrouter.ai`. No API-key input fields in the UI.
- File uploads are size-checked (10 MB max) and extension-gated.

## Local dev without Docker

```bash
# Backend
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL=sqlite:///./pactsafe.db
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Run tests
pytest
```

## Not legal advice

For high-stakes contracts, always consult a licensed attorney.

## License

MIT
