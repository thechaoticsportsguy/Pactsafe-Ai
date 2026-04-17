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

# 10 expected red flags. Each entry: (label, expected sections, section_slug_keywords).
#
# Matching is STRICT — keyword-in-title is no longer accepted, because that
# gave a false 9/10 last run (e.g. a 13.2 general-indemnity flag matched
# "tax indemnity" via the "indemnif" keyword in the title).
#
# A flag is a HIT iff its section_number either:
#   (a) equals or starts with one of the numeric `sections` entries (so
#       "4.2" matches expected "4" or "4.2", but NOT "13.2" matching "13.3"),
#   OR
#   (b) contains one of the `section_slug_keywords` substrings (case
#       insensitive). This is for clauses the extractor identified by
#       heading slug instead of a number — e.g. "Time based payments;
#       Maximum Handling Time" matches ["maximum handling time"].
#
# Title/concern body is NOT searched.
EXPECTED_FLAGS: list[tuple[str, list[str], list[str]]] = [
    ("IP assignment of pre-existing/background work",
     ["5.1"],
     ["intellectual property", "ip ownership", "ownership of work", "ip assignment"]),
    ("Mandatory arbitration",
     ["17.1"],
     ["arbitration"]),
    ("Class action waiver",
     ["17.7"],
     ["class action", "class waiver"]),
    ("30-day physical-mail-only opt-out",
     ["17.10"],
     ["opt out", "opt-out"]),
    ("$500 / 3-month liability cap",
     ["14.2"],
     ["limitation of liability", "liability cap"]),
    ("Unilateral modification by Handshake",
     ["16.1"],
     ["modification", "amendment"]),
    ("Tax indemnity shifted to contractor",
     ["13.3"],
     ["tax indemnit", "tax indemnif"]),
    ("Maximum Handling Time -> unpaid work",
     ["4.2"],
     ["maximum handling time", "handling time"]),
    ("LLM / AI tool ban",
     ["7.1"],
     ["llm", "ai tool", "ai-assisted", "language model", "generative ai"]),
    ("Account monitoring / surveillance",
     ["3.6"],
     ["monitoring", "surveillance"]),
]

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
    hits = []
    misses = []
    for label, sections, keywords in EXPECTED_FLAGS:
        match = _find_flag(analysis.red_flags, sections, keywords)
        if match is not None:
            hits.append((label, match.section_number, match.severity))
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


def _find_flag(red_flags, expected_sections, section_slug_keywords):
    """Strict match: numeric section equality / prefix, OR slug substring
    in the section_number itself. Title/concern body is NOT searched —
    that produced false positives last run (e.g. "13.2 general indemnity"
    being credited as "13.3 tax indemnity" via the "indemnif" keyword)."""

    expected_lower = [s.lower() for s in expected_sections]
    for f in red_flags:
        sec = (f.section_number or "").strip().lower()
        if not sec:
            continue
        for s in expected_lower:
            # Equality, or "5.1" matches expected "5" via prefix-with-dot.
            if sec == s or sec.startswith(s + "."):
                return f

    slugs = [k.lower() for k in section_slug_keywords]
    for f in red_flags:
        sec = (f.section_number or "").lower()
        if any(slug in sec for slug in slugs):
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
