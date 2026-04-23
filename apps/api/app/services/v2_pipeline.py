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
    AnalysisMetadata,
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
from app.services.contract_validator import (
    ContractValidation,
    validate_is_contract,
)
from app.services.result_cache import (
    cache_result,
    cache_stats,
    get_cached_result,
)
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


# Pass 0 returns machine-readable labels like ``chatgpt_conversation`` for
# non-contracts. We map the common ones to display strings; anything else
# falls back to a title-cased version of the underscore-separated token.
_NON_CONTRACT_TYPE_LABELS: dict[str, str] = {
    "chatgpt_conversation": "ChatGPT conversation",
    "ai_assistant_conversation": "AI assistant conversation",
    "news_article": "News article",
    "blog_post": "Blog post",
    "essay": "Essay or opinion piece",
    "source_code": "Source code",
    "config_file": "Config file",
    "json": "JSON data",
    "yaml": "YAML file",
    "recipe": "Recipe",
    "instructions": "Instructions",
    "manual": "User manual",
    "readme": "README file",
    "resume": "Résumé",
    "cv": "CV",
    "cover_letter": "Cover letter",
    "job_description": "Job description",
    "invoice": "Invoice",
    "receipt": "Receipt",
    "discussion_of_contract": "Discussion about a contract (not a contract itself)",
    "empty_or_near_empty": "Empty or near-empty text",
    "gibberish": "Unreadable text",
    "unknown": "Unknown document",
}


def _humanize_doc_type(raw: str) -> str:
    """Turn a Pass 0 machine label into a user-facing display string."""

    if not raw:
        return "Unknown document"
    key = raw.strip().lower()
    if key in _NON_CONTRACT_TYPE_LABELS:
        return _NON_CONTRACT_TYPE_LABELS[key]
    # Fall back to title-casing so even a label we haven't mapped yet
    # comes out looking intentional instead of raw.
    return key.replace("_", " ").strip().capitalize() or "Unknown document"


def _build_rejection_result(validation: ContractValidation) -> AnalysisResult:
    """Materialize a Pass 0 refusal as an ``AnalysisResult``.

    All content fields stay at their zero-values — the frontend branches
    on ``rejected=True`` and renders a "Not a contract" panel instead of
    the normal report. The rejection_reason + detected_as fields carry
    the copy the UI surfaces.
    """

    return AnalysisResult(
        # Content fields deliberately empty.
        contract_type="Not a contract",
        risk_score=0,
        overall_summary="",
        red_flags=[],
        green_flags=[],
        missing_protections=[],
        negotiation_suggestions=[],
        # Meta — flag the pipeline that produced the decision so the
        # frontend / logs can tell Pass 0 rejections apart from legacy
        # back-ends that might happen to return empty results.
        model_used="gemini-2.5-flash",
        provider="gemini",
        rejected=True,
        rejection_reason=(validation.reasoning or "").strip()
        or "This document doesn't look like a legal contract.",
        detected_as=_humanize_doc_type(validation.document_type_guess),
    )


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
        metadata=AnalysisMetadata(
            document_type=extraction.metadata.document_type,
        ),
    )


async def run_v2_pipeline(document_text: str) -> AnalysisResult:
    """Full v2 pipeline → public ``AnalysisResult``.

    Pipeline order:
        Pass 0: validate_is_contract      (contract_validator.py)
        Pass 1: extract_clauses           (clause_extractor.py)
        Pass 2: analyze_risks             (risk_analyzer.py)
        Firewall: validate_red_flags      (citation_validator.py)
        Filter: filter_missing_protections

    Pass 0 is the contract-validity gate and runs BEFORE the result cache
    is consulted — we do not want to serve a cached rejection decision in
    case Flash's classification judgment changes, and we do not want to
    serve a cached "success" analysis if the same bytes are re-submitted
    (cache is still a win on the happy path, so we check it after Pass 0
    passes).

    SHA-256 of ``document_text`` is checked against the result cache
    only once Pass 0 approves the document. A hit skips both downstream
    passes entirely and logs ``cache_hit=true``; a miss runs the
    pipeline and stores the result for 24 h so a user re-uploading the
    same file pays nothing.

    Stage timings + reject counts are logged so the worker logs surface
    hallucination rate the same way RxBuddy's FAERS rejections did.
    """

    # ---- Pass 0 — contract-validity gate ----
    # Refuse non-contract input before burning Pro tokens on clause
    # extraction. A pasted ChatGPT transcript, news article, or snippet
    # of code will produce a confident "is_contract=false" here; the
    # downstream passes never run and the worker flips the job to
    # status="rejected" instead of "completed".
    validation = await validate_is_contract(document_text)
    if (not validation.is_contract) or validation.confidence < 0.6:
        logger.info(
            "[v2_pipeline] pass0 rejected is_contract=%s confidence=%.2f "
            "doc_type=%s reason=%r",
            validation.is_contract,
            validation.confidence,
            validation.document_type_guess,
            (validation.reasoning or "")[:120],
        )
        # Never cache rejections — a user who copy-pastes slightly
        # different text should always go through Pass 0 again.
        return _build_rejection_result(validation)

    cached = await get_cached_result(document_text)
    if cached is not None:
        stats = cache_stats()
        logger.info(
            "[v2_pipeline] cache_hit=true hits=%d misses=%d hit_rate=%.2f%%",
            stats["hits"],
            stats["misses"],
            100.0 * float(stats["hit_rate"]),
        )
        return cached

    extraction = await extract_clauses(document_text)

    analysis = await analyze_risks(extraction)

    raw_flag_count = len(analysis.red_flags)
    raw_protection_count = len(analysis.missing_protections)

    # Renamed from `validation` to avoid type-clash with the Pass 0
    # ``ContractValidation`` bound earlier in this function. Pylance /
    # mypy saw the reassignment as "this variable changes type
    # mid-function" which isn't true — two distinct concepts share a
    # generic English name. Downstream logging is the only consumer.
    citation_report = validate_red_flags(analysis, extraction)
    dropped_protections = filter_missing_protections(analysis, extraction)

    logger.info(
        "[v2_pipeline] complete cache_hit=false doc_type=%s clauses=%d "
        "raw_flags=%d kept_flags=%d rejected_flags=%d "
        "raw_protections=%d kept_protections=%d dropped_protections=%d",
        extraction.metadata.document_type,
        len(extraction.clauses),
        raw_flag_count,
        len(citation_report.accepted),
        len(citation_report.rejected),
        raw_protection_count,
        len(analysis.missing_protections),
        dropped_protections,
    )

    result = _to_public_result(extraction, analysis)
    await cache_result(document_text, result)
    return result
