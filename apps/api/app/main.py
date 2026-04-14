"""
PactSafe AI — FastAPI entrypoint.

All secrets and LLM calls live server-side. The browser never sees an API key.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routers import analyses, export, health, jobs
from app.ws import jobs as ws_jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(name)s  %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="PactSafe AI API",
    version=__version__,
    description="Contract analysis backend. All secrets stay server-side.",
)

_EXTRA_ORIGINS = [
    "https://pactsafe-ai.vercel.app",
    "https://pactsafe-ai-git-main-omgohel-3379s-projects.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.cors_origin_list + _EXTRA_ORIGINS)),
    # Also covers any other Vercel preview deploy automatically
    allow_origin_regex=r"https://pactsafe-ai.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers — all mounted under /api
app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(analyses.router, prefix="/api")
app.include_router(export.router, prefix="/api")

# WebSocket (kept at root: /ws/jobs/{id})
app.include_router(ws_jobs.router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"name": "PactSafe AI API", "version": __version__, "docs": "/docs"}
