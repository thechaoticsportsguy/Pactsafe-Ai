"""LLMClient Protocol — any provider must implement these methods."""

from __future__ import annotations

from typing import Protocol


class LLMClient(Protocol):
    """Abstract provider interface."""

    model: str
    provider: str

    async def chat(self, system: str, user: str) -> str:
        """Return the raw text response from the model."""

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str = "pro",
    ) -> str:
        """Unified generate API. Gemini uses `model` to pick within its 2.5 chain."""

    async def is_available(self) -> bool:
        """Return True if this provider is reachable/configured."""
