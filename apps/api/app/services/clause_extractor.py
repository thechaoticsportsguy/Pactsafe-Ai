"""
v2 Pass 1 — structured clause extraction.

Reads the full document text (no chunking — section numbering must be
preserved end-to-end) and returns a ``ClauseExtraction`` whose ``clauses``
list mirrors the document's own sectioning verbatim.

This pass does no interpretation. It must not flag risk, summarize, or
opine. Pass 2 (``risk_analyzer.py``) reasons over the structured output;
that separation is what makes hallucinations citation-checkable.
"""

from __future__ import annotations

import logging

from app.schemas.clause_extraction import ClauseExtraction
from app.services.llm.gemini_v2 import structured_call

logger = logging.getLogger(__name__)

EXTRACTION_MODEL = "gemini-2.5-flash"

# Big enough for a long contract's worth of verbatim clause text. Gemini
# 2.5 Pro's per-response cap is well above this; we keep an explicit cap
# so a runaway extraction doesn't burn the budget silently.
EXTRACTION_MAX_OUTPUT_TOKENS = 32_000

EXTRACTION_PROMPT = """You are a contract parser. Extract EVERY clause from the document below.

RULES:
- Use the document's actual section numbering (1.1, 2.3, 17.10, etc.). Do not renumber.
- The `text` field must be VERBATIM from the document. Do not summarize, paraphrase, or skip text.
- Identify the document type precisely. A contractor agreement for a gig platform (e.g. Handshake, Uber, Scale, Surge) is `contractor_platform`, NOT `freelance_sow`. A freelance SOW between a designer and a single client is `freelance_sow`. An employment contract for a W-2 employee is `employment`. Be careful here — getting this wrong cascades into the wrong analysis prompt downstream.
- If a section has sub-sections (e.g. 5.1, 5.2, 5.3), extract each as its own clause.
- If the document does not use numbered sections, fall back to a stable identifier such as the heading slug (e.g. "Termination", "Limitation-of-Liability"). Reuse the same identifier consistently — it must round-trip in Pass 2.
- Do NOT add interpretation. Do NOT flag anything. Do NOT decide what is risky. Just extract.
- Categorize each clause into one of: payment, ip_ownership, termination, liability, indemnity, confidentiality, dispute_resolution, monitoring, tax, modification, eligibility, warranties, restrictions, other.

DOCUMENT:
---
{document_text}
---
"""


async def extract_clauses(document_text: str) -> ClauseExtraction:
    """Run Pass 1 on ``document_text`` and return the structured extraction.

    The model and decoding parameters are pinned here intentionally:
    ``temperature=0.0`` for deterministic output, no thinking budget (this
    pass is mechanical — no reasoning required), and the Pro model so the
    long-context handling is reliable on large contracts.
    """

    prompt = EXTRACTION_PROMPT.format(document_text=document_text)
    extraction = await structured_call(
        prompt=prompt,
        schema=ClauseExtraction,
        model=EXTRACTION_MODEL,
        temperature=0.0,
        max_output_tokens=EXTRACTION_MAX_OUTPUT_TOKENS,
    )
    logger.info(
        "[clause_extractor] doc_type=%s parties=%d clauses=%d",
        extraction.metadata.document_type,
        len(extraction.metadata.parties),
        len(extraction.clauses),
    )
    return extraction
