"""
GET  /api/demo/samples              — list pre-loaded demo contracts.
POST /api/demo/analyze?sample_id=…  — run the real v2 pipeline against one.

This powers the live `/demo` page. Visitors pick a sample, watch the scan
cinema, and see a real ``AnalysisResult`` from the production pipeline —
same passes, same citation firewall, same schema as a real upload.

Guardrails (demo-scope only; don't touch the real pipeline or cache):

* **Demo-layer cache** (keyed on ``sample_id``, 24 h TTL) so the same sample
  returns instantly for the second visitor. The v2 pipeline already has a
  text-hash cache, but that doesn't surface a "cached: true" flag for the
  response body — the demo cache lives here to keep that concern off the
  production cache.
* **Per-IP rate limit** (30 analyses / hour / IP) so a scraper can't spin up
  a free analysis firehose. Tiny in-memory sliding window; resets every
  request that lands outside the 1 h window.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from app.schemas import AnalysisResult
from app.services.v2_pipeline import run_v2_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])


# ---------------------------------------------------------------------------
# Sample metadata
# ---------------------------------------------------------------------------

# Keep the ``id`` field URL-safe (no spaces / punctuation) — it's the query
# parameter and cache key. Keep ``description`` punchy — it's shown as the
# card subtitle on /demo, so anything over ~100 chars wraps awkwardly.
SAMPLE_METADATA: dict[str, dict[str, str]] = {
    "contractor_agreement": {
        "id": "contractor_agreement",
        "title": "Contractor Agreement",
        "description": (
            "A typical platform-style independent contractor agreement with "
            "IP assignment, liability cap, and mandatory arbitration."
        ),
        "doc_type": "Independent Contractor",
        "word_count": "~2,300",
    },
    "nda_mutual": {
        "id": "nda_mutual",
        "title": "Mutual NDA",
        "description": (
            "A two-way non-disclosure agreement with a 5-year survival tail, "
            "no-solicitation clause, and injunctive-relief remedy."
        ),
        "doc_type": "Non-Disclosure Agreement",
        "word_count": "~1,800",
    },
    "saas_terms": {
        "id": "saas_terms",
        "title": "SaaS Subscription",
        "description": (
            "A SaaS subscription agreement with auto-renewal, data portability, "
            "and a fee-cap liability limit."
        ),
        "doc_type": "SaaS Subscription",
        "word_count": "~1,800",
    },
}

_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo_contracts"


def _load_sample_text(sample_id: str) -> str:
    path = _DATA_DIR / f"{sample_id}.txt"
    if not path.is_file():
        raise HTTPException(404, f"Sample '{sample_id}' not found")
    return path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Demo-layer cache (sample_id → AnalysisResult, 24 h TTL)
# ---------------------------------------------------------------------------

_CACHE_TTL_SECONDS = 24 * 60 * 60

# { sample_id: (AnalysisResult, inserted_at_epoch) }
_demo_cache: dict[str, tuple[AnalysisResult, float]] = {}
_demo_cache_lock = asyncio.Lock()


async def _get_cached(sample_id: str) -> Optional[AnalysisResult]:
    async with _demo_cache_lock:
        entry = _demo_cache.get(sample_id)
        if entry is None:
            return None
        result, inserted_at = entry
        if time.time() - inserted_at > _CACHE_TTL_SECONDS:
            _demo_cache.pop(sample_id, None)
            return None
        return result


async def _set_cached(sample_id: str, result: AnalysisResult) -> None:
    async with _demo_cache_lock:
        _demo_cache[sample_id] = (result, time.time())


# ---------------------------------------------------------------------------
# Per-IP rate limiter (30 req / hour / IP, sliding window)
# ---------------------------------------------------------------------------

_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
_RATE_LIMIT_MAX_REQUESTS = 30

# { ip: [ts, ts, ts, ...] }
_ip_hits: dict[str, list[float]] = defaultdict(list)
_ip_hits_lock = asyncio.Lock()


async def _check_rate_limit(ip: str) -> None:
    """Raise 429 if ``ip`` has exceeded the per-hour quota. Side-effect-ful:
    appends the current timestamp on success so the limiter stays honest."""

    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS

    async with _ip_hits_lock:
        hits = _ip_hits[ip]
        # Prune anything outside the window.
        fresh = [t for t in hits if t >= cutoff]
        if len(fresh) >= _RATE_LIMIT_MAX_REQUESTS:
            _ip_hits[ip] = fresh
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Demo rate limit reached ({_RATE_LIMIT_MAX_REQUESTS} "
                    f"analyses/hour). Try again later, or upload your own "
                    f"contract on the main analyze page."
                ),
            )
        fresh.append(now)
        _ip_hits[ip] = fresh


def _client_ip(request: Request) -> str:
    """Best-effort client IP, prefers X-Forwarded-For (Fly.io / Vercel)."""

    xff = request.headers.get("x-forwarded-for")
    if xff:
        # First value is the origin client.
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/samples")
async def list_samples() -> dict[str, object]:
    """Return the three demo samples' metadata for the picker grid."""

    return {
        "samples": list(SAMPLE_METADATA.values()),
    }


@router.post("/analyze")
async def analyze_sample(sample_id: str, request: Request) -> dict[str, object]:
    """Run the real v2 pipeline against one of the preloaded samples.

    Response shape:
        {
            "sample_id": "contractor_agreement",
            "cached": bool,
            "result": { ...AnalysisResult... }
        }
    """

    if sample_id not in SAMPLE_METADATA:
        raise HTTPException(
            404,
            f"Unknown sample_id '{sample_id}'. "
            f"Valid ids: {sorted(SAMPLE_METADATA.keys())}",
        )

    ip = _client_ip(request)
    await _check_rate_limit(ip)

    # Demo-layer cache first.
    cached = await _get_cached(sample_id)
    if cached is not None:
        logger.info("[demo] cache_hit sample_id=%s ip=%s", sample_id, ip)
        return {
            "sample_id": sample_id,
            "cached": True,
            "result": cached.model_dump(),
        }

    # Cache miss — actually run the pipeline.
    logger.info("[demo] cache_miss sample_id=%s ip=%s", sample_id, ip)
    text = _load_sample_text(sample_id)

    result = await run_v2_pipeline(text)

    # Don't cache Pass 0 rejections (these shouldn't happen on curated
    # samples, but if they do we want the next visitor to retry — matches
    # the production pipeline's behaviour).
    if not result.rejected:
        await _set_cached(sample_id, result)

    return {
        "sample_id": sample_id,
        "cached": False,
        "result": result.model_dump(),
    }
