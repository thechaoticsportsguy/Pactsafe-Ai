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

JobStatus = Literal["queued", "extracting", "analyzing", "completed", "failed"]


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
