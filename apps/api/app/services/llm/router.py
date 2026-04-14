"""
LLM router — returns an LLMClient based on settings.

- Default = ollama.
- If ollama is chosen but unreachable AND anthropic_api_key is set,
  we fall back to Anthropic automatically.
- Never accepts keys from the client — always pulls from server env.
"""

from __future__ import annotations

import logging
from typing import Protocol

from app.config import Settings, get_settings
from app.services.llm.anthropic_client import AnthropicClient
from app.services.llm.groq_client import GroqClient
from app.services.llm.ollama import OllamaClient

logger = logging.getLogger(__name__)


class LLMClient(Protocol):
    model: str
    provider: str

    async def chat(self, system: str, user: str) -> str: ...
    async def is_available(self) -> bool: ...


async def get_llm_client(settings: Settings | None = None) -> LLMClient:
    """Resolve the active LLM client, with fallback logic."""

    s = settings or get_settings()

    if s.llm_provider == "anthropic":
        return AnthropicClient(api_key=s.anthropic_api_key, model=s.anthropic_model)

    if s.llm_provider == "groq":
        return GroqClient(api_key=s.groq_api_key, model=s.groq_model)

    # Default: ollama, with fallback to anthropic if configured
    ollama = OllamaClient(model=s.ollama_model, base_url=s.ollama_url)
    if await ollama.is_available():
        return ollama

    if s.anthropic_api_key:
        logger.warning("Ollama unreachable at %s — falling back to Anthropic.", s.ollama_url)
        return AnthropicClient(api_key=s.anthropic_api_key, model=s.anthropic_model)

    raise RuntimeError(
        "Ollama is not reachable and no ANTHROPIC_API_KEY is set. "
        "Start Ollama (`ollama serve`) or set ANTHROPIC_API_KEY / GROQ_API_KEY."
    )
