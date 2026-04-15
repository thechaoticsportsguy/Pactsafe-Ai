"""Ollama HTTP client — local, free."""

from __future__ import annotations

import httpx


class OllamaClient:
    provider = "ollama"

    def __init__(self, model: str, base_url: str) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
            return r.status_code == 200
        except Exception:
            return False

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str = "pro",
    ) -> str:
        return await self.chat(system_instruction or "", prompt)

    async def chat(self, system: str, user: str) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 2048},
        }
        async with httpx.AsyncClient(timeout=180.0) as client:
            r = await client.post(f"{self.base_url}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()
        return str(data["message"]["content"])
