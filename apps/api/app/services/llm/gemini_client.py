"""Google Gemini client — google-generativeai SDK with 2.5 fallback chain."""

from __future__ import annotations

import asyncio
import logging
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

logger = logging.getLogger(__name__)

_RETRYABLE = (
    DeadlineExceeded,
    ServiceUnavailable,
    ResourceExhausted,
    InternalServerError,
    TooManyRequests,
)

# Gemini finish_reason enum values we care about. The SDK returns them as
# integers (older SDK) or enum-like objects (newer SDK); we compare via
# the `.name` attr when present, falling back to the int.
_FINISH_MAX_TOKENS = 2  # MAX_TOKENS — response hit the output cap


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
        max_output_tokens: int = 8000,
        temperature: float = 0.1,
    ) -> str:
        return await asyncio.to_thread(
            self._generate_sync,
            prompt,
            system_instruction,
            model,
            max_output_tokens,
            temperature,
        )

    async def chat(self, system: str, user: str) -> str:
        return await self.generate(prompt=user, system_instruction=system)

    def _generate_sync(
        self,
        prompt: str,
        system_instruction: str | None,
        requested_model: str,
        max_output_tokens: int,
        temperature: float,
    ) -> str:
        candidates = self._candidate_models(requested_model)
        last_err: Exception | None = None
        for candidate in candidates:
            try:
                return self._generate_with_retry(
                    prompt,
                    system_instruction,
                    candidate,
                    max_output_tokens,
                    temperature,
                )
            except NotFound as e:
                last_err = e
                continue
        raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")

    def _generate_with_retry(
        self,
        prompt: str,
        system_instruction: str | None,
        resolved_model: str,
        max_output_tokens: int,
        temperature: float,
    ) -> str:
        retryer = Retrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            retry=retry_if_exception(lambda e: isinstance(e, _RETRYABLE)),
            reraise=True,
        )
        for attempt in retryer:
            with attempt:
                return self._generate_once(
                    prompt,
                    system_instruction,
                    resolved_model,
                    max_output_tokens,
                    temperature,
                )
        raise RuntimeError("Retry loop exited without result")

    def _generate_once(
        self,
        prompt: str,
        system_instruction: str | None,
        resolved_model: str,
        max_output_tokens: int,
        temperature: float,
    ) -> str:
        model = genai.GenerativeModel(
            model_name=resolved_model,
            system_instruction=system_instruction,
        )
        resp = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            ),
        )
        text = (resp.text or "").strip()
        if not text:
            raise RuntimeError(f"Empty response from {resolved_model}")

        # Detect hard MAX_TOKENS truncation so the analyzer layer can log
        # and (if desired) retry with a higher budget. We don't raise here
        # — a truncated JSON is still sometimes repairable downstream —
        # but we flag it on `last_response_metadata`.
        finish_reason = None
        truncated_by_max_tokens = False
        try:
            cand0 = resp.candidates[0] if resp.candidates else None  # type: ignore[attr-defined]
            if cand0 is not None:
                fr = getattr(cand0, "finish_reason", None)
                finish_reason = getattr(fr, "name", None) or fr
                if finish_reason == "MAX_TOKENS" or fr == _FINISH_MAX_TOKENS:
                    truncated_by_max_tokens = True
        except Exception:  # pragma: no cover — defensive against SDK shape drift
            pass

        usage = getattr(resp, "usage_metadata", None)
        prompt_tokens = getattr(usage, "prompt_token_count", None)
        out_tokens = getattr(usage, "candidates_token_count", None)
        total_tokens = getattr(usage, "total_token_count", None)

        self.last_response_metadata = {
            "resolved_model": resolved_model,
            "prompt_token_count": prompt_tokens,
            "candidates_token_count": out_tokens,
            "total_token_count": total_tokens,
            "max_output_tokens": max_output_tokens,
            "finish_reason": finish_reason,
            "truncated_by_max_tokens": truncated_by_max_tokens,
            "response_chars": len(text),
        }

        log_level = logging.WARNING if truncated_by_max_tokens else logging.INFO
        logger.log(
            log_level,
            "[gemini] call done model=%s finish=%s in_tokens=%s out_tokens=%s "
            "max_output_tokens=%s response_chars=%d truncated=%s",
            resolved_model,
            finish_reason,
            prompt_tokens,
            out_tokens,
            max_output_tokens,
            len(text),
            truncated_by_max_tokens,
        )

        self.model = resolved_model
        return text

    def _candidate_models(self, requested: str) -> list[str]:
        resolved = self.MODEL_MAP.get(requested, requested)
        if resolved not in self.FALLBACK_CHAIN:
            return [resolved, *self.FALLBACK_CHAIN]
        idx = self.FALLBACK_CHAIN.index(resolved)
        return list(self.FALLBACK_CHAIN[idx:])


GeminiClient = ModelClient
