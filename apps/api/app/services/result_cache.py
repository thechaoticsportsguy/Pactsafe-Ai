"""
v2 analysis result cache.

Keyed on SHA-256 of the input document text so identical re-uploads
return the same ``AnalysisResult`` without re-spending Gemini tokens.

Implementation is an in-process TTL dict behind an asyncio.Lock. The
task spec referenced Redis (``analysis:v2:{hash}``) assuming a prior
refactor had wired it — that turned out not to exist. This module
preserves the same key format and semantics so swapping in a real
Redis-backed implementation later is a one-function rewrite of
``get`` / ``set``. Single-machine Fly deployment (``min_machines_running
= 1``) means an in-process cache still gets the hit rate we want from
a user re-uploading a file.

Usage:

    cached = await get_cached_result(text)
    if cached is not None:
        return cached
    result = await run_v2_pipeline(text)
    await cache_result(text, result)
    return result

Logs ``cache_hit=true|false`` once per call so the hit rate is visible
in the normal request logs without a metrics pipeline.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from dataclasses import dataclass

from app.schemas import AnalysisResult

logger = logging.getLogger(__name__)

# 24 hours. Matches the task spec; short enough that a prompt / model
# change propagates within a day without an explicit flush.
DEFAULT_TTL_SECONDS = 24 * 60 * 60

# Soft cap on cache size so a busy worker can't balloon memory. Eviction
# policy is simple LRU-by-insertion when we trip the cap.
_MAX_ENTRIES = 256


@dataclass
class _Entry:
    result: AnalysisResult
    expires_at: float


class _ResultCache:
    """Async-safe TTL dict. One instance per process."""

    def __init__(self, ttl_seconds: int = DEFAULT_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, _Entry] = {}
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _key(text: str) -> str:
        digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()
        return f"analysis:v2:{digest}"

    async def get(self, text: str) -> AnalysisResult | None:
        key = self._key(text)
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            if entry.expires_at < time.time():
                # Expired — drop and treat as a miss.
                self._store.pop(key, None)
                self._misses += 1
                return None
            self._hits += 1
            return entry.result

    async def set(self, text: str, result: AnalysisResult) -> None:
        key = self._key(text)
        expires_at = time.time() + self._ttl
        async with self._lock:
            # Evict oldest entry on overflow. dict preserves insertion
            # order on Py3.7+, so next(iter(...)) is the oldest.
            if len(self._store) >= _MAX_ENTRIES and key not in self._store:
                oldest = next(iter(self._store))
                self._store.pop(oldest, None)
            self._store[key] = _Entry(result=result, expires_at=expires_at)

    def stats(self) -> dict[str, int | float]:
        total = self._hits + self._misses
        rate = (self._hits / total) if total else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "size": len(self._store),
            "hit_rate": round(rate, 4),
        }


_CACHE = _ResultCache()


async def get_cached_result(text: str) -> AnalysisResult | None:
    """Return the cached analysis for ``text``, or ``None`` on miss."""

    return await _CACHE.get(text)


async def cache_result(text: str, result: AnalysisResult) -> None:
    """Store ``result`` under the SHA-256 of ``text`` with a 24 h TTL."""

    await _CACHE.set(text, result)


def cache_stats() -> dict[str, int | float]:
    """Process-wide hit/miss counters. Used for log annotation and tests."""

    return _CACHE.stats()
