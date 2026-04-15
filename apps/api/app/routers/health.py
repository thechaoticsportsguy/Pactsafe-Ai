"""
GET /api/health            — liveness probe + provider readiness check.
GET /api/health/llamaparse — LlamaParse availability probe.
"""

from __future__ import annotations

import os

from fastapi import APIRouter

from app.services.extraction import llama_parse_status

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "provider": os.getenv("LLM_PROVIDER", "unknown"),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "llama_parse_available": llama_parse_status()["available"],
    }


@router.get("/health/llamaparse")
async def health_llamaparse() -> dict[str, object]:
    """
    Report whether LlamaParse is wired up. Checks:
      - LLAMA_CLOUD_API_KEY is set
      - llama-parse SDK is importable
      - current token threshold configuration

    Deliberately does NOT call the LlamaParse API so this endpoint is
    safe to poll cheaply. Returns a structured dict the frontend or an
    uptime monitor can parse.
    """
    return llama_parse_status()
