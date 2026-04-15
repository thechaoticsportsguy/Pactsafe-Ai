"""Google Gemini client — uses the google-genai SDK."""

from __future__ import annotations


class GeminiClient:
    provider = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for gemini provider.")
        # Imported lazily so this file can be imported without google-genai installed.
        from google import genai

        self.api_key = api_key
        self.model = model
        self._client = genai.Client(api_key=api_key)

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat(self, system: str, user: str) -> str:
        from google.genai import types

        response = await self._client.aio.models.generate_content(
            model=self.model,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.1,
                max_output_tokens=2048,
            ),
        )
        return str(response.text or "")
