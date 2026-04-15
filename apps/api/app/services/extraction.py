"""
Smart-routing text extractor.

Decides — per upload — whether to run our built-in extractor (pdfplumber
/ python-docx / plain text) or hand the file off to LlamaParse. The
decision rules are cheap and deterministic:

    1. If LlamaParse isn't configured (no LLAMA_CLOUD_API_KEY), we always
       use direct extraction.
    2. Otherwise, if the file looks "big" on disk (>= DIRECT_SIZE_BYTES)
       OR is a PDF, we try LlamaParse first — it handles complex layouts
       and long contracts much better than pdfplumber alone.
    3. If direct extraction produces a corpus whose rough token count
       exceeds TOKEN_THRESHOLD, we retry once via LlamaParse as a safety
       net. This catches the case where pdfplumber succeeded but the
       resulting text is too long for the downstream LLM context window.
    4. If LlamaParse raises or times out, we fall back to direct
       extraction and mark the route as "direct".

Returned `ExtractionResult` is persisted on the Job row (extracted_text,
token_count, extraction_route) so the background worker can skip
extraction entirely and jump straight to analysis.

Nothing in this module performs analysis — extraction only.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ExtractionRoute = Literal["direct", "llama_parse", "inline_text"]


@dataclass
class ExtractionResult:
    text: str
    tokens: int
    route: ExtractionRoute
    file_size: int
    ocr_used: bool = False
    warnings: list[str] | None = None


# ---------------------------------------------------------------------------
# Tuning constants
# ---------------------------------------------------------------------------

# Files smaller than this are always tried with direct extraction first.
# 5 MB covers nearly every real contract PDF; the LlamaParse API call
# would add unnecessary latency for these.
DIRECT_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

# LlamaParse API timeout — if the service doesn't respond in time, we
# fall back to direct extraction so users never sit forever on "Queued".
LLAMA_PARSE_TIMEOUT_SECONDS = 120


# ---------------------------------------------------------------------------
# Token estimator
# ---------------------------------------------------------------------------


def estimate_tokens(text: str) -> int:
    """
    Fast rough-estimate of a token count. We use `len(text) // 4` — a
    commonly cited heuristic for English prose against GPT-style BPE
    tokenizers, accurate to within ~15% for contract text. Good enough
    for routing decisions; we don't need true tiktoken precision here
    (and importing tiktoken would add a cold-start cost we don't want).
    """

    if not text:
        return 0
    return max(0, len(text) // 4)


# ---------------------------------------------------------------------------
# Direct extraction (pdfplumber / python-docx / txt)
# ---------------------------------------------------------------------------


async def extract_text_direct(file_path: str, filename: str) -> tuple[str, bool]:
    """
    Run the existing local extractor off the event loop.

    Returns `(text, ocr_used)`. We intentionally delegate to
    `app.services.ingestion.extract_text` so all of the OCR fallback,
    page mapping, and DOCX handling stays in one place.
    """

    from app.services.ingestion import extract_text as _local_extract

    def _run() -> tuple[str, bool]:
        doc = _local_extract(file_path)
        return doc.text, doc.ocr_used

    try:
        text, ocr_used = await asyncio.to_thread(_run)
        logger.info(
            "[extract_text_direct] ok filename=%s bytes=%d tokens~%d ocr=%s",
            filename,
            Path(file_path).stat().st_size,
            estimate_tokens(text),
            ocr_used,
        )
        return text, ocr_used
    except Exception as exc:
        logger.exception("[extract_text_direct] failed filename=%s", filename)
        raise RuntimeError(f"Direct extraction failed: {exc}") from exc


# ---------------------------------------------------------------------------
# LlamaParse extraction
# ---------------------------------------------------------------------------


async def extract_with_llama_parse(file_path: str, filename: str) -> str:
    """
    Hand the file to the LlamaParse API and return the combined text.

    The `llama-parse` SDK is synchronous, so we run it in a thread and
    wrap it in a timeout. Any failure — missing key, HTTP error, quota
    exceeded, timeout — raises a plain `RuntimeError` so the caller can
    fall back to direct extraction.
    """

    settings = get_settings()
    if not settings.llama_parse_enabled:
        raise RuntimeError(
            "LlamaParse is not configured (LLAMA_CLOUD_API_KEY is unset)."
        )

    try:
        from llama_parse import LlamaParse  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "llama-parse is not installed. Add it to requirements and redeploy."
        ) from exc

    def _run() -> str:
        parser = LlamaParse(
            api_key=settings.llama_cloud_api_key,
            result_type="text",  # plain text is enough; markdown adds noise
            verbose=False,
        )
        documents = parser.load_data(file_path)
        if not documents:
            raise RuntimeError("LlamaParse returned zero documents.")
        parts = []
        for d in documents:
            # Different llama_parse versions expose different accessors;
            # prefer get_content() with a fallback to the raw text attr.
            getter = getattr(d, "get_content", None)
            if callable(getter):
                parts.append(getter() or "")
            else:
                parts.append(getattr(d, "text", "") or "")
        combined = "\n\n".join(p for p in parts if p).strip()
        if not combined:
            raise RuntimeError("LlamaParse returned empty text.")
        return combined

    try:
        text = await asyncio.wait_for(
            asyncio.to_thread(_run),
            timeout=LLAMA_PARSE_TIMEOUT_SECONDS,
        )
        logger.info(
            "[extract_with_llama_parse] ok filename=%s tokens~%d",
            filename,
            estimate_tokens(text),
        )
        return text
    except asyncio.TimeoutError as exc:
        logger.error(
            "[extract_with_llama_parse] timed out after %ss filename=%s",
            LLAMA_PARSE_TIMEOUT_SECONDS,
            filename,
        )
        raise RuntimeError(
            f"LlamaParse timed out after {LLAMA_PARSE_TIMEOUT_SECONDS}s."
        ) from exc
    except Exception as exc:
        logger.exception("[extract_with_llama_parse] failed filename=%s", filename)
        raise RuntimeError(f"LlamaParse extraction failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Smart router
# ---------------------------------------------------------------------------


async def route_and_extract(file_path: str, filename: str) -> ExtractionResult:
    """
    Decide the extraction strategy for a saved upload and run it.

    Rules:
      * If `LLAMA_CLOUD_API_KEY` is unset → always use direct extraction.
      * Else, if the file is > DIRECT_SIZE_BYTES OR is a PDF → try
        LlamaParse first, fall back to direct on failure.
      * Else → try direct first, then if the result is > TOKEN_THRESHOLD
        tokens, retry via LlamaParse as a safety net.

    The returned `ExtractionResult.route` always reflects the strategy
    that actually produced the text (so a LlamaParse fallback after a
    failed direct attempt still reports `llama_parse`, and vice versa).
    """

    settings = get_settings()
    threshold = settings.token_threshold
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Upload not on disk: {file_path}")
    file_size = path.stat().st_size
    ext = path.suffix.lower()

    warnings: list[str] = []

    prefer_llama_parse = (
        settings.llama_parse_enabled
        and (file_size > DIRECT_SIZE_BYTES or ext == ".pdf")
    )

    # --- Path A: big or PDF → try LlamaParse first, direct fallback ---
    if prefer_llama_parse:
        try:
            text = await extract_with_llama_parse(file_path, filename)
            tokens = estimate_tokens(text)
            logger.info(
                "[route_and_extract] via=llama_parse filename=%s tokens=%d size=%d",
                filename,
                tokens,
                file_size,
            )
            if tokens > threshold:
                warnings.append(
                    f"Document is still large after LlamaParse "
                    f"({tokens:,} tokens > {threshold:,} threshold)."
                )
            return ExtractionResult(
                text=text,
                tokens=tokens,
                route="llama_parse",
                file_size=file_size,
                warnings=warnings or None,
            )
        except Exception as exc:
            logger.warning(
                "[route_and_extract] llama_parse failed — falling back to direct: %s",
                exc,
            )
            warnings.append(f"LlamaParse failed, used direct fallback: {exc}")

    # --- Path B: direct extraction first, LlamaParse retry on oversize ---
    text, ocr_used = await extract_text_direct(file_path, filename)
    tokens = estimate_tokens(text)
    logger.info(
        "[route_and_extract] via=direct filename=%s tokens=%d size=%d ocr=%s",
        filename,
        tokens,
        file_size,
        ocr_used,
    )

    if tokens > threshold and settings.llama_parse_enabled and not prefer_llama_parse:
        logger.info(
            "[route_and_extract] direct produced %d tokens > %d — retrying via llama_parse",
            tokens,
            threshold,
        )
        try:
            retry_text = await extract_with_llama_parse(file_path, filename)
            retry_tokens = estimate_tokens(retry_text)
            logger.info(
                "[route_and_extract] retry ok tokens=%d (was %d)",
                retry_tokens,
                tokens,
            )
            if retry_tokens > threshold:
                warnings.append(
                    f"Document is still large after LlamaParse retry "
                    f"({retry_tokens:,} tokens)."
                )
            return ExtractionResult(
                text=retry_text,
                tokens=retry_tokens,
                route="llama_parse",
                file_size=file_size,
                warnings=warnings or None,
            )
        except Exception as exc:
            logger.warning(
                "[route_and_extract] llama_parse retry failed — keeping direct result: %s",
                exc,
            )
            warnings.append(
                f"Direct extraction produced a large corpus "
                f"({tokens:,} tokens), LlamaParse retry failed: {exc}"
            )

    return ExtractionResult(
        text=text,
        tokens=tokens,
        route="direct",
        file_size=file_size,
        ocr_used=ocr_used,
        warnings=warnings or None,
    )


# ---------------------------------------------------------------------------
# Inline text (paste-text path)
# ---------------------------------------------------------------------------


def extract_from_inline_text(text: str) -> ExtractionResult:
    """
    Turn pasted text into an `ExtractionResult` so the /jobs/from-text
    endpoint shares the same response shape as /jobs/from-file. No disk
    I/O, no routing decision — the route is always "inline_text".
    """

    cleaned = (text or "").strip()
    return ExtractionResult(
        text=cleaned,
        tokens=estimate_tokens(cleaned),
        route="inline_text",
        file_size=len(cleaned.encode("utf-8")),
    )


# ---------------------------------------------------------------------------
# Utility — exposed for /health/llamaparse
# ---------------------------------------------------------------------------


def llama_parse_status() -> dict[str, object]:
    """
    Return a small status dict the health endpoint can serialize.
    Doesn't actually call the API — we want this to be instant.
    """
    settings = get_settings()
    key_present = bool(os.getenv("LLAMA_CLOUD_API_KEY") or settings.llama_cloud_api_key)
    try:
        import llama_parse  # noqa: F401  — presence check

        sdk_installed = True
    except ImportError:
        sdk_installed = False

    return {
        "service": "llama_parse",
        "available": key_present and sdk_installed,
        "api_key_set": key_present,
        "sdk_installed": sdk_installed,
        "token_threshold": settings.token_threshold,
        "direct_size_bytes": DIRECT_SIZE_BYTES,
        "timeout_seconds": LLAMA_PARSE_TIMEOUT_SECONDS,
    }
