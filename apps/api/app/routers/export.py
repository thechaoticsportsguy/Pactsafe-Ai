"""
GET /api/export/{job_id}.json — download raw JSON
GET /api/export/{job_id}.pdf  — download a simple PDF report
"""

from __future__ import annotations

import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Session, select

from app.db import get_session
from app.models import Analysis
from app.schemas import AnalysisResult

router = APIRouter(tags=["export"])


def _load(session: Session, job_id: UUID) -> AnalysisResult:
    row = session.exec(select(Analysis).where(Analysis.job_id == job_id)).first()
    if row is None or row.result_json is None:
        raise HTTPException(404, "Analysis not found or still running")
    return AnalysisResult.model_validate(row.result_json)


@router.get("/export/{job_id}.json")
def export_json(job_id: UUID, session: Session = Depends(get_session)) -> JSONResponse:
    result = _load(session, job_id)
    return JSONResponse(result.model_dump(mode="json"))


@router.get("/export/{job_id}.pdf")
def export_pdf(job_id: UUID, session: Session = Depends(get_session)) -> StreamingResponse:
    result = _load(session, job_id)
    pdf_bytes = _render_pdf(result)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="pactsafe-{job_id}.pdf"'},
    )


def _render_pdf(result: AnalysisResult) -> bytes:
    """Minimal but readable PDF export via reportlab."""

    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import (
        ListFlowable,
        ListItem,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    styles = getSampleStyleSheet()
    heading = ParagraphStyle(
        "H1", parent=styles["Heading1"], textColor="#7c5cfc", spaceAfter=6
    )
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor="#0a0a0f")
    body = styles["BodyText"]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, title="PactSafe AI Analysis")
    story: list = []
    story.append(Paragraph("PactSafe AI — Contract Analysis", heading))
    story.append(Paragraph(result.contract_type, h2))
    story.append(Paragraph(f"Risk Score: <b>{result.risk_score}/100</b>", body))
    if result.model_used:
        story.append(Paragraph(f"Model: {result.model_used}", body))
    story.append(Spacer(1, 12))

    if result.overall_summary:
        story.append(Paragraph("Summary", h2))
        story.append(Paragraph(result.overall_summary, body))
        story.append(Spacer(1, 12))

    if result.red_flags:
        story.append(Paragraph("Red Flags", h2))
        items = [
            ListItem(
                Paragraph(
                    f"<b>[{f.severity}]</b> {f.explanation}<br/><i>{f.clause}</i>",
                    body,
                )
            )
            for f in result.red_flags
        ]
        story.append(ListFlowable(items, bulletType="bullet"))
        story.append(Spacer(1, 12))

    if result.missing_protections:
        story.append(Paragraph("Missing Protections", h2))
        story.append(
            ListFlowable(
                [ListItem(Paragraph(p, body)) for p in result.missing_protections],
                bulletType="bullet",
            )
        )
        story.append(Spacer(1, 12))

    if result.negotiation_suggestions:
        story.append(Paragraph("Negotiation Suggestions", h2))
        story.append(
            ListFlowable(
                [ListItem(Paragraph(s, body)) for s in result.negotiation_suggestions],
                bulletType="bullet",
            )
        )

    doc.build(story)
    return buf.getvalue()
