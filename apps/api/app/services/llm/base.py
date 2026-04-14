"""LLMClient Protocol — any provider must implement these two methods."""

from __future__ import annotations

from typing import Protocol


class LLMClient(Protocol):
    """Abstract provider interface."""

    model: str
    provider: str

    async def chat(self, system: str, user: str) -> str:
        """Return the raw text response from the model."""

    async def is_available(self) -> bool:
        """Return True if this provider is reachable/configured."""
