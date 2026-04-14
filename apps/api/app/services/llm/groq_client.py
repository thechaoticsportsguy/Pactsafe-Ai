"""Groq client — very fast OpenAI-compatible chat API."""

from __future__ import annotations

import httpx


class GroqClient:
    provider = "groq"
    _base_url = "https://api.groq.com/openai/v1"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY is required for groq provider.")
        self.api_key = api_key
        self.model = model

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, system: str, user: str) -> str:
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "max_tokens": 2048,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{self._base_url}/chat/completions", headers=headers, json=payload
            )
            r.raise_for_status()
            data = r.json()
        return str(data["choices"][0]["message"]["content"])
