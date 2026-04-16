"""
Contract analysis prompts — single source of truth.

These used to live in two places (contract_analyzer.py and contractAnalyzer.js).
They are now owned here, server-side only. The frontend never sees prompt text.
"""

from __future__ import annotations

SYSTEM_PROMPT = (
    "You are a senior contract attorney helping freelancers, creators, and "
    "small business owners spot risky language in the agreements they are "
    "about to sign. Explain like you're talking to a smart 15-year-old: use "
    "everyday words, short sentences, and concrete examples. Quote real "
    "contract language when flagging problems — no summaries. Skip legal "
    "jargon (no 'hereinbefore', 'indemnify', 'warranty disclaimer'). If you "
    "must use a term, define it in the same sentence.\n\n"
    "OUTPUT FORMAT — STRICT:\n"
    "- Respond with ONE valid JSON object and nothing else.\n"
    "- Do NOT wrap the JSON in ```json ... ``` or any other markdown code fences.\n"
    "- Do NOT include commentary, preamble, or trailing text outside the JSON.\n"
    "- The first character of your response MUST be '{' and the last MUST be '}'."
)


def _tier_guidance(
    model: str,
) -> tuple[str, tuple[int, int], tuple[int, int], tuple[int, int], tuple[int, int]]:
    """Return (suffix, red_flags_range, missing_range, negotiation_range, green_range).

    The home-page "flash" path should stay brief so it fits comfortably
    inside a smaller token budget (fewer, punchier items). The dedicated
    "pro" path can stretch out into a deeper review.
    """

    m = (model or "").lower()
    if m in {"flash", "flash-lite"}:
        return (
            "TIER GUIDANCE: Keep each explanation short (2-4 sentences) but "
            "complete — always cover what the clause does, why it matters, "
            "what could go wrong, and what to do. Prioritize the most "
            "important findings.",
            (3, 5),
            (2, 4),
            (2, 4),
            (1, 3),
        )
    if m == "pro":
        return (
            "TIER GUIDANCE: Provide a comprehensive, high-confidence review. "
            "Surface every material risk, missing protection, and actionable "
            "negotiation ask. Depth, not filler — each explanation should be "
            "3-5 sentences and genuinely help a non-lawyer decide what to do.",
            (4, 7),
            (3, 5),
            (3, 5),
            (2, 4),
        )
    return ("", (3, 7), (3, 5), (3, 5), (1, 4))


def build_prompt(contract_text: str, model: str = "pro") -> str:
    """Return the user message asking for a strict JSON analysis.

    ``model`` selects a per-tier guidance suffix and target list sizes so
    fast (flash) runs stay inside a smaller token budget while pro runs
    get full coverage.
    """

    suffix, rf_range, mp_range, ns_range, gf_range = _tier_guidance(model)
    rf_lo, rf_hi = rf_range
    mp_lo, mp_hi = mp_range
    ns_lo, ns_hi = ns_range
    gf_lo, gf_hi = gf_range

    return f"""Analyze this contract and return ONLY a JSON object — no markdown, no explanation outside JSON.

CONTRACT:
---
{contract_text}
---

Return EXACTLY this JSON shape (fields must all exist; arrays can be empty but never null):
{{
  "contract_type": "type of contract (e.g. Freelance Web Development Agreement)",
  "risk_score": <integer 0-100>,
  "overall_summary": "3-5 plain-English sentences explaining what this contract does, who benefits, and whether it's fair to sign as-is",
  "red_flags": [
    {{
      "clause": "exact quote from the contract, up to ~300 characters",
      "explanation": "Plain-English explanation with FOUR parts in this order: (1) What the clause does. (2) Why it matters to you. (3) What could realistically go wrong. (4) What you should do about it.",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }}
  ],
  "green_flags": [
    {{
      "clause": "exact quote of something that's genuinely good for you",
      "explanation": "Plain-English explanation of why this clause works in your favor and any nuance to watch for."
    }}
  ],
  "missing_protections": [
    "Short, specific description of a protection this contract lacks and why you want it. Example: 'Late payment fee — without it, the client has no financial pressure to pay on time.'"
  ],
  "negotiation_suggestions": [
    "A specific ask, written as language you could paste into an email. Example: 'Please cap our total liability at fees paid under this Agreement in the preceding 12 months.'"
  ]
}}

Rules:
- red_flags: {rf_lo}-{rf_hi} items, sorted CRITICAL → HIGH → MEDIUM → LOW.
- green_flags: {gf_lo}-{gf_hi} items. If the contract has nothing genuinely favorable, return an empty array — do not invent positives.
- missing_protections: {mp_lo}-{mp_hi} items, specific and actionable.
- negotiation_suggestions: {ns_lo}-{ns_hi} items, paste-ready.
- risk_score: 0 = perfectly safe to sign, 100 = do not sign.
- Severity scale:
  - LOW = minor annoyance, easy to live with.
  - MEDIUM = real risk but survivable.
  - HIGH = serious harm is likely; push back before signing.
  - CRITICAL = do not sign as-is.
- Writing style for every explanation: plain English, concrete, second-person ("you"). No jargon. No filler. No restating the clause as the explanation.
{suffix}
"""
