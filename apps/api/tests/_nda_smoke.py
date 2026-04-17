"""NDA freelancer-leak smoke test.

Runs the Apex Ventures mutual NDA fixture through the v2 pipeline and
asserts the output refers to the signer as "Recipient" and never as
"freelancer" (which was the leak this change set out to fix).

Run from project root:
    USE_V2_ANALYZER=true ./.venv/Scripts/python.exe apps/api/tests/_nda_smoke.py

Leading underscore keeps pytest from auto-collecting it. This is a one-shot
verification script, not a reusable test case.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
API_ROOT = HERE.parent.parent
sys.path.insert(0, str(API_ROOT))

os.environ.setdefault("USE_V2_ANALYZER", "true")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


FIXTURE = API_ROOT / "tests" / "fixtures" / "apex_ventures_mutual_nda.txt"


# Words that MUST NOT appear in NDA output. "freelancer" is the specific
# leak the user saw; the rest are collateral terms that would indicate the
# model slipped into freelance-SOW framing.
FORBIDDEN_TERMS: list[str] = [
    "freelancer",
    "freelance",
    "kill fee",
    "scope creep",
    "revision rounds",
    "milestone payment",
]

# At least one of these terms SHOULD appear in the NDA output — it is the
# signal that the model is actually using the NDA frame rather than a
# generic or mistyped one.
REQUIRED_TERM_ANY_OF: list[str] = [
    "recipient",
    "receiving party",
    "disclosing party",
]


async def main() -> int:
    if not FIXTURE.exists():
        print(f"FATAL: fixture missing at {FIXTURE}")
        return 2

    from app.services.v2_pipeline import run_v2_pipeline

    text = FIXTURE.read_text(encoding="utf-8")
    print(f"Loaded NDA fixture: {FIXTURE.name} ({len(text):,} chars)")

    result = await run_v2_pipeline(text)

    doc_type = (result.metadata.document_type if result.metadata else None)
    print(f"\ndocument_type={doc_type!r}")
    print(f"contract_type={result.contract_type!r}")
    print(f"risk_score={result.risk_score}")
    print(f"red_flags={len(result.red_flags)}")
    print(f"missing_protections={len(result.missing_protections)}")

    # Aggregate every model-generated string so we can scan for leaks.
    text_sources: list[tuple[str, str]] = [
        ("overall_summary", result.overall_summary or ""),
    ]
    for s in result.negotiation_suggestions:
        text_sources.append(("negotiation_suggestion", s or ""))
    for p in result.missing_protections:
        text_sources.append(("missing_protection", p or ""))
    for f in result.red_flags:
        text_sources.append((f"red_flag[{f.section_number}].clause", f.clause or ""))
        text_sources.append((f"red_flag[{f.section_number}].explanation", f.explanation or ""))

    print("\n" + "=" * 72)
    print("LEAK CHECK — forbidden terms")
    print("=" * 72)
    leaks: list[tuple[str, str, str]] = []
    for source, body in text_sources:
        low = body.lower()
        # Skip forbidden-term scanning on verbatim quotes — if the NDA
        # itself contains the word (unlikely here), that is not a leak.
        # The Apex fixture does not contain any of these terms.
        for term in FORBIDDEN_TERMS:
            if term in low:
                idx = low.find(term)
                snippet = body[max(0, idx - 40): idx + len(term) + 40]
                leaks.append((source, term, snippet))

    if leaks:
        print(f"FAIL  {len(leaks)} leaks found:")
        for source, term, snippet in leaks[:10]:
            print(f"  [{source}] {term!r}: {snippet!r}")
    else:
        print("PASS  no freelance-template vocabulary in output")

    print("\n" + "=" * 72)
    print("FRAME CHECK — NDA vocabulary present")
    print("=" * 72)
    all_text = " ".join(body.lower() for _, body in text_sources)
    found_terms = [t for t in REQUIRED_TERM_ANY_OF if t in all_text]
    if found_terms:
        print(f"PASS  NDA vocabulary present: {found_terms}")
    else:
        print(
            f"FAIL  none of {REQUIRED_TERM_ANY_OF} appear — model may not be "
            f"using the NDA frame"
        )

    print("\n" + "=" * 72)
    print("RED FLAGS")
    print("=" * 72)
    for f in result.red_flags:
        print(f"  [{f.severity:8}] sec={f.section_number!r}  {f.explanation[:100]}")

    print("\n" + "=" * 72)
    print("OVERALL SUMMARY")
    print("=" * 72)
    print(result.overall_summary)

    ok = not leaks and bool(found_terms) and doc_type == "nda"
    print(f"\n{'=' * 72}")
    print(f"RESULT: {'PASS' if ok else 'FAIL'}")
    print(f"  doc_type_ok   = {doc_type == 'nda'} (got {doc_type!r})")
    print(f"  no_leaks      = {not leaks}")
    print(f"  nda_frame     = {bool(found_terms)}")
    print("=" * 72)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
