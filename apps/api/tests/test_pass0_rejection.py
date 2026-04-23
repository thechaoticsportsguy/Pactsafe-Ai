"""
Pass 0 — contract-validity gate tests.

Covers:
    • Schema round-trip: rejection fields survive JSON encode/decode
      with defaults.
    • Pipeline wiring: a monkey-patched validator returning
      is_contract=False short-circuits run_v2_pipeline, skips the
      clause extractor, and produces a rejected AnalysisResult with
      empty content + populated rejection copy.
    • Same with is_contract=True but confidence < 0.6 (low-confidence
      rejection path).
    • Edge case: the <50-char short-circuit inside
      validate_is_contract returns a rejection *without* calling the
      model.
    • Humanize map: well-known machine labels → friendly display
      strings; unknown labels → title-cased fallback.

No real Gemini traffic — every test either monkey-patches
validate_is_contract (for pipeline tests) or calls the humanizer /
schema directly (for unit tests).
"""

from __future__ import annotations

import pytest

from app.schemas import AnalysisResult
from app.services.contract_validator import (
    ContractValidation,
    validate_is_contract,
)
from app.services import v2_pipeline
from app.services.v2_pipeline import (
    _build_rejection_result,
    _humanize_doc_type,
    run_v2_pipeline,
)


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------


def test_analysis_result_defaults_not_rejected() -> None:
    """A default AnalysisResult is NOT rejected — legacy/happy path."""

    r = AnalysisResult()
    assert r.rejected is False
    assert r.rejection_reason is None
    assert r.detected_as is None


def test_rejection_fields_round_trip() -> None:
    """Rejection fields survive ``model_dump`` → ``model_validate``."""

    r = AnalysisResult(
        contract_type="Not a contract",
        rejected=True,
        rejection_reason="This looks like a ChatGPT conversation about UI edits.",
        detected_as="ChatGPT conversation",
        model_used="gemini-2.5-flash",
        provider="gemini",
    )
    restored = AnalysisResult.model_validate(r.model_dump(mode="json"))
    assert restored == r
    assert restored.rejected is True
    assert restored.detected_as == "ChatGPT conversation"


# ---------------------------------------------------------------------------
# Humanize map
# ---------------------------------------------------------------------------


def test_humanize_known_labels() -> None:
    assert _humanize_doc_type("chatgpt_conversation") == "ChatGPT conversation"
    assert _humanize_doc_type("news_article") == "News article"
    assert _humanize_doc_type("source_code") == "Source code"
    assert _humanize_doc_type("resume") == "Résumé"
    assert _humanize_doc_type("empty_or_near_empty") == "Empty or near-empty text"


def test_humanize_unknown_label_falls_back() -> None:
    """Unmapped labels get title-cased instead of leaking raw snake_case."""

    assert _humanize_doc_type("totally_new_category") == "Totally new category"


def test_humanize_empty_input_is_safe() -> None:
    assert _humanize_doc_type("") == "Unknown document"
    assert _humanize_doc_type("   ") != ""  # title-cased fallback still


# ---------------------------------------------------------------------------
# _build_rejection_result
# ---------------------------------------------------------------------------


def test_build_rejection_result_populates_copy() -> None:
    v = ContractValidation(
        is_contract=False,
        confidence=0.95,
        document_type_guess="chatgpt_conversation",
        reasoning="The text is a dialogue between a user and an AI assistant.",
    )
    r = _build_rejection_result(v)
    assert r.rejected is True
    assert r.rejection_reason == (
        "The text is a dialogue between a user and an AI assistant."
    )
    assert r.detected_as == "ChatGPT conversation"
    # Content fields intentionally zero-valued.
    assert r.red_flags == []
    assert r.risk_score == 0
    assert r.contract_type == "Not a contract"
    # Provenance set so logs / frontend can tell Pass 0 rejections apart
    # from legacy empty responses.
    assert r.model_used == "gemini-2.5-flash"
    assert r.provider == "gemini"


def test_build_rejection_result_handles_blank_reasoning() -> None:
    """A validator that returns empty reasoning still produces usable copy."""

    v = ContractValidation(
        is_contract=False,
        confidence=0.8,
        document_type_guess="unknown",
        reasoning="   ",
    )
    r = _build_rejection_result(v)
    assert r.rejection_reason
    assert r.rejection_reason.lower().strip() != ""


# ---------------------------------------------------------------------------
# Short-circuit inside validate_is_contract
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_short_input_short_circuits_without_model_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Any input under 50 chars must reject without hitting Gemini."""

    called = {"structured_call": 0}

    async def _fail_if_called(*args: object, **kwargs: object) -> object:
        called["structured_call"] += 1
        raise AssertionError("structured_call should not run for short input")

    # Patch the wrapper at the module path validate_is_contract imports from.
    monkeypatch.setattr(
        "app.services.contract_validator.structured_call",
        _fail_if_called,
    )

    v = await validate_is_contract("too short")
    assert v.is_contract is False
    assert v.confidence >= 0.6
    assert v.document_type_guess == "empty_or_near_empty"
    assert called["structured_call"] == 0


# ---------------------------------------------------------------------------
# Pipeline wiring — rejection short-circuits extract_clauses + analyze_risks
# ---------------------------------------------------------------------------


async def _fail(*args: object, **kwargs: object) -> object:
    """Any downstream pass must not run when Pass 0 rejects."""

    raise AssertionError(
        "downstream v2 pass was called for a rejected document"
    )


@pytest.mark.asyncio
async def test_pipeline_rejects_non_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_validate(_text: str) -> ContractValidation:
        return ContractValidation(
            is_contract=False,
            confidence=0.92,
            document_type_guess="chatgpt_conversation",
            reasoning="The pasted text is an AI assistant conversation, not a contract.",
        )

    monkeypatch.setattr(v2_pipeline, "validate_is_contract", _fake_validate)
    monkeypatch.setattr(v2_pipeline, "extract_clauses", _fail)
    monkeypatch.setattr(v2_pipeline, "analyze_risks", _fail)
    # Cache is sidestepped regardless (Pass 0 runs before cache lookup)
    # but patch defensively so a stale cache entry can't paper over a
    # regression in the gate.
    async def _no_cache(_text: str) -> None:
        return None

    monkeypatch.setattr(v2_pipeline, "get_cached_result", _no_cache)

    result = await run_v2_pipeline("x" * 200)  # long enough to not short-circuit

    assert result.rejected is True
    assert result.detected_as == "ChatGPT conversation"
    assert "AI assistant" in (result.rejection_reason or "")
    assert result.red_flags == []
    assert result.risk_score == 0


@pytest.mark.asyncio
async def test_pipeline_rejects_low_confidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """is_contract=True but confidence<0.6 still rejects."""

    async def _fake_validate(_text: str) -> ContractValidation:
        return ContractValidation(
            is_contract=True,
            confidence=0.45,  # below the 0.6 gate
            document_type_guess="unknown",
            reasoning="Some contractual language is present but structure is unclear.",
        )

    monkeypatch.setattr(v2_pipeline, "validate_is_contract", _fake_validate)
    monkeypatch.setattr(v2_pipeline, "extract_clauses", _fail)
    monkeypatch.setattr(v2_pipeline, "analyze_risks", _fail)

    async def _no_cache(_text: str) -> None:
        return None

    monkeypatch.setattr(v2_pipeline, "get_cached_result", _no_cache)

    result = await run_v2_pipeline("x" * 200)
    assert result.rejected is True
    assert result.rejection_reason
    # Confidence-only rejections still get a sensible detected_as fallback.
    assert result.detected_as  # non-empty string
