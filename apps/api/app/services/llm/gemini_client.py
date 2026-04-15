"""Google Gemini client — google-generativeai SDK with 2.5 fallback chain."""

from __future__ import annotations

import asyncio
from typing import Any

import google.generativeai as genai
from google.api_core.exceptions import (
    DeadlineExceeded,
    InternalServerError,
    NotFound,
    ResourceExhausted,
    ServiceUnavailable,
    TooManyRequests,
)
from tenacity import (
    Retrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

_RETRYABLE = (
    DeadlineExceeded,
    ServiceUnavailable,
    ResourceExhausted,
    InternalServerError,
    TooManyRequests,
)


class ModelClient:
    """Gemini 2.5 client with automatic fallback pro -> flash -> flash-lite."""

    provider = "gemini"

    MODEL_MAP = {
        "pro": "gemini-2.5-pro",
        "flash": "gemini-2.5-flash",
        "flash-lite": "gemini-2.5-flash-lite",
    }
    FALLBACK_CHAIN = (
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
    )

    def __init__(self, api_key: str, default_model: str = "gemini-2.5-pro") -> None:
        if not api_key or not api_key.strip():
            raise ValueError("GEMINI_API_KEY required")
        genai.configure(api_key=api_key)
        self.api_key = api_key
        self.default_model = default_model
        self.model = default_model
        self.last_response_metadata: dict[str, Any] = {}

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str = "pro",
    ) -> str:
        return await asyncio.to_thread(
            self._generate_sync, prompt, system_instruction, model
        )

    async def chat(self, system: str, user: str) -> str:
        return await self.generate(prompt=user, system_instruction=system)

    def _generate_sync(
        self,
        prompt: str,
        system_instruction: str | None,
        requested_model: str,
    ) -> str:
        candidates = self._candidate_models(requested_model)
        last_err: Exception | None = None
        for candidate in candidates:
            try:
                return self._generate_with_retry(prompt, system_instruction, candidate)
            except NotFound as e:
                last_err = e
                continue
        raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")

    def _generate_with_retry(
        self,
        prompt: str,
        system_instruction: str | None,
        resolved_model: str,
    ) -> str:
        retryer = Retrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            retry=retry_if_exception(lambda e: isinstance(e, _RETRYABLE)),
            reraise=True,
        )
        for attempt in retryer:
            with attempt:
                return self._generate_once(prompt, system_instruction, resolved_model)
        raise RuntimeError("Retry loop exited without result")

    def _generate_once(
        self,
        prompt: str,
        system_instruction: str | None,
        resolved_model: str,
    ) -> str:
        model = genai.GenerativeModel(
            model_name=resolved_model,
            system_instruction=system_instruction,
        )
        resp = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=2048,
            ),
        )
        text = (resp.text or "").strip()
        if not text:
            raise RuntimeError(f"Empty response from {resolved_model}")

        usage = getattr(resp, "usage_metadata", None)
        self.last_response_metadata = {
            "resolved_model": resolved_model,
            "prompt_token_count": getattr(usage, "prompt_token_count", None),
            "candidates_token_count": getattr(usage, "candidates_token_count", None),
            "total_token_count": getattr(usage, "total_token_count", None),
        }
        self.model = resolved_model
        return text

    def _candidate_models(self, requested: str) -> list[str]:
        resolved = self.MODEL_MAP.get(requested, requested)
        if resolved not in self.FALLBACK_CHAIN:
            return [resolved, *self.FALLBACK_CHAIN]
        idx = self.FALLBACK_CHAIN.index(resolved)
        return list(self.FALLBACK_CHAIN[idx:])


GeminiClient = ModelClient
