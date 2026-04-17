"""Smoke test — call run_v2_pipeline twice on the same input and verify
the second call is served from cache (logs ``cache_hit=true``).

Run from project root:
    USE_V2_ANALYZER=true ./.venv/Scripts/python.exe apps/api/tests/_cache_smoke.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve()
API_ROOT = HERE.parent.parent
sys.path.insert(0, str(API_ROOT))

os.environ.setdefault("USE_V2_ANALYZER", "true")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


async def main() -> int:
    from app.services.result_cache import cache_stats
    from app.services.v2_pipeline import run_v2_pipeline

    fixture = API_ROOT / "tests" / "fixtures" / "handshake_ai_contractor_agreement.txt"
    text = fixture.read_text(encoding="utf-8")

    print("=== Run 1 (miss expected) ===")
    t0 = time.perf_counter()
    r1 = await run_v2_pipeline(text)
    t1 = time.perf_counter() - t0
    print(f"run1 took {t1:.1f}s  flags={len(r1.red_flags)}  stats={cache_stats()}")

    print("\n=== Run 2 (hit expected) ===")
    t0 = time.perf_counter()
    r2 = await run_v2_pipeline(text)
    t2 = time.perf_counter() - t0
    print(f"run2 took {t2:.1f}s  flags={len(r2.red_flags)}  stats={cache_stats()}")

    ok = (
        r1.contract_type == r2.contract_type
        and len(r1.red_flags) == len(r2.red_flags)
        and t2 < 1.0  # cache hit should be essentially instant
    )
    print(f"\nidentical={r1 == r2}  hit_fast={t2 < 1.0}  OK={ok}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
