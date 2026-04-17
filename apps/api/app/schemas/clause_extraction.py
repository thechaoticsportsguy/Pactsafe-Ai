"""
v2 Pass 1 schema — structured clause extraction.

Used as `response_schema` for the Gemini 2.5 extraction call. The model
returns a `ClauseExtraction` object whose `clauses` list preserves the
document's own section numbering verbatim, with no interpretation. Pass 2
then reasons over this structured JSON instead of raw document text — that
is the anti-hallucination firewall.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

ClauseCategory = Literal[
    "payment",
    "ip_ownership",
    "termination",
    "liability",
    "indemnity",
    "confidentiality",
    "dispute_resolution",
    "monitoring",
    "tax",
    "modification",
    "eligibility",
    "warranties",
    "restrictions",
    "other",
]

DocumentType = Literal[
    "freelance_sow",
    "employment",
    "contractor_platform",
    "nda",
    "saas_terms",
    "lease",
    "service_agreement",
    "purchase_order",
    "other",
]


class ExtractedClause(BaseModel):
    section_number: str = Field(
        ...,
        description=(
            "Exact section ID as it appears in the document, e.g. '5.1', '14.2', "
            "'17.10'. Do not renumber."
        ),
    )
    heading: str = Field(..., description="Section heading verbatim from the document")
    text: str = Field(
        ...,
        description=(
            "Full clause text, VERBATIM. No summarizing, no paraphrasing, "
            "no skipping."
        ),
    )
    category: ClauseCategory


class DocumentMetadata(BaseModel):
    document_type: DocumentType
    parties: list[str]
    governing_law: Optional[str] = None
    effective_date_mentioned: bool


class ClauseExtraction(BaseModel):
    metadata: DocumentMetadata
    clauses: list[ExtractedClause]
