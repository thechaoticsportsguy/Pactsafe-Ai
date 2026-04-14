"""
POST /api/jobs        — create a job (upload file or raw text) and enqueue it.
GET  /api/jobs/{id}   — return current status + result (when ready).
GET  /api/jobs        — list recent jobs (for /history).
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


# ---------------------------------------------------------------------------
# POST /api/jobs
# ---------------------------------------------------------------------------


@router.post("/jobs", response_model=JobCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    background: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> JobCreateResponse:
    """Accept a multipart file OR form text. Returns the new job_id."""

    if file is None and not text:
        raise HTTPException(400, "Provide either a file or text.")

    job = Job()

    if file is not None:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(415, f"Unsupported file type: {ext or 'unknown'}")
        if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES and ext == "":
            raise HTTPException(415, f"Unsupported content-type: {file.content_type}")

        # Save upload to disk
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        saved_path = upload_dir / f"{uuid.uuid4().hex}{ext}"

        total = 0
        with saved_path.open("wb") as f:
            while chunk := await file.read(64 * 1024):
                total += len(chunk)
                if total > settings.max_upload_bytes:
                    saved_path.unlink(missing_ok=True)
                    raise HTTPException(
                        413, f"File too large (max {settings.max_upload_mb} MB)"
                    )
                f.write(chunk)

        job.filename = file.filename
        job.content_type = file.content_type or mimetypes.guess_type(str(saved_path))[0]
        job.file_path = str(saved_path)
        job.size_bytes = total
    else:
        # Text mode — stash full text in text_preview column for the worker
        assert text is not None
        if len(text.strip()) < 50:
            raise HTTPException(400, "Text is too short (minimum 50 characters).")
        job.text_preview = text

    job.status = "queued"
    session.add(job)
    session.commit()
    session.refresh(job)

    # Enqueue the analysis
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
    if job.status == "completed":
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
