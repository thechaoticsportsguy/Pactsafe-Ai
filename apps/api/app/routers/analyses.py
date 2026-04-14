"""GET /api/analyses/{job_id} — fetch just the validated AnalysisResult."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Analysis
from app.schemas import AnalysisResult

router = APIRouter(tags=["analyses"])


@router.get("/analyses/{job_id}", response_model=AnalysisResult)
def get_analysis(job_id: UUID, session: Session = Depends(get_session)) -> AnalysisResult:
    row = session.exec(select(Analysis).where(Analysis.job_id == job_id)).first()
    if row is None or row.result_json is None:
        raise HTTPException(404, "Analysis not found or still running")
    return AnalysisResult.model_validate(row.result_json)
