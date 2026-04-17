"""
v2 Pass 2 — citation-grounded, type-aware risk analysis.

Receives the structured ``ClauseExtraction`` from Pass 1 — never raw
document text. The model can only reason about clauses that were actually
extracted, which is the structural firewall against the freelance-template
hallucinations the v1 pipeline produced.

Per-type prompts are NOT hand-written. They are slot-filled from a single
``PROMPT_SKELETON`` using ``TypeConfig`` dicts so the differences between
document types stay reviewable as data, not prose. A ``UNIVERSAL_EXCLUSIONS``
list is merged into every type's exclusion block so common hallucinations
("net-60", "kill fee", etc.) are blocked everywhere — not just on the type
the prompt-author happened to remember.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.schemas.clause_extraction import ClauseExtraction, DocumentType
from app.schemas.risk_analysis import RiskAnalysis
from app.services.llm.gemini_v2 import structured_call

logger = logging.getLogger(__name__)

ANALYSIS_MODEL = "gemini-2.5-pro"
ANALYSIS_TEMPERATURE = 0.2
# Thinking disabled as a cost reduction — ground-truth parity was verified
# before flipping this off. If red-flag quality regresses, set this back to
# 8_000 (the previous value) and re-run ``tests/run_handshake_v2.py``.
ANALYSIS_THINKING_BUDGET: int | None = None
ANALYSIS_MAX_OUTPUT_TOKENS = 16_000


# ---------------------------------------------------------------------------
# Universal exclusions — merged into EVERY type's exclusion block.
#
# These are the recurring hallucinations the v1 pipeline produced when the
# model pattern-matched "contract" → "freelance SOW template". Listing them
# globally means a per-type config can never accidentally omit one.
# ---------------------------------------------------------------------------

UNIVERSAL_EXCLUSIONS: list[str] = [
    '"Net-60" / "Net-30" / any "Net-X" payment term — unless an extracted '
    "clause literally contains those words.",
    '"Kill fee" — do not invent this concept; only mention it if a clause '
    "literally uses the term.",
    '"Unlimited revisions" / "Revision rounds" / "Until client is satisfied" '
    "— do not flag these unless the clause text literally contains them.",
    '"Upfront deposit" / "50% deposit" / "Deposit required" — same rule: '
    "must be in the extracted clause text.",
    '"Unlimited liability" / "Unlimited damages" — only flag if the clause '
    "actually fails to cap liability; do not assume.",
    "Any concept, term, dollar amount, or percentage that does not appear "
    "verbatim in the extracted clauses.",
]


# ---------------------------------------------------------------------------
# Per-type configuration. Each entry produces a slot-filled prompt via
# PROMPT_SKELETON. Adding a new document type = add a TypeConfig + register
# it in PROMPT_BY_TYPE; no new prose needed.
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TypeConfig:
    document_type_human: str
    signer_role: str
    perspective_framing: str
    focus_areas: list[str] = field(default_factory=list)
    exclusion_list: list[str] = field(default_factory=list)


CONTRACTOR_PLATFORM_CONFIG = TypeConfig(
    document_type_human=(
        "gig platform contractor agreement (e.g. Handshake AI, Scale, Surge, "
        "Uber, DoorDash — a marketplace/platform contracting with individual "
        "workers)"
    ),
    signer_role="THE CONTRACTOR (the individual signing — not the platform)",
    perspective_framing=(
        "The platform's lawyers wrote this. Your job is to spot every clause "
        "that shifts risk, money, or control from the platform to the "
        "contractor. Be especially alert to clauses that LOOK boilerplate but "
        "carry one-sided consequences (liability caps protecting only the "
        "platform, IP assignment that reaches backwards in time, arbitration "
        "with hard-to-use opt-outs)."
    ),
    focus_areas=[
        "Independent contractor classification and its consequences (no "
        "benefits, self-employment tax, no employment protections)",
        "IP assignment scope — especially whether it reaches pre-existing or "
        "background IP, or work done before the Effective Date",
        "Payment mechanics — task-based vs time-based, Maximum Handling Time "
        "caps that turn slow work into unpaid work, withholding, payment "
        "forfeiture triggers",
        "Termination — notice periods (or lack thereof), temporary "
        "deactivation rights, whether accrued/unpaid work survives",
        "Liability caps — who is protected, for how much, how the cap "
        "compares to realistic harm to the contractor",
        "Indemnity — direction (who indemnifies whom), scope (third-party "
        "claims vs everything), and any tax indemnity shifted to the contractor",
        "Dispute resolution — mandatory arbitration, class action waivers, "
        "opt-out windows AND mechanics (online form vs physical mail to a "
        "specific city — the latter is hostile design)",
        "Monitoring and surveillance — remote screen capture, automated "
        "detection, behavioral analytics",
        "Modification rights — can the platform unilaterally change the "
        "agreement at will? what notice is required?",
        "Restrictions on the contractor — LLM/AI tool bans (even Grammarly), "
        "exclusivity, record retention obligations, preparatory material "
        "retention windows",
        "Tax allocation — who bears withholding, sales tax, VAT, "
        "self-employment tax",
    ],
    exclusion_list=[
        '"Late payment fees" — irrelevant on platforms that pay on a fixed '
        "schedule.",
        '"Project scope creep" / "Out-of-scope work" — there is no per-project '
        "scope on a platform agreement.",
        '"Client approval" / "Sign-off" — there is no single client.',
    ],
)


FREELANCE_SOW_CONFIG = TypeConfig(
    document_type_human=(
        "freelance services agreement / statement of work between an "
        "independent professional and a single client"
    ),
    signer_role="THE FREELANCER (the service provider, not the client)",
    perspective_framing=(
        "The client (or the client's lawyer) wrote this. Your job is to spot "
        "clauses that leave the freelancer holding payment risk, scope risk, "
        "IP risk, or liability risk. Many freelance SOWs over-promise on "
        "behalf of the freelancer (warranties, indemnities) and under-protect "
        "their basic right to get paid on time."
    ),
    focus_areas=[
        "Payment terms — Net-X length, when invoices can be issued, whether "
        "milestones are tied to objective deliverables or subjective approval",
        "Late payment penalties or interest — and whether they exist at all",
        "Scope creep — how change requests are handled, whether revisions are "
        "bounded or open-ended",
        "Kill fee / early-termination compensation — whether the freelancer "
        "is paid for partial work if the client walks",
        "IP assignment scope — does it cover pre-existing materials, "
        "background IP, tools/templates the freelancer uses across clients?",
        "Liability caps — typically should be capped at fees paid; flag if "
        "uncapped or excludes carve-outs the freelancer can't survive",
        "Indemnity direction — freelancer indemnifying client for IP "
        "infringement is normal; the reverse is often missing",
        "Warranties — are they reasonable (work performed in a professional "
        "manner) or extreme (bug-free, perfectly fit for purpose)?",
        "Termination — notice required, whether accrued fees survive, "
        "whether the client can cancel mid-deliverable without payment",
    ],
    exclusion_list=[
        '"Platform deactivation" — there is no platform.',
        '"Maximum Handling Time" caps — that is a gig-platform construct.',
        '"Class action waiver" — uncommon in two-party freelance SOWs '
        "(only flag if literally present).",
    ],
)


EMPLOYMENT_CONFIG = TypeConfig(
    document_type_human=(
        "employment agreement (W-2 employee, not independent contractor)"
    ),
    signer_role="THE EMPLOYEE",
    perspective_framing=(
        "The employer's lawyers wrote this. The employee usually has limited "
        "negotiating power, so flag the things that quietly trade away "
        "long-term flexibility (non-competes, IP assignment, equity "
        "acceleration) in exchange for short-term compensation."
    ),
    focus_areas=[
        "At-will vs term — and any consequences of mid-term departure",
        "Non-compete — geographic scope, duration, and what activities are "
        "actually restricted",
        "Non-solicit — covering customers AND/OR employees, duration, "
        "whether 'general solicitation' is exempted",
        "IP / invention assignment — whether it reaches inventions made "
        "outside work hours and on personal equipment, prior-invention carve-outs",
        "Severance — what triggers it, how long it lasts, whether it's "
        "conditioned on a release",
        "Equity / options vesting — cliff, schedule, whether acceleration "
        "exists on change-of-control or termination without cause",
        "Confidentiality — post-termination duration, whether it conflicts "
        "with whistleblower or right-to-work laws",
        "Arbitration + class action waiver — for employment disputes, "
        "discrimination claims",
        "Garden leave / notice period",
    ],
    exclusion_list=[
        '"Kill fee" — employment concept does not exist.',
        '"Project scope" / "Revision rounds" — irrelevant.',
        '"Late payment fees" — payroll is regulated by law, not the contract.',
        '"Independent contractor" classification risks — this is a W-2 role.',
    ],
)


NDA_CONFIG = TypeConfig(
    document_type_human="non-disclosure agreement (NDA / confidentiality agreement)",
    signer_role="THE RECEIVING PARTY (the one accepting confidentiality obligations)",
    perspective_framing=(
        "NDAs that look short can still be aggressive. Focus on duration, "
        "scope of what counts as 'confidential', and whether the standard "
        "carve-outs (publicly known, independently developed, required by "
        "law) are present and reasonable."
    ),
    focus_areas=[
        "Definition of Confidential Information — is it bounded, or 'any "
        "information disclosed in any form'?",
        "Term / duration — and whether trade secrets continue indefinitely",
        "Standard carve-outs — publicly known, prior knowledge, "
        "independently developed, required by law",
        "Return / destruction obligations and the deadline",
        "Residuals clause — whether ideas retained in unaided memory are "
        "exempt",
        "Mutual vs unilateral — does the other party have the same obligations?",
        "Remedies — injunctive relief, liquidated damages, attorneys' fees",
        "Governing law and forum",
    ],
    exclusion_list=[
        '"Payment terms" — NDAs typically have no payment.',
        '"IP assignment" — NDAs restrict use; they do not transfer ownership.',
        '"Kill fee" / "Revisions" / "Deposit" — irrelevant.',
    ],
)


SAAS_TERMS_CONFIG = TypeConfig(
    document_type_human=(
        "SaaS / cloud service terms (the customer accepting the provider's terms)"
    ),
    signer_role="THE CUSTOMER (the one accepting the SaaS terms — not the provider)",
    perspective_framing=(
        "SaaS terms are almost always provider-favorable boilerplate. Focus "
        "on data ownership and exit (can the customer get their data out?), "
        "uptime + remedies (real SLA or just words?), liability caps "
        "(typically capped at 12 months fees — flag if even that is excluded), "
        "and unilateral modification rights."
    ),
    focus_areas=[
        "Data ownership and portability — who owns customer data, can it be "
        "exported, in what format, on what timeline post-termination",
        "Data security commitments — encryption, breach notification SLAs, "
        "audit rights, sub-processor disclosure",
        "Uptime SLA + actual remedies (service credits vs real damages)",
        "Termination — for cause, for convenience, what happens to data, "
        "auto-renewal mechanics",
        "Liability caps — typical is 12 months fees; flag if even-lower or "
        "with broad carve-outs that swallow the cap",
        "Unilateral modification — can the provider change the terms by "
        "posting an update?",
        "Indemnity — provider for third-party IP infringement, customer for "
        "misuse / data they upload",
        "Suspension rights — what triggers suspension, what notice is required",
        "Arbitration + class action waiver",
    ],
    exclusion_list=[
        '"Kill fee" / "Revision rounds" / "Project scope" — irrelevant.',
        '"Independent contractor" classification — irrelevant.',
        '"Late payment fees" — only flag if literally present.',
    ],
)


SERVICE_AGREEMENT_CONFIG = TypeConfig(
    document_type_human=(
        "B2B service agreement (provider delivering services to a business client)"
    ),
    signer_role=(
        "the signer — identify which side they are based on the parties list "
        "and the obligations the contract assigns"
    ),
    perspective_framing=(
        "Identify which side the signer is on first (Provider or Client), "
        "then analyze from that perspective. B2B service agreements are more "
        "balanced than gig-platform or SaaS terms, but watch for liability "
        "caps, indemnity asymmetry, and termination rights."
    ),
    focus_areas=[
        "Payment terms — Net-X if present, late fees, dispute mechanics",
        "Termination — for cause and for convenience, notice periods, wind-down",
        "Liability caps — symmetric? carve-outs? compared to realistic harm?",
        "IP ownership — work product, pre-existing IP, residuals",
        "Indemnity direction and scope",
        "Warranties + disclaimers",
        "Dispute resolution — venue, governing law, arbitration",
        "Force majeure scope",
        "Assignment / change of control",
        "Modification mechanics",
        "Confidentiality obligations and duration",
    ],
    exclusion_list=[
        '"Platform deactivation" — irrelevant.',
        '"Maximum Handling Time" — gig-platform construct.',
    ],
)


GENERIC_CONFIG = TypeConfig(
    document_type_human="contract or legal agreement",
    signer_role="the signer (identify which party from the parties list)",
    perspective_framing=(
        "Document type was not confidently classified. Analyze conservatively. "
        "Focus on universally risky patterns and avoid type-specific "
        "assumptions. If a clause's risk depends on document type, say so "
        "explicitly rather than guessing."
    ),
    focus_areas=[
        "Liability allocation — who is capped, who is exposed",
        "IP / data ownership — who owns what, transfer scope",
        "Dispute resolution — arbitration, class waivers, venue",
        "Modification rights — unilateral vs bilateral",
        "Indemnity — direction and scope",
        "Termination asymmetry — can one side exit easier than the other?",
        "Warranty + indemnity scope on the signer",
    ],
    exclusion_list=[],
)


PROMPT_BY_TYPE: dict[DocumentType, TypeConfig] = {
    "contractor_platform": CONTRACTOR_PLATFORM_CONFIG,
    "freelance_sow": FREELANCE_SOW_CONFIG,
    "employment": EMPLOYMENT_CONFIG,
    "nda": NDA_CONFIG,
    "saas_terms": SAAS_TERMS_CONFIG,
    "service_agreement": SERVICE_AGREEMENT_CONFIG,
    # Other recognized but unhandled types fall through to GENERIC_CONFIG.
}


# ---------------------------------------------------------------------------
# Shared prompt skeleton. Slot names match TypeConfig fields plus the two
# call-site values (clauses_json, doc_type).
# ---------------------------------------------------------------------------

PROMPT_SKELETON = """You are reviewing a {document_type_human} on behalf of {signer_role}.

{perspective_framing}

The extracted clauses are below. Analyze ONLY these clauses. Do NOT invent clauses. Do NOT reference concepts that aren't in the extracted text.

FOCUS AREAS for this document type:
{focus_areas_block}

FOR EACH RED FLAG:
- Cite the EXACT section_number from the extracted clauses (must match verbatim — copy-paste it from the clause's `section_number` field, do not retype or renumber).
- Quote <=300 chars VERBATIM from that clause's `text` field. Do not paraphrase.
- The quote MUST be a CONTIGUOUS substring of the clause's `text`. Do NOT use ellipses ("..." or "…"), do NOT splice phrases together with " ... ", do NOT abbreviate. If the relevant passage is longer than 300 chars, pick the most damaging contiguous span (300 chars max) and quote that — never bridge two distant sentences with an ellipsis. The downstream validator does a fuzzy substring match against the source clause; ellipses break it and the entire flag is dropped.
- Explain the concern in plain English from the signer's perspective. Concrete consequences, no jargon.
- Assign severity based on real-world impact to the signer:
  - critical = do not sign as-is
  - high = serious harm is likely; push back before signing
  - medium = real risk but survivable
  - low = minor

DO NOT INCLUDE any of these concepts (common hallucinations or type-mismatches):
{exclusion_list_block}

For `missing_protections`: each item must include `applicable_document_types` listing the document types where this protection is relevant. The downstream filter drops protections whose list does not include the current document type, so be honest — do not list a freelance-only protection as universally applicable.

EXTRACTED CLAUSES (JSON):
{clauses_json}

DOCUMENT TYPE: {doc_type}
"""


def _format_bullet_block(items: list[str]) -> str:
    if not items:
        return "- (none)"
    return "\n".join(f"- {item}" for item in items)


def _build_prompt(extraction: ClauseExtraction, config: TypeConfig) -> str:
    # Type-specific exclusions FIRST (the prompt-author's targeted call-outs),
    # then the universal list — ordering keeps the per-type framing salient
    # while ensuring the catch-all is always present.
    full_exclusions = list(config.exclusion_list) + list(UNIVERSAL_EXCLUSIONS)

    return PROMPT_SKELETON.format(
        document_type_human=config.document_type_human,
        signer_role=config.signer_role,
        perspective_framing=config.perspective_framing,
        focus_areas_block=_format_bullet_block(config.focus_areas),
        exclusion_list_block=_format_bullet_block(full_exclusions),
        clauses_json=extraction.model_dump_json(indent=2),
        doc_type=extraction.metadata.document_type,
    )


async def analyze_risks(extraction: ClauseExtraction) -> RiskAnalysis:
    """Run Pass 2 on a Pass-1 ``ClauseExtraction`` and return the analysis.

    Routing: looks up the TypeConfig for ``extraction.metadata.document_type``,
    falls back to ``GENERIC_CONFIG``. Decoding parameters: ``temperature=0.2``
    (slight creativity for plain-English explanations), ``thinking_budget=8000``
    (deeper reasoning since the analysis pass is where judgement happens),
    Pro model.
    """

    doc_type = extraction.metadata.document_type
    config = PROMPT_BY_TYPE.get(doc_type, GENERIC_CONFIG)
    using_generic = config is GENERIC_CONFIG and doc_type != "other"

    prompt = _build_prompt(extraction, config)

    logger.info(
        "[risk_analyzer] doc_type=%s config=%s clauses=%d using_generic=%s",
        doc_type,
        config.document_type_human[:40],
        len(extraction.clauses),
        using_generic,
    )

    return await structured_call(
        prompt=prompt,
        schema=RiskAnalysis,
        model=ANALYSIS_MODEL,
        temperature=ANALYSIS_TEMPERATURE,
        thinking_budget=ANALYSIS_THINKING_BUDGET,
        max_output_tokens=ANALYSIS_MAX_OUTPUT_TOKENS,
    )
