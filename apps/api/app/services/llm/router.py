"""
LLM router — returns an LLMClient based on settings.

- Default = gemini (free, generous rate limits).
- Other providers: ollama (local), anthropic (paid), groq (legacy).
- If ollama is chosen but unreachable AND gemini/anthropic key is set,
  we fall back automatically.
- Never accepts keys from the client — always pulls from server env.
"""

from __future__ import annotations

import logging
from typing import Protocol

from app.config import Settings, get_settings
from app.services.llm.anthropic_client import AnthropicClient
from app.services.llm.gemini_client import GeminiClient
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

    if s.llm_provider == "gemini":
        return GeminiClient(api_key=s.gemini_api_key, model=s.gemini_model)

    if s.llm_provider == "anthropic":
        return AnthropicClient(api_key=s.anthropic_api_key, model=s.anthropic_model)

    if s.llm_provider == "groq":
        return GroqClient(api_key=s.groq_api_key, model=s.groq_model)

    # Default: ollama, with fallback to gemini / anthropic if configured
    ollama = OllamaClient(model=s.ollama_model, base_url=s.ollama_url)
    if await ollama.is_available():
        return ollama

    if s.gemini_api_key:
        logger.warning("Ollama unreachable at %s — falling back to Gemini.", s.ollama_url)
        return GeminiClient(api_key=s.gemini_api_key, model=s.gemini_model)

    if s.anthropic_api_key:
        logger.warning("Ollama unreachable at %s — falling back to Anthropic.", s.ollama_url)
        return AnthropicClient(api_key=s.anthropic_api_key, model=s.anthropic_model)

    raise RuntimeError(
        "Ollama is not reachable and no GEMINI_API_KEY / ANTHROPIC_API_KEY is set. "
        "Start Ollama (`ollama serve`) or set GEMINI_API_KEY / ANTHROPIC_API_KEY."
    )
