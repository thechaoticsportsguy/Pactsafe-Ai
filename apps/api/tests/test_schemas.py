"""Validate the AnalysisResult contract stays stable."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import (
    AnalysisResult,
    RedFlag,
    sort_flags_by_severity,
)


def test_analysis_result_defaults() -> None:
    r = AnalysisResult()
    assert r.contract_type == "Unknown Contract"
    assert r.risk_score == 0
    assert r.red_flags == []
    assert r.missing_protections == []
    assert r.negotiation_suggestions == []
    assert r.truncated is False


def test_risk_score_bounds() -> None:
    with pytest.raises(ValidationError):
        AnalysisResult(risk_score=150)
    with pytest.raises(ValidationError):
        AnalysisResult(risk_score=-1)


def test_severity_literal_validated() -> None:
    with pytest.raises(ValidationError):
        RedFlag(clause="x", explanation="y", severity="NUCLEAR")  # type: ignore[arg-type]


def test_sort_critical_first() -> None:
    flags = [
        RedFlag(clause="a", explanation="low risk", severity="LOW"),
        RedFlag(clause="b", explanation="death", severity="CRITICAL"),
        RedFlag(clause="c", explanation="bad", severity="HIGH"),
        RedFlag(clause="d", explanation="meh", severity="MEDIUM"),
    ]
    order = [f.severity for f in sort_flags_by_severity(flags)]
    assert order == ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def test_round_trip_json() -> None:
    r = AnalysisResult(
        contract_type="NDA",
        risk_score=42,
        overall_summary="Decent deal.",
        red_flags=[RedFlag(clause="quote", explanation="bad", severity="HIGH", page=3)],
        missing_protections=["no cap on damages"],
        negotiation_suggestions=["add a cap"],
        model_used="qwen2.5:0.5b",
        provider="ollama",
    )
    restored = AnalysisResult.model_validate(r.model_dump(mode="json"))
    assert restored == r
