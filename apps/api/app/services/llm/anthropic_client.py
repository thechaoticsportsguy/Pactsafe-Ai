"""Anthropic Claude client — paid, fast, high quality."""

from __future__ import annotations


class AnthropicClient:
    provider = "anthropic"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for anthropic provider.")
        # Imported lazily so this file can be imported without anthropic installed.
        import anthropic

        self.model = model
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    async def is_available(self) -> bool:
        # The anthropic SDK doesn't expose a health endpoint, so if we have a key
        # we assume it's available. Failures surface via chat() retries.
        return True

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str = "pro",
        max_output_tokens: int = 8000,
        temperature: float = 0.1,
    ) -> str:
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=max_output_tokens,
            temperature=temperature,
            system=system_instruction or "",
            messages=[{"role": "user", "content": prompt}],
        )
        return str(response.content[0].text)  # type: ignore[union-attr]

    async def chat(self, system: str, user: str) -> str:
        return await self.generate(prompt=user, system_instruction=system)
