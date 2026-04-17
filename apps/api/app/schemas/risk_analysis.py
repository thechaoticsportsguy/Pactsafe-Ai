"""
v2 Pass 2 schema — citation-grounded risk analysis.

Used as `response_schema` for the Gemini 2.5 analysis call. Every red flag
must reference a `section_number` that exists in the Pass-1 extraction and
quote ≤300 chars verbatim from that section. The downstream citation
validator (`services/citation_validator.py`) drops any flag whose quote
doesn't fuzzy-match its cited clause.

This is an internal schema. The worker layer maps it to the existing
public `AnalysisResult` shape so the frontend contract stays stable.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

V2Severity = Literal["critical", "high", "medium", "low"]
V2RiskLevel = Literal["low", "medium", "high", "critical"]


# Length caps used to be `max_length=` (hard reject). The model occasionally
# overshoots — usually by appending one extra clause to a quote, or by
# producing a slightly verbose concern. Hard-rejecting kills the WHOLE
# analysis, which is far worse than a truncated quote. We keep the caps as
# soft truncation here and rely on the prompt to do most of the work.

_QUOTE_MAX = 300
_CONCERN_MAX = 500
_TITLE_MAX = 80
_SUMMARY_MAX = 1200


def _truncate(value: str, limit: int) -> str:
    if value is None:
        return value
    s = str(value)
    return s if len(s) <= limit else s[:limit].rstrip()


class RedFlag(BaseModel):
    severity: V2Severity
    title: str = Field(..., description="Short UI label")
    section_number: str = Field(
        ...,
        description="MUST match a section_number from extracted clauses",
    )
    quote: str = Field(..., description="Verbatim quote from the clause, <=300 chars")
    concern: str = Field(..., description="Why this harms the signer, in plain English")
    category: str

    @field_validator("title", mode="before")
    @classmethod
    def _trim_title(cls, v):  # type: ignore[no-untyped-def]
        return _truncate(v, _TITLE_MAX)

    @field_validator("quote", mode="before")
    @classmethod
    def _trim_quote(cls, v):  # type: ignore[no-untyped-def]
        return _truncate(v, _QUOTE_MAX)

    @field_validator("concern", mode="before")
    @classmethod
    def _trim_concern(cls, v):  # type: ignore[no-untyped-def]
        return _truncate(v, _CONCERN_MAX)


class MissingProtection(BaseModel):
    title: str
    why_it_matters: str
    applicable_document_types: list[str] = Field(
        default_factory=list,
        description=(
            "Document types where this protection is relevant. The worker "
            "filters out any protection whose list does not include the "
            "current document_type."
        ),
    )


class RiskAnalysis(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    risk_level: V2RiskLevel
    plain_english_summary: str
    red_flags: list[RedFlag]
    missing_protections: list[MissingProtection]
    suggested_negotiation: Optional[str] = None

    @field_validator("plain_english_summary", mode="before")
    @classmethod
    def _trim_summary(cls, v):  # type: ignore[no-untyped-def]
        return _truncate(v, _SUMMARY_MAX)
