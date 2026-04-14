"""GET /api/health — liveness probe + provider readiness check."""

from __future__ import annotations

import os

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "provider": os.getenv("LLM_PROVIDER", "unknown"),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
    }
