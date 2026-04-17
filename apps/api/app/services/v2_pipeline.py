"""
v2 analyzer pipeline orchestrator.

Pulls together the four v2 stages and maps the internal v2 schema back to
the public ``AnalysisResult`` shape so the frontend contract stays stable:

    Pass 1: extract_clauses        (clause_extractor.py)
    Pass 2: analyze_risks          (risk_analyzer.py)
    Firewall: validate_red_flags   (citation_validator.py)
    Filter: filter_missing_protections

Then ``_to_public_result`` converts the v2 ``RiskAnalysis`` into the
existing ``AnalysisResult`` so callers (and the frontend) see the same
fields they always have, plus the additive ``section_number`` / ``quote``
on each red flag.
"""

from __future__ import annotations

import logging

from app.schemas import (
    AnalysisResult,
    GreenFlag,
    RedFlag as PublicRedFlag,
    sort_flags_by_severity,
)
from app.schemas.clause_extraction import ClauseExtraction, DocumentType
from app.schemas.risk_analysis import (
    MissingProtection as V2MissingProtection,
    RedFlag as V2RedFlag,
    RiskAnalysis,
)
from app.services.citation_validator import (
    filter_missing_protections,
    validate_red_flags,
)
from app.services.clause_extractor import extract_clauses
from app.services.risk_analyzer import ANALYSIS_MODEL, analyze_risks

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public-facing display strings.
#
# Hardcoded explicitly, NOT derived via .replace("_", " ").title() — naive
# title-casing turns "saas_terms" into "Saas Terms" and drops "Agreement"
# from "contractor_platform". The whole point of the lookup is to control
# the exact capitalization and phrasing the user sees.
# ---------------------------------------------------------------------------

DOCUMENT_TYPE_LABELS: dict[str, str] = {
    "contractor_platform": "Contractor Platform Agreement",
    "freelance_sow": "Freelance Services Agreement",
    "employment": "Employment Agreement",
    "nda": "Non-Disclosure Agreement",
    "saas_terms": "SaaS Terms of Service",
    "service_agreement": "Service Agreement",
    "lease": "Lease Agreement",
    "purchase_order": "Purchase Order",
    "other": "Contract",
}


_SEVERITY_UPPERCASE: dict[str, str] = {
    "critical": "CRITICAL",
    "high": "HIGH",
    "medium": "MEDIUM",
    "low": "LOW",
}


# Trailing punctuation we strip off `title` before joining with `concern`,
# so we don't render "Unlimited liability!. The cap is..." when the model
# decides to be expressive.
_TITLE_TRIM_CHARS = ".!?;:—-"


def _format_explanation(title: str, concern: str) -> str:
    """Combine v2 ``title`` + ``concern`` into the legacy ``explanation`` string.

    The title is the punchy headline; the concern is the plain-English
    consequence. Together they give the existing frontend the same
    structure the legacy explanation field carried (headline + detail).
    """

    cleaned_title = (title or "").strip().rstrip(_TITLE_TRIM_CHARS).strip()
    cleaned_concern = (concern or "").strip()
    if not cleaned_title:
        return cleaned_concern
    if not cleaned_concern:
        return cleaned_title
    return f"{cleaned_title}. {cleaned_concern}"


def _v2_flag_to_public(v2: V2RedFlag) -> PublicRedFlag:
    """Map a v2 RedFlag to the existing public RedFlag shape.

    - quote is populated as BOTH `clause` (legacy renderer) and `quote`
      (new citation block). Same verbatim string in both fields.
    - severity is uppercased (v2 uses lowercase per spec, public uses
      uppercase per the existing schema).
    - title is folded into explanation since the public schema has no
      title field.
    - category is dropped (no public field).
    """

    return PublicRedFlag(
        clause=v2.quote,
        explanation=_format_explanation(v2.title, v2.concern),
        severity=_SEVERITY_UPPERCASE.get(v2.severity, "MEDIUM"),  # type: ignore[arg-type]
        section_number=v2.section_number,
        quote=v2.quote,
    )


def _format_missing_protection(p: V2MissingProtection) -> str:
    """Public schema is list[str]; format as 'Title — why_it_matters'."""

    title = (p.title or "").strip()
    why = (p.why_it_matters or "").strip()
    if title and why:
        return f"{title} — {why}"
    return title or why


def _human_label(doc_type: DocumentType) -> str:
    return DOCUMENT_TYPE_LABELS.get(doc_type, "Contract")


def _to_public_result(
    extraction: ClauseExtraction,
    analysis: RiskAnalysis,
) -> AnalysisResult:
    """Map v2 RiskAnalysis (internal) → public AnalysisResult shape."""

    public_flags = [_v2_flag_to_public(f) for f in analysis.red_flags]

    negotiation_suggestions: list[str] = []
    if analysis.suggested_negotiation and analysis.suggested_negotiation.strip():
        negotiation_suggestions.append(analysis.suggested_negotiation.strip())

    return AnalysisResult(
        contract_type=_human_label(extraction.metadata.document_type),
        risk_score=max(0, min(100, int(analysis.overall_score))),
        overall_summary=analysis.plain_english_summary.strip(),
        red_flags=sort_flags_by_severity(public_flags),
        green_flags=[],  # v2 schema does not produce green flags yet
        missing_protections=[
            _format_missing_protection(p) for p in analysis.missing_protections
        ],
        negotiation_suggestions=negotiation_suggestions,
        model_used=ANALYSIS_MODEL,
        provider="gemini",
    )


async def run_v2_pipeline(document_text: str) -> AnalysisResult:
    """Full v2 pipeline → public ``AnalysisResult``.

    Stage timings + reject counts are logged so the worker logs surface
    hallucination rate the same way RxBuddy's FAERS rejections did.
    """

    extraction = await extract_clauses(document_text)

    analysis = await analyze_risks(extraction)

    raw_flag_count = len(analysis.red_flags)
    raw_protection_count = len(analysis.missing_protections)

    validation = validate_red_flags(analysis, extraction)
    dropped_protections = filter_missing_protections(analysis, extraction)

    logger.info(
        "[v2_pipeline] complete doc_type=%s clauses=%d "
        "raw_flags=%d kept_flags=%d rejected_flags=%d "
        "raw_protections=%d kept_protections=%d dropped_protections=%d",
        extraction.metadata.document_type,
        len(extraction.clauses),
        raw_flag_count,
        len(validation.accepted),
        len(validation.rejected),
        raw_protection_count,
        len(analysis.missing_protections),
        dropped_protections,
    )

    return _to_public_result(extraction, analysis)
