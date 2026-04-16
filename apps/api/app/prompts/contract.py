"""
Contract analysis prompts — single source of truth.

These used to live in two places (contract_analyzer.py and contractAnalyzer.js).
They are now owned here, server-side only. The frontend never sees prompt text.
"""

from __future__ import annotations

SYSTEM_PROMPT = (
    "You are a senior contract attorney protecting freelancers from exploitative "
    "agreements. Analyze contracts with precision. Be direct. Use plain English "
    "— no legal jargon. Always quote specific contract language when flagging "
    "issues.\n\n"
    "OUTPUT FORMAT — STRICT:\n"
    "- Respond with ONE valid JSON object and nothing else.\n"
    "- Do NOT wrap the JSON in ```json ... ``` or any other markdown code fences.\n"
    "- Do NOT include commentary, preamble, or trailing text outside the JSON.\n"
    "- The first character of your response MUST be '{' and the last MUST be '}'."
)


def _tier_guidance(model: str) -> tuple[str, tuple[int, int], tuple[int, int], tuple[int, int]]:
    """Return a (suffix, red_flags_range, missing_range, negotiation_range).

    The home-page "flash" path should stay brief so it fits comfortably
    inside a smaller token budget (fewer, punchier items). The dedicated
    "pro" path can stretch out into a deeper review.
    """

    m = (model or "").lower()
    if m in {"flash", "flash-lite"}:
        return (
            "TIER GUIDANCE: Keep the response concise but complete. Prioritize "
            "the most important findings. Keep each explanation to 1-2 sentences.",
            (3, 5),
            (2, 4),
            (2, 4),
        )
    if m == "pro":
        return (
            "TIER GUIDANCE: Provide a comprehensive analysis. Surface every "
            "material red flag, missing protection, and actionable "
            "negotiation ask. Do NOT add filler; depth, not length.",
            (4, 7),
            (3, 5),
            (3, 5),
        )
    return ("", (3, 7), (3, 5), (3, 5))


def build_prompt(contract_text: str, model: str = "pro") -> str:
    """Return the user message asking for a strict JSON analysis.

    ``model`` selects a per-tier guidance suffix and target list sizes so
    fast (flash) runs stay inside a smaller token budget while pro runs
    get full coverage.
    """

    suffix, rf_range, mp_range, ns_range = _tier_guidance(model)
    rf_lo, rf_hi = rf_range
    mp_lo, mp_hi = mp_range
    ns_lo, ns_hi = ns_range

    return f"""Analyze this contract and return ONLY a JSON object — no markdown, no explanation outside JSON.

CONTRACT:
---
{contract_text}
---

Return EXACTLY this JSON:
{{
  "contract_type": "type of contract (e.g. Freelance Web Development Agreement)",
  "risk_score": <integer 0-100>,
  "overall_summary": "2-3 plain-English sentences summarizing the contract's fairness",
  "red_flags": [
    {{
      "clause": "exact quote or close paraphrase from the contract",
      "explanation": "why this is dangerous in plain English",
      "severity": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL"
    }}
  ],
  "missing_protections": ["what's missing and why it matters"],
  "negotiation_suggestions": ["specific actionable suggestion with example language if possible"]
}}

Rules:
- red_flags: {rf_lo}-{rf_hi} items ordered by severity (CRITICAL first)
- missing_protections: {mp_lo}-{mp_hi} items
- negotiation_suggestions: {ns_lo}-{ns_hi} specific, actionable items
- risk_score: 0=perfectly safe, 100=do not sign
- Severity: LOW=minor, MEDIUM=real risk, HIGH=serious harm likely, CRITICAL=don't sign as-is
{suffix}
"""
