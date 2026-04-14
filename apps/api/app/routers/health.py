"""GET /api/health — liveness probe + provider readiness check."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings
from app.services.llm.ollama import OllamaClient

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    s = get_settings()
    ollama_ok = False
    if s.llm_provider == "ollama":
        ollama_ok = await OllamaClient(
            model=s.ollama_model, base_url=s.ollama_url
        ).is_available()

    return {
        "status": "ok",
        "provider": s.llm_provider,
        "ollama_reachable": ollama_ok,
        "anthropic_configured": bool(s.anthropic_api_key),
        "groq_configured": bool(s.groq_api_key),
    }
