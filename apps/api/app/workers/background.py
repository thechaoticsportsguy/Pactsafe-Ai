"""
Background worker — runs ingestion + analysis for a job.

We use FastAPI's BackgroundTasks for simplicity (in-process, per request). For
production scale this can be swapped for Celery / RQ / Arq without changing
the public API — routers call `run_job(job_id)` and the WS subscribers receive
the same events.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from uuid import UUID

from app.db import session_scope
from app.models import Analysis, Job
from app.schemas import AnalysisResult, JobProgressEvent
from app.services.analyzer import ContractAnalyzer
from app.services.ingestion import extract_text
from app.services.llm import get_llm_client
from app.ws.jobs import publish

logger = logging.getLogger(__name__)


async def run_job(job_id: UUID) -> None:
    """Full pipeline: extract → analyze → persist → publish."""

    logger.info("run_job start job=%s", job_id)

    # ---- extracting ----
    await _update_status(job_id, "extracting")
    await publish(JobProgressEvent(job_id=job_id, status="extracting",
                                   message="Reading file…", progress=0.1))

    try:
        # Short-circuit: if the endpoint already extracted the text via
        # the smart router (LlamaParse or direct), there's nothing to
        # do here — we stored the full text in `extracted_text` and the
        # preview in `text_preview` *before* enqueueing. Worker goes
        # straight to analysis.
        with session_scope() as s:
            job = s.get(Job, job_id)
            if job is None:
                logger.error("Job %s not found", job_id)
                return
            file_path = job.file_path
            already_extracted = job.extracted_text
            legacy_text_preview = job.text_preview
            extraction_route = job.extraction_route
            model_pref = job.model_preference or "pro"

        if already_extracted:
            logger.info(
                "run_job skip-extract job=%s route=%s tokens~%d",
                job_id,
                extraction_route,
                len(already_extracted) // 4,
            )
            text = already_extracted
            # We don't keep a full page_map across the wire; build a
            # single-page fallback. The analyzer only uses page_map for
            # page-number hints, so this is safe.
            page_map = [{"page": 1, "start": 0, "end": len(text)}]
        elif file_path:
            # Legacy path — no extracted_text column populated yet
            # (e.g. rows created before this deploy). Re-extract locally.
            doc = extract_text(file_path)
            text, page_map = doc.text, doc.page_map
        else:
            # Pre-extraction-era text-mode job — full text was stashed
            # directly in text_preview.
            text, page_map = (legacy_text_preview or "", [])

        preview = text[:500]
        with session_scope() as s:
            job = s.get(Job, job_id)
            if job is not None:
                job.text_preview = preview
                job.updated_at = datetime.now(timezone.utc)
                s.add(job)

        await publish(JobProgressEvent(job_id=job_id, status="analyzing",
                                       message="Calling model…", progress=0.4))
        await _update_status(job_id, "analyzing")

        # ---- analyzing ----
        llm = await get_llm_client()
        logger.info(
            "run_job using provider=%s model=%s pref=%s job=%s",
            os.getenv("LLM_PROVIDER", "unknown"),
            getattr(llm, "model", "?"),
            model_pref,
            job_id,
        )
        analyzer = ContractAnalyzer(llm)
        result = await analyzer.analyze(text, page_map=page_map, model=model_pref)

        if result.error:
            await _fail(job_id, result.error, result=result)
            return

        # ---- persist ----
        with session_scope() as s:
            job = s.get(Job, job_id)
            if job is None:
                return
            analysis = Analysis(
                job_id=job.id,
                contract_type=result.contract_type,
                risk_score=result.risk_score,
                model_used=result.model_used,
                provider=result.provider,
                result_json=result.model_dump(mode="json"),
            )
            job.status = "completed"
            job.updated_at = datetime.now(timezone.utc)
            s.add(analysis)
            s.add(job)

        await publish(JobProgressEvent(job_id=job_id, status="completed",
                                       message="Done", progress=1.0, partial=result))
        logger.info("run_job done job=%s", job_id)

    except Exception as exc:
        logger.exception("run_job crashed")
        await _fail(job_id, str(exc))


async def _update_status(job_id: UUID, status: str) -> None:
    with session_scope() as s:
        job = s.get(Job, job_id)
        if job is not None:
            job.status = status
            job.updated_at = datetime.now(timezone.utc)
            s.add(job)


async def _fail(job_id: UUID, err: str, result: AnalysisResult | None = None) -> None:
    with session_scope() as s:
        job = s.get(Job, job_id)
        if job is not None:
            job.status = "failed"
            job.error = err
            job.updated_at = datetime.now(timezone.utc)
            s.add(job)
    await publish(JobProgressEvent(job_id=job_id, status="failed",
                                   message=err, progress=1.0, partial=result))
