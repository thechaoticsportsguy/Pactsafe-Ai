"""
Generic ground-truth runner — runs the v2 pipeline N times against each
fixture, computes per-run stability, and writes a JSON report the user
reads before grading.

Why N=5? The v2 pipeline runs at temperature 0.2, which is low but not
deterministic. Per-run variation has already bitten us once on the
Handshake fixture (class-action waiver jumped between section 17.7 and
17.12 depending on whether Pass 1 decided to split the informal
dispute-resolution clause out) — a single run is misleading. N=5 lets us
tell "reliably covered" (>=3/5 runs) apart from "sometimes covered"
(1–2/5) apart from "never covered" (0/5, the recall gap).

IMPORTANT: uses bypass_cache=True so every run re-executes Pass 0 + Pass 1 + Pass 2
against Gemini. Required for meaningful N=5 stability testing — without the bypass,
runs 2-N return the same cached result as run 1 and the "reliable_flags_3of5" metric
is measuring cache determinism, not pipeline determinism.

Cost implication: N=5 runs against a 5K-word contract costs ~$0.15-0.25 in Gemini
API calls (vs. effectively free with cache hits). Budget accordingly.

Usage (from `apps/api/`):

    # All types, 5 runs each
    ./.venv/Scripts/python.exe run_ground_truth.py --type all --runs 5

    # Just one type
    ./.venv/Scripts/python.exe run_ground_truth.py --type employment --runs 5

Output:

    tests/fixtures/ground_truth/latest_results.json   (per-run raw output)
    <console>                                          (terse summary)

The user reads the JSON, then fills in docs/v2_ground_truth.md with
manual grading. No automated grading here — "correctly flagged risk"
vs "plausible-looking but wrong" is not mechanizable.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# sys.path + env setup so this file can be run as a plain script
# (matches the pattern used by tests/run_handshake_v2.py)
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve()
API_ROOT = HERE.parent  # apps/api/
sys.path.insert(0, str(API_ROOT))

# Force-on so any code path that conditionally checks the flag sees v2.
os.environ.setdefault("USE_V2_ANALYZER", "true")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


FIXTURE_DIR = API_ROOT / "tests" / "fixtures" / "ground_truth"

DOC_TYPES: list[str] = [
    "employment",
    "nda",
    "saas_terms",
    "service_agreement",
    "freelance_sow",
]


# ---------------------------------------------------------------------------
# Stability helpers
# ---------------------------------------------------------------------------


def _flag_identity(flag: dict[str, Any]) -> str:
    """Stable identity key for a red flag across runs.

    The public ``RedFlag`` schema (see ``apps/api/app/schemas/__init__.py``)
    has no ``title`` field — the stable fields are ``section_number``,
    ``clause``, and ``severity``. We use ``section_number`` plus the first
    80 chars of ``clause`` (normalised) so a flag that cites the same
    passage across runs gets the same key even if the explanation prose
    is phrased slightly differently.

    Falls back to ``clause`` alone if ``section_number`` is null (legacy /
    non-v2 results).
    """

    section = (flag.get("section_number") or "").strip()
    clause = (flag.get("clause") or flag.get("quote") or "").strip()
    # Normalise whitespace and cap length so "A b c" and "A  b c\n" collapse.
    normalised = " ".join(clause.split())[:80]
    if section:
        return f"{section} :: {normalised}"
    return normalised or "<empty-clause>"


def _flag_display(flag: dict[str, Any]) -> str:
    """Short human label for console / JSON summary output."""

    section = (flag.get("section_number") or "").strip() or "?"
    severity = flag.get("severity") or "?"
    snippet = (flag.get("clause") or flag.get("quote") or "").strip()
    snippet = " ".join(snippet.split())[:60]
    return f"[{severity:8}] §{section:<8} {snippet}"


def _result_to_plain_dict(result: Any) -> dict[str, Any]:
    """``run_v2_pipeline`` returns a Pydantic ``AnalysisResult``. Normalise
    to a plain dict so the rest of this script stays schema-agnostic."""

    if hasattr(result, "model_dump"):
        return result.model_dump(mode="json")
    if isinstance(result, dict):
        return result
    raise TypeError(f"Unexpected result type: {type(result)!r}")


# ---------------------------------------------------------------------------
# Per-type run
# ---------------------------------------------------------------------------


async def run_one(doc_type: str, runs: int) -> dict[str, Any]:
    """Run the v2 pipeline ``runs`` times against one fixture and compute
    stability statistics. Returns a dict ready to be merged into the
    combined JSON report.
    """

    fixture_path = FIXTURE_DIR / f"{doc_type}_baseline.txt"
    if not fixture_path.is_file():
        return {"error": f"fixture missing: {fixture_path}"}

    text = fixture_path.read_text(encoding="utf-8")
    if text.strip().startswith("TODO"):
        return {
            "error": (
                f"fixture {doc_type!r} still contains the TODO placeholder. "
                f"Paste a real public contract from doc_type_sources.md "
                f"before running."
            ),
        }
    if len(text.split()) < 200:
        return {
            "error": (
                f"fixture {doc_type!r} is only {len(text.split())} words — too "
                f"short to exercise the pipeline. Aim for the size range in "
                f"doc_type_sources.md."
            ),
        }

    # Import only now — keeps the runner importable (and py_compile-able) in
    # environments where the full pipeline's deps aren't installed.
    from app.services.v2_pipeline import run_v2_pipeline  # noqa: E402

    raw_results: list[dict[str, Any]] = []
    for i in range(runs):
        print(f"  Run {i + 1}/{runs} for {doc_type}...", flush=True)
        # run_v2_pipeline takes one positional arg (document_text) plus the
        # bypass_cache kwarg (added alongside this runner). There is no
        # `source=` kwarg — any telemetry about where the call originated
        # belongs in logging, not the public pipeline signature.
        result = await run_v2_pipeline(text, bypass_cache=True)
        raw_results.append(_result_to_plain_dict(result))

    # ---- Pass 0 rejection check -------------------------------------------
    # If every run rejected the document, something's wrong with the
    # fixture rather than the prompt; surface it clearly.
    rejected_runs = [r for r in raw_results if r.get("rejected")]
    if rejected_runs and len(rejected_runs) == runs:
        reasons = Counter(r.get("rejection_reason") or "(no reason)" for r in rejected_runs)
        return {
            "doc_type_requested": doc_type,
            "runs_completed": runs,
            "all_runs_rejected": True,
            "rejection_reasons": dict(reasons),
            "raw_results": raw_results,
        }

    # ---- Stability analysis on red flags ----------------------------------
    # We key by section_number + clause-prefix (see _flag_identity). A flag
    # that appears in >=3/5 runs is "reliable"; 1-2/5 is "unstable"; 0/5
    # means either the prompt doesn't catch it or the flag never existed.
    identity_per_run: list[list[str]] = []
    identity_to_display: dict[str, str] = {}
    for run in raw_results:
        run_identities: list[str] = []
        for flag in run.get("red_flags") or []:
            key = _flag_identity(flag)
            run_identities.append(key)
            # First occurrence wins for the display label — they should be
            # equivalent across runs since identity is stable.
            identity_to_display.setdefault(key, _flag_display(flag))
        identity_per_run.append(run_identities)

    # Count distinct runs each identity appears in (not total occurrences —
    # a flag cited twice in one run still counts as 1/5).
    identity_run_count: Counter[str] = Counter()
    for run_ids in identity_per_run:
        for key in set(run_ids):
            identity_run_count[key] += 1

    reliable = sorted(
        (identity_to_display[k] for k, c in identity_run_count.items() if c >= 3),
    )
    unstable = sorted(
        (
            f"{identity_to_display[k]} ({c}/{runs})"
            for k, c in identity_run_count.items()
            if 1 <= c < 3
        ),
    )

    # ---- Detected doc_type across runs ------------------------------------
    detected = Counter()
    for run in raw_results:
        meta = run.get("metadata") or {}
        detected[str(meta.get("document_type") or "unknown")] += 1

    # ---- Missing-protection stability -------------------------------------
    # missing_protections is a list[str] in the public schema. We normalise
    # by lowercasing + whitespace-collapsing the first 80 chars so small
    # phrasing drift doesn't fragment the stability bucket.
    def _prot_key(s: str) -> str:
        return " ".join(str(s).lower().split())[:80]

    prot_run_count: Counter[str] = Counter()
    prot_display: dict[str, str] = {}
    for run in raw_results:
        seen = set()
        for prot in run.get("missing_protections") or []:
            key = _prot_key(prot)
            if not key or key in seen:
                continue
            seen.add(key)
            prot_run_count[key] += 1
            prot_display.setdefault(key, str(prot).strip())

    reliable_protections = sorted(
        (prot_display[k] for k, c in prot_run_count.items() if c >= 3),
    )
    unstable_protections = sorted(
        (
            f"{prot_display[k]} ({c}/{runs})"
            for k, c in prot_run_count.items()
            if 1 <= c < 3
        ),
    )

    return {
        "doc_type_requested": doc_type,
        "runs_completed": runs,
        "detected_types": dict(detected),
        "red_flag_count_per_run": [len(run) for run in identity_per_run],
        "missing_protection_count_per_run": [
            len(r.get("missing_protections") or []) for r in raw_results
        ],
        "risk_score_per_run": [int(r.get("risk_score") or 0) for r in raw_results],
        "reliable_flags_3of5": reliable,
        "unstable_flags_1or2of5": unstable,
        "reliable_missing_protections_3of5": reliable_protections,
        "unstable_missing_protections_1or2of5": unstable_protections,
        "raw_results": raw_results,
    }


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


async def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run v2 pipeline N times against ground-truth fixtures.",
    )
    parser.add_argument(
        "--type",
        default="all",
        help="Doc type to run, or 'all' for every non-placeholder fixture.",
    )
    parser.add_argument("--runs", type=int, default=5, help="Runs per type.")
    args = parser.parse_args()

    if args.type != "all" and args.type not in DOC_TYPES:
        print(f"Unknown --type {args.type!r}. Valid: {DOC_TYPES + ['all']}")
        return 2
    if args.runs < 1:
        print("--runs must be >= 1")
        return 2

    types_to_run = DOC_TYPES if args.type == "all" else [args.type]
    out: dict[str, Any] = {}

    for dt in types_to_run:
        print(f"\n=== Running {dt} ===", flush=True)
        out[dt] = await run_one(dt, runs=args.runs)

    output_path = FIXTURE_DIR / "latest_results.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {output_path}")

    # ---- Terse console summary --------------------------------------------
    print("\n" + "=" * 72)
    print("SUMMARY")
    print("=" * 72)
    any_ran = False
    for dt, res in out.items():
        if res.get("error"):
            print(f"  {dt}: SKIPPED — {res['error']}")
            continue
        any_ran = True
        if res.get("all_runs_rejected"):
            print(f"  {dt}: ALL {res['runs_completed']} RUNS REJECTED BY PASS 0")
            for reason, count in res.get("rejection_reasons", {}).items():
                print(f"      {count}× {reason!r}")
            continue
        print(f"  {dt}: {res['runs_completed']} runs")
        print(f"      detected_types:             {res['detected_types']}")
        print(f"      risk_score_per_run:         {res['risk_score_per_run']}")
        print(f"      red_flag_count_per_run:     {res['red_flag_count_per_run']}")
        print(f"      reliable flags (>=3/5):     {len(res['reliable_flags_3of5'])}")
        print(f"      unstable flags (1-2/5):     {len(res['unstable_flags_1or2of5'])}")
        print(
            f"      reliable missing prots:     "
            f"{len(res['reliable_missing_protections_3of5'])}"
        )
        print(
            f"      unstable missing prots:     "
            f"{len(res['unstable_missing_protections_1or2of5'])}"
        )

    if not any_ran:
        print("\n  No fixtures ran. Fill in the *_baseline.txt files (see")
        print("  tests/fixtures/ground_truth/doc_type_sources.md) and re-run.")
        return 1

    print("\nNext: read latest_results.json + grade each type in")
    print("      apps/api/docs/v2_ground_truth.md")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
