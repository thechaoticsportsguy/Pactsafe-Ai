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
    ) -> str:
        return await self.chat(system_instruction or "", prompt)

    async def chat(self, system: str, user: str) -> str:
        response = await self._client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        # Anthropic returns a list of content blocks; first block is the text.
        return str(response.content[0].text)  # type: ignore[union-attr]
