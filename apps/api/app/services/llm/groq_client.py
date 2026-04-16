"""Groq client — uses the official groq SDK."""

from __future__ import annotations

import os

from groq import AsyncGroq


class GroqClient:
    provider = "groq"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY is required for groq provider.")
        self.api_key = api_key
        self.model = model

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str = "pro",
        max_output_tokens: int = 8000,
        temperature: float = 0.1,
    ) -> str:
        client = AsyncGroq(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_instruction or ""},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_output_tokens,
        )
        return str(response.choices[0].message.content)

    async def chat(self, system: str, user: str) -> str:
        return await self.generate(prompt=user, system_instruction=system)
