"""
Pass 0 — contract-validity gate.

Runs before the v2 clause extractor and risk analyzer. A cheap Flash call
asks one yes/no question: "Is this text actually a legal contract?" If
the answer is no (or confidence < 0.6), we refuse the analysis instead
of letting the downstream passes hallucinate.

The motivating failure: a user pasted a ChatGPT conversation about UI
palette edits and the pipeline returned 16 invented "clauses", 7 fake
red flags, and a 100/100 critical risk score — including a fabricated
"credential-sharing liability" finding. For a contract-review tool,
inventing findings on non-contract input is worse than refusing to
analyze at all; users trust our output, and once trust breaks it doesn't
come back.

Implementation notes:
    • Flash (``gemini-2.5-flash``) is cheap enough that per-analysis
      overhead is negligible compared to the Pro clause-extraction pass
      this gate protects. At list price the Pass 0 call costs <$0.001.
    • We feed Flash only the first 8 000 chars. That's plenty to spot
      the telltales of a contract (named parties, consideration,
      "shall"/"hereby"/"indemnify", numbered sections) without paying
      for a 60 000-char Handshake-style doc.
    • ``thinking_budget=0`` — classification is a pattern-match task,
      no benefit from chain-of-thought.
    • ``temperature=0.0`` — we want determinism; re-submitting the same
      input should always produce the same classification.
    • Uses the existing ``structured_call`` wrapper from v2. No new SDK
      integration.
"""

from __future__ import annotations

import logging

from pydantic import BaseModel, ConfigDict, Field

from app.services.llm.gemini_v2 import structured_call

logger = logging.getLogger(__name__)


# First 8 000 chars fed to Flash. Enough signal without over-paying.
_VALIDATION_SAMPLE_CHARS = 8_000

# Any input shorter than this is an automatic reject without a Flash
# call — nothing meaningful to classify.
_MIN_CLASSIFIABLE_CHARS = 50

_VALIDATION_MODEL = "gemini-2.5-flash"


class ContractValidation(BaseModel):
    """Structured output for Pass 0.

    Kept deliberately small — Flash should spend its 400-token output
    budget on a yes/no decision plus one sentence of justification, not
    on summarizing the document.
    """

    model_config = ConfigDict(extra="ignore")

    is_contract: bool = Field(
        ...,
        description="True if the document appears to be a legal contract.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Self-reported confidence in the classification, 0.0–1.0.",
    )
    document_type_guess: str = Field(
        ...,
        description=(
            "Short machine-readable label for what this document *is*. "
            "Examples: 'employment_contract', 'nda', 'service_agreement' "
            "for contracts; 'chatgpt_conversation', 'news_article', "
            "'source_code', 'recipe', 'resume', 'empty' for non-contracts."
        ),
    )
    reasoning: str = Field(
        ...,
        description=(
            "One short sentence explaining the classification. Shown to "
            "users as part of the rejection UI when is_contract=false, "
            "so keep it plain-English and non-patronizing."
        ),
    )


_VALIDATOR_PROMPT = """\
You are the input gate for a contract-analysis tool. Your ONE job is to
decide whether the text below is a LEGAL CONTRACT worth analyzing — or
something else that got pasted by mistake.

A CONTRACT has most of these telltales:
  • Named or placeholder parties ("the Company", "Contractor", "Client",
    "Landlord and Tenant", an actual company name followed by "Inc." or
    "LLC").
  • Consideration — payment, services rendered, a grant of rights, an
    exchange of some kind.
  • Obligations, promises, or restrictions phrased as rules ("shall",
    "must", "will not", "agrees to", "hereby").
  • Legal structure — numbered sections or headings, defined terms
    (usually capitalized), a signature block, or boilerplate language
    like "indemnify", "terminate", "governing law", "entire agreement".

NOT a contract (these should ALL be rejected):
  • ChatGPT / Claude / AI assistant conversation transcripts.
  • News articles, blog posts, essays, opinion pieces.
  • Source code, config files, JSON / YAML / XML.
  • Recipes, instructions, user manuals, README files.
  • Résumés, cover letters, job descriptions (unless they are an actual
    employment CONTRACT with obligations and signatures).
  • Plain invoices or receipts WITHOUT surrounding contractual terms.
  • Text ABOUT a contract (e.g. someone describing a contract or asking
    questions about one). Discussion-of-contract is NOT a contract.
  • Empty or near-empty text, gibberish, obvious stubs or placeholders.

Be STRICT. This tool's downstream passes can and will hallucinate
clauses and risks if given non-contract input. It is much better to
reject a borderline document and ask the user to verify than to produce
invented findings.

If you are not confident this is a real, complete contract, set
``is_contract=false`` AND set ``confidence`` below 0.6. The downstream
gate treats confidence<0.6 as a rejection.

Respond ONLY with the structured JSON. Keep ``reasoning`` to one short
sentence in plain English.

--- BEGIN DOCUMENT ---
{sample}
--- END DOCUMENT ---
"""


async def validate_is_contract(document_text: str) -> ContractValidation:
    """Run Pass 0 against ``document_text``.

    Returns a ``ContractValidation`` the caller can then use to decide
    whether to proceed with Pass 1. The caller is responsible for the
    ``is_contract and confidence >= 0.6`` gate — this function just
    runs the classifier.

    Short inputs (<50 chars) are rejected without a model call to save
    a pointless Flash round-trip on obvious non-starters.
    """

    sample = (document_text or "").strip()[:_VALIDATION_SAMPLE_CHARS]

    if len(sample) < _MIN_CLASSIFIABLE_CHARS:
        # Degenerate case — nothing to classify. Return an explicit
        # rejection so the caller treats it uniformly with a model-
        # driven rejection.
        logger.info(
            "[pass0] short-circuit reject: len=%d < %d",
            len(sample),
            _MIN_CLASSIFIABLE_CHARS,
        )
        return ContractValidation(
            is_contract=False,
            confidence=1.0,
            document_type_guess="empty_or_near_empty",
            reasoning=(
                "The submitted text is too short to be a complete legal contract."
            ),
        )

    prompt = _VALIDATOR_PROMPT.format(sample=sample)

    validation = await structured_call(
        prompt,
        ContractValidation,
        model=_VALIDATION_MODEL,
        temperature=0.0,
        thinking_budget=0,
        max_output_tokens=400,
    )

    logger.info(
        "[pass0] is_contract=%s confidence=%.2f doc_type=%s",
        validation.is_contract,
        validation.confidence,
        validation.document_type_guess,
    )

    return validation
