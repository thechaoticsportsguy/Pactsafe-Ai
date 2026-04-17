"""
Step 8 ground-truth runner — Handshake AI Contractor Agreement.

Bypasses the upload / PDF-parsing / legacy worker path. Loads the fixture
text directly and calls ``run_v2_pipeline(text)`` (which still runs Pass 1
extraction + Pass 2 analysis + validator + filter — that's the whole point
of the v2 pipeline being tested here).

Scoring criteria (from the rebuild spec):
1. metadata.document_type == "contractor_platform"
2. >=8 of 10 expected red flags appear, each with a valid section_number+quote
3. Zero forbidden concepts in any output text
4. No freelance-SOW-only missing protections leak through

Run from project root:
    USE_V2_ANALYZER=true ./.venv/Scripts/python.exe apps/api/tests/run_handshake_v2.py
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# Make `app.*` importable when this script is run as a plain file (not via
# pytest, which would otherwise inject sys.path via the package layout).
HERE = Path(__file__).resolve()
API_ROOT = HERE.parent.parent  # apps/api/
sys.path.insert(0, str(API_ROOT))

# Force-on so any code path that conditionally checks the flag sees v2.
os.environ.setdefault("USE_V2_ANALYZER", "true")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


FIXTURE = API_ROOT / "tests" / "fixtures" / "handshake_ai_contractor_agreement.txt"


# Scoring data ----------------------------------------------------------------

# 10 expected red flags. Each entry: (label, expected sections, body_keywords).
#
# Section numbers reflect the ACTUAL document (verified against the Pass-1
# extraction) — not the original spec. The spec had two stale numbers:
#     class waiver  17.7 -> 17.6  (document section: "Class Action Waiver")
#     opt-out      17.10 -> 17.12 (document section: "Your Right to Opt Out")
# Resolved as part of Step 8 cleanup; logged in v2_followups.md.
#
# A flag counts as a hit when BOTH:
#   (a) section_number aligns with one of `expected_sections`. Numeric
#       sections match by equality or sub-section prefix (so "5.1" matches
#       expected "5"). For slug-style section_numbers (the extractor's
#       fallback when a clause has no numeric ID — e.g.
#       "Time based payments; Maximum Handling Time"), section alignment
#       is auto-satisfied; the body keyword does the work.
#   AND
#   (b) at least one of `body_keywords` appears in the flag's title or
#       concern (case-insensitive substring).
#
# Both halves required: keyword alone gave a false 9/10 last cleanup
# (a "13.2 general indemnity" flag matched "tax indemnity" via "indemnif"
# in the title). Section alone is also too lenient — a flag at 13.3 talking
# about something other than tax indemnity should not credit "tax indemnity".
#
# Special case — shared section: if the model produces ONE flag at section
# 17.12 covering the entire arbitration cluster (binding arbitration +
# class waiver + opt-out), it should credit all three concerns rather than
# being penalized for not splitting. Handled by `ARBITRATION_CLUSTER` below.
EXPECTED_FLAGS: list[tuple[str, list[str], list[str]]] = [
    ("IP assignment of pre-existing/background work",
     ["5.1"],
     ["intellectual property", "ip ", "ownership", "assign", "pre-existing", "preexisting", "background"]),
    ("Mandatory arbitration",
     ["17.1", "17.12"],
     ["arbitration"]),
    ("Class action waiver",
     # Both numberings observed across runs depending on whether Pass 1
     # extracts 17.6 "Informal Dispute Resolution" as a standalone clause.
     # See v2_followups.md (D).
     ["17.6", "17.7", "17.12"],
     ["class action", "class waiver", "class, collective"]),
    ("30-day physical-mail-only opt-out",
     # Same Pass 1 shift — opt-out is 17.12 or 17.13 depending on whether
     # "Informal Dispute Resolution" got its own section. v2_followups (D).
     ["17.12", "17.13"],
     ["opt out", "opt-out"]),
    ("$500 / 3-month liability cap",
     ["14.2"],
     ["liability", "$500", "three months", "3 months", "cap"]),
    ("Unilateral modification by Handshake",
     ["16.1"],
     ["modif", "amend", "change", "unilateral"]),
    ("Tax indemnity shifted to contractor",
     ["13.3"],
     ["tax", "withholding"]),
    ("Maximum Handling Time -> unpaid work",
     ["4.2"],
     ["maximum handling time", "handling time", "unpaid"]),
    ("LLM / AI tool ban",
     ["7.1"],
     ["llm", "ai tool", "ai-assisted", "language model", "generative", "writing tool"]),
    ("Account monitoring / surveillance",
     ["3.6"],
     ["monitor", "surveillance", "screen", "tracking"]),
]

# Shared-credit handling for the arbitration cluster (binding arbitration,
# class waiver, opt-out): if the model folds them into a single flag at
# 17.12, _find_flag returns the SAME flag for each expected concern, so
# all three count as HIT off one flag. The bonus counter then dedupes by
# `id()` so the cluster flag isn't double-counted there either. No
# separate logic needed here — the strict matcher does the right thing.

FORBIDDEN_CONCEPTS: list[str] = [
    "net-60",
    "net 60",
    "net-30",
    "net 30",
    "kill fee",
    "unlimited liability",
    "unlimited revisions",
    "until client is satisfied",
    "until the client is satisfied",
    "upfront deposit",
    "50% deposit",
    "fifty percent deposit",
]

# Phrases that, in a missing_protection item's text, indicate a freelance-SOW
# template leak. If any of these show up, the type filter or Pass 2 prompt
# isn't doing its job for contractor_platform docs.
FREELANCE_LEAK_PHRASES: list[str] = [
    "kill fee",
    "scope creep",
    "revision rounds",
    "milestone payment",
    "client approval",
    "client sign-off",
    "deposit",
]


# Runner ----------------------------------------------------------------------


async def main() -> int:
    if not FIXTURE.exists():
        print(f"FATAL: fixture missing at {FIXTURE}")
        return 2
    document_text = FIXTURE.read_text(encoding="utf-8")
    print(f"Loaded fixture: {FIXTURE.name} ({len(document_text):,} chars)")

    # Import after sys.path tweak + env flag are set.
    from app.services.v2_pipeline import run_v2_pipeline
    from app.services.clause_extractor import extract_clauses
    from app.services.risk_analyzer import analyze_risks
    from app.services.citation_validator import (
        filter_missing_protections,
        validate_red_flags,
    )

    print("Pass 1: extracting clauses...")
    extraction = await extract_clauses(document_text)
    print(
        f"  doc_type={extraction.metadata.document_type} "
        f"parties={len(extraction.metadata.parties)} "
        f"clauses={len(extraction.clauses)}"
    )

    print("Pass 2: analyzing risks...")
    analysis = await analyze_risks(extraction)
    raw_flag_count = len(analysis.red_flags)
    raw_protection_count = len(analysis.missing_protections)
    print(
        f"  raw red_flags={raw_flag_count} "
        f"raw missing_protections={raw_protection_count}"
    )

    print("Firewall: validating citations + filtering protections...")
    report = validate_red_flags(analysis, extraction)
    dropped = filter_missing_protections(analysis, extraction)
    print(
        f"  accepted={len(report.accepted)} rejected={len(report.rejected)} "
        f"protections_dropped={dropped}"
    )

    # ----- Score the run -----------------------------------------------------

    print("\n" + "=" * 72)
    print("SCORING")
    print("=" * 72)

    score = {"criteria_passed": 0, "criteria_total": 4}

    # 1. document_type == contractor_platform
    print(f"\n[1] document_type")
    actual_type = extraction.metadata.document_type
    if actual_type == "contractor_platform":
        print(f"    PASS  doc_type={actual_type!r}")
        score["criteria_passed"] += 1
    else:
        print(f"    FAIL  doc_type={actual_type!r}, expected 'contractor_platform'")

    # 2. >=8 of 10 expected flags found, each with valid citation
    print(f"\n[2] expected red flags (need >=8 of 10)")
    hits: list[tuple[str, str, str]] = []
    misses: list[str] = []
    matched_flag_ids: set[int] = set()
    for label, sections, keywords in EXPECTED_FLAGS:
        match = _find_flag(analysis.red_flags, sections, keywords)
        if match is not None:
            hits.append((label, match.section_number, match.severity))
            matched_flag_ids.add(id(match))
            print(f"    HIT   {label}")
            print(f"          section={match.section_number!r} sev={match.severity}")
        else:
            misses.append(label)
            print(f"    MISS  {label}")
    print(f"    Total: {len(hits)}/10")
    if len(hits) >= 8:
        score["criteria_passed"] += 1
        print(f"    PASS")
    else:
        print(f"    FAIL  needed >=8")

    # Bonus flags — model output beyond the spec list. Non-gating; logged
    # as a canary. If this drops over time, the model is getting more
    # conservative (or the prompt got tighter without us noticing).
    print(f"\n[2b] bonus flags (non-gating)")
    bonus = [f for f in analysis.red_flags if id(f) not in matched_flag_ids]
    print(f"    Count: {len(bonus)}")
    for f in bonus:
        print(f"          [{f.severity:8}] sec={f.section_number!r}  {f.title}")

    # 3. Zero forbidden concepts anywhere in output text
    print(f"\n[3] forbidden concepts (must be zero)")
    leaks = _find_forbidden(analysis)
    if not leaks:
        print(f"    PASS  no forbidden concepts found")
        score["criteria_passed"] += 1
    else:
        print(f"    FAIL  found {len(leaks)} forbidden references:")
        for source, term, snippet in leaks[:10]:
            print(f"          [{source}] {term!r} in: {snippet!r}")

    # 4. No freelance-SOW-only protections leaked
    print(f"\n[4] freelance-SOW missing-protections leak check")
    freelance_leaks = _find_freelance_leaks(analysis)
    if not freelance_leaks:
        print(f"    PASS  no freelance-template missing-protections")
        score["criteria_passed"] += 1
    else:
        print(f"    FAIL  found {len(freelance_leaks)} freelance-template items:")
        for term, item in freelance_leaks[:5]:
            print(f"          {term!r} in: {item!r}")

    print("\n" + "=" * 72)
    print(f"RESULT: {score['criteria_passed']}/{score['criteria_total']} criteria passed")
    print("=" * 72)

    # Dump full result for inspection
    out = API_ROOT / "tests" / "fixtures" / "handshake_v2_result.json"
    out.write_text(
        json.dumps(
            {
                "extraction": extraction.model_dump(),
                "analysis": analysis.model_dump(),
                "rejected": [
                    {"reason": r.reason, "title": r.flag.title, "section": r.flag.section_number}
                    for r in report.rejected
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nFull result written to: {out}")

    return 0 if score["criteria_passed"] == score["criteria_total"] else 1


def _find_flag(red_flags, expected_sections, body_keywords):
    """Strict match — a flag must satisfy BOTH:
       (a) section_number aligns with one of `expected_sections`
       (b) at least one of `body_keywords` appears in title or concern

    Numeric expected sections match by equality or sub-section prefix
    ("5.1" matches expected "5"). Slug-style section_numbers (which the
    extractor uses when a clause has no numeric ID — e.g. "Time based
    payments; Maximum Handling Time") satisfy (a) automatically; the
    body keyword carries the burden of identification.

    Returns the FIRST flag that satisfies both, or None."""

    expected_lower = [s.lower() for s in expected_sections]
    keywords_lower = [k.lower() for k in body_keywords]

    for f in red_flags:
        sec_raw = (f.section_number or "").strip()
        if not sec_raw:
            continue
        sec = sec_raw.lower()

        # (a) section alignment
        is_numeric_section = bool(sec) and sec[0].isdigit()
        if is_numeric_section:
            section_ok = any(
                sec == s or sec.startswith(s + ".") for s in expected_lower
            )
        else:
            # Slug-style ID — section criterion is satisfied by being slug-
            # shaped at all; keyword check below decides whether it matches
            # this expected concern.
            section_ok = True

        if not section_ok:
            continue

        # (b) keyword match in title or concern body
        body = f"{f.title} {f.concern}".lower()
        if any(kw in body for kw in keywords_lower):
            return f

    return None


def _find_forbidden(analysis):
    """Search every model-generated string in the analysis for forbidden terms."""

    leaks = []
    sources: list[tuple[str, str]] = [
        ("plain_english_summary", analysis.plain_english_summary or ""),
        ("suggested_negotiation", analysis.suggested_negotiation or ""),
    ]
    for f in analysis.red_flags:
        sources.append((f"red_flag[{f.section_number}].title", f.title or ""))
        sources.append((f"red_flag[{f.section_number}].concern", f.concern or ""))
        sources.append((f"red_flag[{f.section_number}].quote", f.quote or ""))
    for p in analysis.missing_protections:
        sources.append(("missing_protection.title", p.title or ""))
        sources.append(("missing_protection.why_it_matters", p.why_it_matters or ""))

    for source, text in sources:
        low = text.lower()
        for term in FORBIDDEN_CONCEPTS:
            if term in low:
                # Skip if forbidden term appears INSIDE a verbatim quote — that
                # would mean the document itself contains it (unlikely here, but
                # would not be a hallucination). For Handshake it should never
                # appear at all, so we still want to surface it.
                idx = low.find(term)
                snippet = text[max(0, idx - 30): idx + len(term) + 30]
                leaks.append((source, term, snippet))
    return leaks


def _find_freelance_leaks(analysis):
    leaks = []
    for p in analysis.missing_protections:
        body = f"{p.title} {p.why_it_matters}".lower()
        for term in FREELANCE_LEAK_PHRASES:
            if term in body:
                leaks.append((term, f"{p.title} — {p.why_it_matters}"))
                break
    return leaks


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
