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
from app.routers import analyses, demo, export, health, jobs
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
    # Production custom domain
    "https://pactsafeai.com",
    "https://www.pactsafeai.com",
    # Vercel canonical + known preview
    "https://pactsafe-ai.vercel.app",
    "https://pactsafe-ai-git-main-omgohel-3379s-projects.vercel.app",
    # Local dev
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.cors_origin_list + _EXTRA_ORIGINS)),
    # Covers all Vercel preview deploys + custom domains
    allow_origin_regex=r"https://(www\.)?pactsafeai\.com|https://pactsafe-ai[^.]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers — all mounted under /api
app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(analyses.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(demo.router, prefix="/api")

# WebSocket (kept at root: /ws/jobs/{id})
app.include_router(ws_jobs.router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"name": "PactSafe AI API", "version": __version__, "docs": "/docs"}
