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
        max_output_tokens: int = 8000,
        temperature: float = 0.1,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction or ""},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_output_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=180.0) as client:
            r = await client.post(f"{self.base_url}/api/chat", json=payload)
            r.raise_for_status()
            data = r.json()
        return str(data["message"]["content"])

    async def chat(self, system: str, user: str) -> str:
        return await self.generate(prompt=user, system_instruction=system)
