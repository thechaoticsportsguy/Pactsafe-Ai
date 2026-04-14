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

    async def chat(self, system: str, user: str) -> str:
        client = AsyncGroq(api_key=self.api_key)
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.1,
            max_tokens=2048,
        )
        return str(response.choices[0].message.content)
