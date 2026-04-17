"""
v2 firewall — citation validation.

Runs after Pass 2 (``risk_analyzer.analyze_risks``) and before any result
leaves the worker. For every red flag the model produced, this module
verifies that:

1. The cited ``section_number`` exists in the Pass-1 extraction.
2. The flag's ``quote`` actually appears (fuzzily) in the cited clause's
   ``text``.

Flags that fail either check are dropped and logged. This is the same
pattern as RxBuddy's FAERS blocklist on side-effects: generate output,
validate against the source, reject what doesn't match.

If too many flags get rejected, the right move is to fix the analyzer
prompt or the extraction pass — DO NOT lower ``min_quote_match`` to make
the warnings go away. The threshold exists precisely to catch the
hallucinations the prompt failed to suppress.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from rapidfuzz import fuzz

from app.schemas.clause_extraction import ClauseExtraction
from app.schemas.risk_analysis import RedFlag as V2RedFlag
from app.schemas.risk_analysis import RiskAnalysis

logger = logging.getLogger(__name__)

DEFAULT_MIN_QUOTE_MATCH = 85

# Models occasionally splice non-contiguous spans together with "..." or
# the U+2026 single-character ellipsis. The prompt forbids this but
# compliance is partial, so the validator tolerates it: we split on the
# ellipsis and require EACH chunk to fuzzy-match the source. That keeps
# the "every word came from the document" guarantee without forcing
# contiguity.
_ELLIPSIS_SPLIT = re.compile(r"\.{3,}|\u2026")

# Chunks shorter than this after splitting are noise (trailing punctuation,
# stray articles). We drop them rather than try to match them.
_MIN_CHUNK_LEN = 5


@dataclass(frozen=True)
class RejectedFlag:
    """A red flag the validator threw out, with the reason. Returned to
    callers so the worker can include rejection counts in its log line."""

    flag: V2RedFlag
    reason: str


@dataclass
class ValidationReport:
    accepted: list[V2RedFlag]
    rejected: list[RejectedFlag]

    @property
    def reject_rate(self) -> float:
        total = len(self.accepted) + len(self.rejected)
        return (len(self.rejected) / total) if total else 0.0


def _check_quote_against_clause(
    quote: str,
    clause_text: str,
    min_quote_match: int,
) -> str | None:
    """Return a rejection reason string, or None if the quote validates.

    Splits the quote on ellipses (``...`` or ``…``) so the model's habit of
    splicing non-contiguous spans doesn't kill otherwise grounded flags.
    Each non-trivial chunk must independently fuzzy-match the source via
    ``partial_ratio``. The reason string identifies which chunk failed and
    its score so the failure is debuggable from the warning log alone.
    """

    haystack = clause_text.lower()
    raw_chunks = _ELLIPSIS_SPLIT.split(quote)
    chunks = [c.strip() for c in raw_chunks if len(c.strip()) >= _MIN_CHUNK_LEN]

    # Empty after trimming — quote was nothing but ellipses or stray
    # punctuation. Treat as a hard reject; there's nothing to ground.
    if not chunks:
        return "quote_empty_after_split"

    for idx, chunk in enumerate(chunks):
        score = fuzz.partial_ratio(chunk.lower(), haystack)
        if score < min_quote_match:
            # Single-chunk case keeps the legacy reason format so existing
            # log greps / dashboards stay valid.
            if len(chunks) == 1:
                return f"quote_mismatch_score_{score}"
            return f"quote_mismatch_chunk_{idx}_of_{len(chunks)}_score_{score}"

    return None


def validate_red_flags(
    analysis: RiskAnalysis,
    extraction: ClauseExtraction,
    *,
    min_quote_match: int = DEFAULT_MIN_QUOTE_MATCH,
) -> ValidationReport:
    """Drop any red flag whose section + quote doesn't ground in the extraction.

    Mutates ``analysis.red_flags`` in place to the accepted subset and
    returns a report of what was kept and what was dropped (so the caller
    can log rejection counts for monitoring).
    """

    clauses_by_section = {c.section_number: c for c in extraction.clauses}
    accepted: list[V2RedFlag] = []
    rejected: list[RejectedFlag] = []

    for flag in analysis.red_flags:
        clause = clauses_by_section.get(flag.section_number)
        if clause is None:
            rejected.append(RejectedFlag(flag, "section_not_found"))
            continue

        reason = _check_quote_against_clause(
            flag.quote, clause.text, min_quote_match
        )
        if reason is not None:
            rejected.append(RejectedFlag(flag, reason))
            continue

        accepted.append(flag)

    for entry in rejected:
        logger.warning(
            "[citation_validator] rejected: title=%r section=%s reason=%s "
            "quote_head=%r",
            entry.flag.title,
            entry.flag.section_number,
            entry.reason,
            entry.flag.quote[:80],
        )

    if rejected:
        logger.info(
            "[citation_validator] kept=%d rejected=%d reject_rate=%.0f%%",
            len(accepted),
            len(rejected),
            100.0 * len(rejected) / (len(accepted) + len(rejected)),
        )

    analysis.red_flags = accepted
    return ValidationReport(accepted=accepted, rejected=rejected)


def filter_missing_protections(
    analysis: RiskAnalysis,
    extraction: ClauseExtraction,
) -> int:
    """Step 6 — drop missing-protection items whose ``applicable_document_types``
    does not include the current document type.

    Returns the count of items that were filtered out (for logging).
    """

    doc_type = extraction.metadata.document_type
    before = len(analysis.missing_protections)
    analysis.missing_protections = [
        p for p in analysis.missing_protections
        if not p.applicable_document_types
        or doc_type in p.applicable_document_types
    ]
    dropped = before - len(analysis.missing_protections)
    if dropped:
        logger.info(
            "[citation_validator] missing_protections filtered: dropped=%d "
            "remaining=%d doc_type=%s",
            dropped,
            len(analysis.missing_protections),
            doc_type,
        )
    return dropped
