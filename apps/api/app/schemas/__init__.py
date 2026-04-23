"""
Pydantic schemas — the single source of truth for JSON shape exposed by the API.

The AnalysisResult shape matches the original CLI contract exactly:
    {
      "contract_type": str,
      "risk_score": int (0-100),
      "overall_summary": str,
      "red_flags": [ { clause, explanation, severity, page?, start_offset?, end_offset? } ],
      "missing_protections": [str],
      "negotiation_suggestions": [str]
    }
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
SEVERITY_ORDER: dict[str, int] = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

JobStatus = Literal[
    "queued",
    "extracting",
    "analyzing",
    "completed",
    "failed",
    # Pass 0 gate refused to analyze the document (not a contract, or
    # confidence too low). Distinct from "failed": this is a correctness
    # guardrail, not a crash — the rejection reason is carried on
    # ``AnalysisResult.rejection_reason`` + ``detected_as``.
    "rejected",
]


class RedFlag(BaseModel):
    """A single risky clause in the contract."""

    model_config = ConfigDict(extra="ignore")

    clause: str = Field(..., description="Exact or near-exact quote from the contract")
    explanation: str = Field(..., description="Plain-English explanation of the risk")
    severity: Severity = "MEDIUM"
    page: Optional[int] = Field(None, ge=1, description="1-indexed source page (PDF only)")
    start_offset: Optional[int] = Field(None, ge=0, description="Char offset in extracted text")
    end_offset: Optional[int] = Field(None, ge=0, description="Char offset end in extracted text")
    # v2 citation grounding — populated only by the v2 analyzer pipeline.
    # Legacy analyses leave these null so the frontend can render a citation
    # block when present and skip it when absent.
    section_number: Optional[str] = Field(
        None, description="Section ID from the source document, e.g. '5.1', '14.2'"
    )
    quote: Optional[str] = Field(
        None, max_length=500, description="Verbatim quote from the cited section"
    )


class GreenFlag(BaseModel):
    """A clause that works in the signer's favor."""

    model_config = ConfigDict(extra="ignore")

    clause: str = Field(..., description="Exact or near-exact quote from the contract")
    explanation: str = Field(..., description="Plain-English explanation of why this helps the signer")
    page: Optional[int] = Field(None, ge=1)
    start_offset: Optional[int] = Field(None, ge=0)
    end_offset: Optional[int] = Field(None, ge=0)


class AnalysisMetadata(BaseModel):
    """v2 pipeline metadata — carries the typed enum alongside the human
    label so the frontend can control display formatting without parsing
    ``contract_type`` back into an enum.

    Optional on the response: absent on legacy (non-v2) analyses.
    """

    model_config = ConfigDict(extra="ignore")

    document_type: Optional[str] = Field(
        None,
        description=(
            "v2 document_type enum value, e.g. 'contractor_platform'. "
            "Matches app.schemas.clause_extraction.DocumentType."
        ),
    )


class AnalysisResult(BaseModel):
    """Top-level contract analysis result."""

    model_config = ConfigDict(extra="ignore")

    contract_type: str = "Unknown Contract"
    risk_score: int = Field(0, ge=0, le=100)
    overall_summary: str = ""
    red_flags: list[RedFlag] = Field(default_factory=list)
    green_flags: list[GreenFlag] = Field(default_factory=list)
    missing_protections: list[str] = Field(default_factory=list)
    negotiation_suggestions: list[str] = Field(default_factory=list)

    # Meta
    model_used: str = ""
    provider: Optional[str] = None
    error: Optional[str] = None
    truncated: bool = False
    # v2-only: carries the document_type enum so the frontend can pick
    # its own display label. Absent on legacy responses.
    metadata: Optional[AnalysisMetadata] = None

    # Pass 0 rejection fields — populated only when the contract-validity
    # gate refused to analyze the document (non-contract input, or
    # confidence below the 0.6 threshold). When ``rejected=True`` the
    # other content fields (``red_flags``, ``risk_score``, etc.) are
    # empty/default; the frontend renders a dedicated "Not a contract"
    # state instead of the normal report. Absent/False on every legacy
    # and every successful v2 response.
    rejected: bool = False
    rejection_reason: Optional[str] = Field(
        None,
        description=(
            "One-sentence plain-English explanation of why Pass 0 refused "
            "the analysis. Surfaced verbatim in the rejection UI."
        ),
    )
    detected_as: Optional[str] = Field(
        None,
        description=(
            "Human-readable label for what Pass 0 thinks the document "
            "actually is — 'ChatGPT conversation', 'News article', "
            "'Source code', etc. Surfaced in the rejection UI as 'This "
            "looks like: {detected_as}'."
        ),
    )


# ---------------------------------------------------------------------------
# Job-related schemas (API request/response layer)
# ---------------------------------------------------------------------------


class JobCreateTextRequest(BaseModel):
    """Alternative to file upload: analyze raw text."""

    text: str = Field(..., min_length=50, max_length=200_000)


class JobCreateResponse(BaseModel):
    job_id: UUID
    status: JobStatus


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    text_preview: Optional[str] = Field(
        default=None, description="First ~500 chars of extracted text"
    )
    # Full extracted text, returned by GET /api/jobs/{id} only (NOT by the
    # list endpoint — returning 50 * 60k chars would balloon the history
    # response). Used by the clause highlighter so citations v2 produces
    # are visible in context. Optional for back-compat; older clients that
    # don't know about this field keep working on text_preview.
    document_text: Optional[str] = Field(
        default=None,
        description="Full extracted document text (single-job endpoint only)",
    )
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None


class JobProgressEvent(BaseModel):
    """Streamed to clients via WebSocket /ws/jobs/{id}."""

    job_id: UUID
    status: JobStatus
    message: str = ""
    progress: float = Field(0.0, ge=0.0, le=1.0)
    partial: Optional[AnalysisResult] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def sort_flags_by_severity(flags: list[RedFlag]) -> list[RedFlag]:
    """CRITICAL first, then HIGH, MEDIUM, LOW."""

    return sorted(flags, key=lambda f: SEVERITY_ORDER.get(f.severity, 99))
