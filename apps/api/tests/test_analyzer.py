"""
Unit tests for ContractAnalyzer — uses a fake LLM client, no network.
"""

from __future__ import annotations

import json

import pytest

from app.schemas import AnalysisResult
from app.services.analyzer import ContractAnalyzer, MAX_CONTRACT_CHARS


class FakeLLM:
    provider = "fake"
    model = "fake-1"

    def __init__(self, response: str) -> None:
        self._response = response

    async def is_available(self) -> bool:  # pragma: no cover
        return True

    async def chat(self, system: str, user: str) -> str:
        return self._response


SAMPLE_JSON = json.dumps(
    {
        "contract_type": "Freelance Service Agreement",
        "risk_score": 85,
        "overall_summary": "Heavily tilted toward the client.",
        "red_flags": [
            {
                "clause": "Client may terminate this agreement at any time",
                "explanation": "Instant termination with no payment owed.",
                "severity": "CRITICAL",
            },
            {
                "clause": "unlimited revisions",
                "explanation": "Scope creep without compensation.",
                "severity": "HIGH",
            },
        ],
        "missing_protections": ["No kill fee"],
        "negotiation_suggestions": ["Add a kill fee of 50%"],
    }
)


@pytest.mark.asyncio
async def test_happy_path() -> None:
    analyzer = ContractAnalyzer(FakeLLM(SAMPLE_JSON))
    text = "FREELANCE AGREEMENT\n" + ("x" * 100)
    result: AnalysisResult = await analyzer.analyze(text)
    assert result.error is None
    assert result.risk_score == 85
    assert result.red_flags[0].severity == "CRITICAL"
    assert result.model_used == "fake-1"
    assert result.provider == "fake"


@pytest.mark.asyncio
async def test_too_short() -> None:
    analyzer = ContractAnalyzer(FakeLLM(SAMPLE_JSON))
    result = await analyzer.analyze("nope")
    assert result.error is not None
    assert "too short" in result.error.lower()


@pytest.mark.asyncio
async def test_truncation() -> None:
    analyzer = ContractAnalyzer(FakeLLM(SAMPLE_JSON))
    big = "x" * (MAX_CONTRACT_CHARS + 1000)
    result = await analyzer.analyze(big)
    assert result.truncated is True


@pytest.mark.asyncio
async def test_strips_markdown_fence() -> None:
    fenced = f"```json\n{SAMPLE_JSON}\n```"
    analyzer = ContractAnalyzer(FakeLLM(fenced))
    result = await analyzer.analyze("A" * 100)
    assert result.risk_score == 85


@pytest.mark.asyncio
async def test_garbage_response() -> None:
    analyzer = ContractAnalyzer(FakeLLM("i am a confused robot, here are some words"))
    result = await analyzer.analyze("A" * 100)
    assert result.error is not None


@pytest.mark.asyncio
async def test_severity_sorted_critical_first() -> None:
    payload = json.dumps(
        {
            "contract_type": "NDA",
            "risk_score": 30,
            "overall_summary": "ok",
            "red_flags": [
                {"clause": "a", "explanation": "low", "severity": "LOW"},
                {"clause": "b", "explanation": "crit", "severity": "CRITICAL"},
            ],
            "missing_protections": [],
            "negotiation_suggestions": [],
        }
    )
    analyzer = ContractAnalyzer(FakeLLM(payload))
    result = await analyzer.analyze("A" * 100)
    assert [f.severity for f in result.red_flags] == ["CRITICAL", "LOW"]
