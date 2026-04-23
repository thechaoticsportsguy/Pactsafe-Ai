"""
Jobs router.

Endpoints:
    POST /api/jobs              — legacy one-shot endpoint (file OR text)
                                  Kept working for the existing frontend client.
    POST /api/jobs/from-file    — explicit file upload with smart extraction
    POST /api/jobs/from-text    — explicit paste-text with token check
    GET  /api/jobs/{id}         — status + result + extraction route
    GET  /api/jobs              — recent history

Extraction is performed *inside* the endpoint, not the worker, so the
response can include `extraction_route`, `tokens`, and `text_preview`.
The background worker consumes the already-extracted text stored on
`Job.extracted_text` and skips ingestion entirely.
"""

from __future__ import annotations

import logging
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlmodel import Session, select

from app.config import Settings, get_settings
from app.db import get_session
from app.models import Analysis, Job
from app.schemas import (
    AnalysisResult,
    JobCreateResponse,
    JobStatusResponse,
)
from app.services.extraction import (
    ExtractionResult,
    extract_from_inline_text,
    route_and_extract,
)
from app.workers.background import run_job

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
}
ALLOWED_EXTS = {".pdf", ".docx", ".doc", ".txt", ".md"}
PREVIEW_CHARS = 1000
MIN_TEXT_CHARS = 50

# Accepted `model` form values. Anything else gets coerced to None so we
# fall back to the provider's default instead of blowing up on a typo.
_ALLOWED_MODEL_PREFS = {"pro", "flash", "flash-lite"}


def _normalize_model_pref(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    value = raw.strip().lower()
    if value in _ALLOWED_MODEL_PREFS:
        return value
    # Accept the fully-qualified gemini names too for convenience.
    if value.startswith("gemini-2.5-"):
        suffix = value.removeprefix("gemini-2.5-")
        if suffix in _ALLOWED_MODEL_PREFS:
            return suffix
    return None


# ---------------------------------------------------------------------------
# Internal helpers — shared by legacy + new endpoints
# ---------------------------------------------------------------------------


async def _save_upload_to_disk(
    file: UploadFile,
    settings: Settings,
) -> tuple[Path, int, str]:
    """
    Stream an UploadFile to disk under `settings.upload_dir`, enforcing
    both the soft `max_upload_mb` limit (HTTP 413 per user) and the
    hard `hard_max_upload_mb` ceiling. Returns `(path, size_bytes, ext)`.
    """

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(415, f"Unsupported file type: {ext or 'unknown'}")
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES and ext == "":
        raise HTTPException(415, f"Unsupported content-type: {file.content_type}")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    saved_path = upload_dir / f"{uuid.uuid4().hex}{ext}"

    total = 0
    try:
        with saved_path.open("wb") as f:
            while chunk := await file.read(64 * 1024):
                total += len(chunk)
                if total > settings.hard_max_upload_bytes:
                    saved_path.unlink(missing_ok=True)
                    raise HTTPException(
                        413,
                        f"File exceeds hard limit of {settings.hard_max_upload_mb} MB.",
                    )
                if total > settings.max_upload_bytes:
                    saved_path.unlink(missing_ok=True)
                    raise HTTPException(
                        413,
                        f"File too large (max {settings.max_upload_mb} MB).",
                    )
                f.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        logger.exception("[_save_upload_to_disk] write failed")
        raise HTTPException(500, f"Could not save upload: {exc}") from exc

    return saved_path, total, ext


def _persist_job(
    session: Session,
    *,
    filename: Optional[str],
    content_type: Optional[str],
    file_path: Optional[str],
    size_bytes: Optional[int],
    extraction: ExtractionResult,
    model_preference: Optional[str] = None,
) -> Job:
    """Create a queued Job row pre-loaded with the already-extracted text."""

    job = Job(
        filename=filename,
        content_type=content_type,
        file_path=file_path,
        size_bytes=size_bytes,
        status="queued",
        extracted_text=extraction.text,
        text_preview=extraction.text[:PREVIEW_CHARS] if extraction.text else None,
        extraction_route=extraction.route,
        token_count=extraction.tokens,
        model_preference=model_preference,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


def _build_create_response(job: Job, extraction: ExtractionResult) -> dict:
    """Shared response body for the create endpoints."""

    return {
        "job_id": str(job.id),
        "status": job.status,
        "filename": job.filename,
        "file_size": extraction.file_size,
        "tokens": extraction.tokens,
        "extraction_route": extraction.route,
        "text_preview": (job.text_preview or "")[:PREVIEW_CHARS],
        "ocr_used": extraction.ocr_used,
        "warnings": extraction.warnings or [],
        "message": "File queued for analysis",
    }


# ---------------------------------------------------------------------------
# POST /api/jobs/from-file — smart extraction + queue
# ---------------------------------------------------------------------------


@router.post(
    "/jobs/from-file",
    status_code=status.HTTP_201_CREATED,
)
async def create_job_from_file(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    model: Optional[str] = Form(default="flash"),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Upload a file, run smart extraction (LlamaParse or direct), persist
    the job with the extracted text pre-populated, and kick off the
    analyzer in the background.

    `model` defaults to ``"flash"`` so the home-page upload flow gets
    fast feedback. The /analyze page explicitly sends ``"pro"``.
    """

    saved_path, size_bytes, _ext = await _save_upload_to_disk(file, settings)
    filename = file.filename or saved_path.name
    model_pref = _normalize_model_pref(model) or "flash"

    # --- smart extraction (may call LlamaParse) ---
    try:
        extraction = await route_and_extract(str(saved_path), filename)
    except Exception as exc:
        saved_path.unlink(missing_ok=True)
        logger.exception("[create_job_from_file] extraction failed")
        raise HTTPException(500, f"Text extraction failed: {exc}") from exc

    if not extraction.text or len(extraction.text.strip()) < MIN_TEXT_CHARS:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            422,
            "Could not extract enough text from this file. "
            "If it's a scanned PDF, please try a text-based version.",
        )

    logger.info(
        "[create_job_from_file] filename=%s route=%s tokens=%d size=%d",
        filename,
        extraction.route,
        extraction.tokens,
        extraction.file_size,
    )

    job = _persist_job(
        session,
        filename=filename,
        content_type=file.content_type
        or mimetypes.guess_type(str(saved_path))[0],
        file_path=str(saved_path),
        size_bytes=size_bytes,
        extraction=extraction,
        model_preference=model_pref,
    )

    background.add_task(run_job, job.id)
    return _build_create_response(job, extraction)


# ---------------------------------------------------------------------------
# POST /api/jobs/from-text — paste text + token check
# ---------------------------------------------------------------------------


@router.post(
    "/jobs/from-text",
    status_code=status.HTTP_201_CREATED,
)
async def create_job_from_text(
    background: BackgroundTasks,
    text: str = Form(...),
    model: Optional[str] = Form(default="pro"),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Create a job from pasted text. Enforces the same token threshold as
    file uploads so users get a clear "break this into sections" error
    instead of a silent LLM context blow-up.
    """

    trimmed = (text or "").strip()
    if len(trimmed) < MIN_TEXT_CHARS:
        raise HTTPException(
            400,
            f"Text is too short (minimum {MIN_TEXT_CHARS} characters).",
        )

    extraction = extract_from_inline_text(trimmed)
    if extraction.tokens > settings.token_threshold:
        raise HTTPException(
            413,
            (
                f"Pasted text is too long "
                f"({extraction.tokens:,} tokens > {settings.token_threshold:,}). "
                f"Break the contract into smaller sections and analyze "
                f"each one separately, or upload it as a file so we can "
                f"use LlamaParse."
            ),
        )

    model_pref = _normalize_model_pref(model) or "pro"

    logger.info(
        "[create_job_from_text] tokens=%d chars=%d model=%s",
        extraction.tokens,
        len(trimmed),
        model_pref,
    )

    job = _persist_job(
        session,
        filename=None,
        content_type="text/plain",
        file_path=None,
        size_bytes=extraction.file_size,
        extraction=extraction,
        model_preference=model_pref,
    )

    background.add_task(run_job, job.id)
    return _build_create_response(job, extraction)


# ---------------------------------------------------------------------------
# POST /api/jobs — LEGACY (kept for the existing frontend client)
#
# The current frontend posts a multipart body with either a `file` field
# or a `text` field to this single endpoint. We keep it working by
# dispatching internally to the smart routing path used by the new
# endpoints, so existing clients get all the new behavior "for free"
# without any api.ts change.
# ---------------------------------------------------------------------------


@router.post(
    "/jobs",
    response_model=JobCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_job(
    background: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
    model: Optional[str] = Form(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> JobCreateResponse:
    """Accept a multipart file OR form text. Returns the new job_id."""

    if file is None and not text:
        raise HTTPException(400, "Provide either a file or text.")

    # Legacy endpoint default: file → "flash" (fast), text → "pro".
    default_pref = "flash" if file is not None else "pro"
    model_pref = _normalize_model_pref(model) or default_pref

    if file is not None:
        saved_path, size_bytes, _ext = await _save_upload_to_disk(file, settings)
        filename = file.filename or saved_path.name
        try:
            extraction = await route_and_extract(str(saved_path), filename)
        except Exception as exc:
            saved_path.unlink(missing_ok=True)
            logger.exception("[create_job] extraction failed")
            raise HTTPException(500, f"Text extraction failed: {exc}") from exc
        if not extraction.text or len(extraction.text.strip()) < MIN_TEXT_CHARS:
            saved_path.unlink(missing_ok=True)
            raise HTTPException(
                422,
                "Could not extract enough text from this file. "
                "If it's a scanned PDF, please try a text-based version.",
            )
        job = _persist_job(
            session,
            filename=filename,
            content_type=file.content_type
            or mimetypes.guess_type(str(saved_path))[0],
            file_path=str(saved_path),
            size_bytes=size_bytes,
            extraction=extraction,
            model_preference=model_pref,
        )
    else:
        trimmed = (text or "").strip()
        if len(trimmed) < MIN_TEXT_CHARS:
            raise HTTPException(
                400, f"Text is too short (minimum {MIN_TEXT_CHARS} characters)."
            )
        extraction = extract_from_inline_text(trimmed)
        if extraction.tokens > settings.token_threshold:
            raise HTTPException(
                413,
                (
                    f"Pasted text is too long "
                    f"({extraction.tokens:,} tokens > {settings.token_threshold:,}). "
                    f"Break the contract into smaller sections or upload as a file."
                ),
            )
        job = _persist_job(
            session,
            filename=None,
            content_type="text/plain",
            file_path=None,
            size_bytes=extraction.file_size,
            extraction=extraction,
            model_preference=model_pref,
        )

    background.add_task(run_job, job.id)
    return JobCreateResponse(job_id=job.id, status="queued")


# ---------------------------------------------------------------------------
# GET /api/jobs/{id}
# ---------------------------------------------------------------------------


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: UUID, session: Session = Depends(get_session)) -> JobStatusResponse:
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "Job not found")

    result: Optional[AnalysisResult] = None
    # Hydrate `result` for both happy-path completion AND Pass 0
    # rejection — the worker persists an Analysis row in the rejected
    # case too so the frontend can read `result.rejection_reason` and
    # `result.detected_as` off a uniform shape.
    if job.status in ("completed", "rejected"):
        analysis = session.exec(select(Analysis).where(Analysis.job_id == job.id)).first()
        if analysis and analysis.result_json:
            result = AnalysisResult.model_validate(analysis.result_json)

    return JobStatusResponse(
        job_id=job.id,
        status=job.status,  # type: ignore[arg-type]
        filename=job.filename,
        created_at=job.created_at,
        updated_at=job.updated_at,
        text_preview=(job.text_preview or "")[:500] if job.text_preview else None,
        # Full extracted text — the clause highlighter needs this so the
        # v2 citations (section_number + quote) are visible in context.
        # text_preview above stays capped at 500 chars for backwards compat
        # with any consumer reading that field directly.
        document_text=job.extracted_text,
        result=result,
        error=job.error,
    )


# ---------------------------------------------------------------------------
# GET /api/jobs (history)
# ---------------------------------------------------------------------------


@router.get("/jobs", response_model=list[JobStatusResponse])
async def list_jobs(
    limit: int = 50,
    session: Session = Depends(get_session),
) -> list[JobStatusResponse]:
    limit = max(1, min(200, limit))
    rows = session.exec(select(Job).order_by(Job.created_at.desc()).limit(limit)).all()
    return [
        JobStatusResponse(
            job_id=j.id,
            status=j.status,  # type: ignore[arg-type]
            filename=j.filename,
            created_at=j.created_at,
            updated_at=j.updated_at,
            text_preview=(j.text_preview or "")[:500] if j.text_preview else None,
            result=None,
            error=j.error,
        )
        for j in rows
    ]
