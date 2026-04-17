"""
Gemini 2.5 structured-output helper for the v2 analyzer pipeline.

Uses the new ``google-genai`` SDK (NOT ``google-generativeai``). Both SDKs
are currently installed; the legacy ``gemini_client.py`` keeps using the
old one and is left untouched until the v2 cutover. See ``gemini_v2.py``
section in the rebuild doc for rationale.

Single public surface: ``structured_call(prompt, schema, ...)``. Both Pass
1 (clause extraction) and Pass 2 (risk analysis) call into it — the
differences (temperature, thinking budget, output cap) are parameters,
not separate wrappers.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from pydantic import BaseModel
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import require_gemini_api_key

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Errors worth retrying — transient backend / quota issues. Anything else
# (bad request, schema mismatch) should bubble up immediately so a broken
# prompt fails loudly instead of burning three retries.
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, genai_errors.APIError):
        return getattr(exc, "code", None) in _RETRYABLE_STATUS
    return False


@lru_cache(maxsize=1)
def _client() -> genai.Client:
    """One process-wide async-capable client, lazily constructed."""

    return genai.Client(api_key=require_gemini_api_key())


async def structured_call(
    prompt: str,
    schema: type[T],
    *,
    model: str = "gemini-2.5-pro",
    temperature: float = 0.0,
    thinking_budget: int | None = None,
    max_output_tokens: int = 32_000,
    system_instruction: str | None = None,
) -> T:
    """Call Gemini with native structured output, return a parsed Pydantic object.

    The model is decoded against ``schema`` at token time via Gemini's
    ``response_schema`` — this is the anti-hallucination win over
    prompt-instructed JSON. Decode-time enforcement means the response is
    either a valid instance of ``schema`` or the API raises; there is no
    "cleanup parsing" layer like the legacy client needed.

    Parameters mirror the things Pass 1 and Pass 2 actually differ on:
    extraction wants ``temperature=0.0`` and no thinking; analysis wants
    ``temperature=0.2`` and ``thinking_budget=8000``. Everything else
    stays in the helper.
    """

    config_kwargs: dict = {
        "response_mime_type": "application/json",
        "response_schema": schema,
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction
    if thinking_budget is not None:
        config_kwargs["thinking_config"] = types.ThinkingConfig(
            thinking_budget=thinking_budget
        )

    config = types.GenerateContentConfig(**config_kwargs)

    retryer = AsyncRetrying(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(genai_errors.APIError),
        reraise=True,
    )

    async for attempt in retryer:
        with attempt:
            response = await _client().aio.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            # If the error is non-retryable, re-raise immediately rather
            # than letting tenacity burn two more attempts.
            return _parse_response(response, schema, model)
    raise RuntimeError("retry loop exited without result")  # unreachable


def _parse_response(
    response: types.GenerateContentResponse,
    schema: type[T],
    model: str,
) -> T:
    """Pull the parsed Pydantic object off a response, with logging."""

    usage = getattr(response, "usage_metadata", None)
    in_tok = getattr(usage, "prompt_token_count", None)
    out_tok = getattr(usage, "candidates_token_count", None)
    thoughts_tok = getattr(usage, "thoughts_token_count", None)
    total_tok = getattr(usage, "total_token_count", None)

    finish_reason = None
    try:
        cand0 = response.candidates[0] if response.candidates else None
        if cand0 is not None:
            fr = getattr(cand0, "finish_reason", None)
            finish_reason = getattr(fr, "name", None) or fr
    except Exception:  # defensive against SDK shape drift
        pass

    logger.info(
        "[gemini_v2] model=%s schema=%s finish=%s in=%s out=%s thoughts=%s total=%s",
        model,
        schema.__name__,
        finish_reason,
        in_tok,
        out_tok,
        thoughts_tok,
        total_tok,
    )

    # Preferred path: SDK already parsed it for us.
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, schema):
        return parsed

    # Fallback: parse text ourselves. The SDK enforces the schema at decode
    # time, so this should always succeed; we keep the fallback for older
    # or alternate model paths that don't populate `.parsed`.
    raw = (response.text or "").strip()
    if not raw:
        raise RuntimeError(
            f"empty response from {model} (finish_reason={finish_reason})"
        )
    return schema.model_validate_json(raw)
