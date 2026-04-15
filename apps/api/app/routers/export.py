"""
GET /api/export/{job_id}.json — download raw JSON
GET /api/export/{job_id}.pdf  — download a professional legal-memo PDF

The PDF template is deliberately conservative: Times New Roman, A4,
1-inch margins, severity colors only on left borders and badge chips,
no decorative gradients, no emoji. It reads like a paralegal memo, not
like AI marketing output.
"""

from __future__ import annotations

import io
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlmodel import Session, select

from app.db import get_session
from app.models import Analysis, Job
from app.schemas import AnalysisResult

router = APIRouter(tags=["export"])


def _load(session: Session, job_id: UUID) -> tuple[Analysis, Job | None]:
    row = session.exec(select(Analysis).where(Analysis.job_id == job_id)).first()
    if row is None or row.result_json is None:
        raise HTTPException(404, "Analysis not found or still running")
    job = session.exec(select(Job).where(Job.id == job_id)).first()
    return row, job


@router.get("/export/{job_id}.json")
def export_json(job_id: UUID, session: Session = Depends(get_session)) -> JSONResponse:
    row, _ = _load(session, job_id)
    result = AnalysisResult.model_validate(row.result_json)
    return JSONResponse(result.model_dump(mode="json"))


@router.get("/export/{job_id}.pdf")
def export_pdf(
    job_id: UUID, session: Session = Depends(get_session)
) -> StreamingResponse:
    row, job = _load(session, job_id)
    result = AnalysisResult.model_validate(row.result_json)
    filename = (job.filename if job else None) or "Pasted contract"
    created_at = (job.created_at if job else None) or datetime.now(timezone.utc)
    pdf_bytes = _render_pdf(result, filename=filename, created_at=created_at)
    safe_name = _safe_filename(filename)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="pactsafe-{safe_name}.pdf"'
        },
    )


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

# Severity color palette — mirrored from the product spec.
SEVERITY_COLORS = {
    "CRITICAL": "#DC2626",
    "HIGH": "#EA580C",
    "MEDIUM": "#CA8A04",
    "LOW": "#16A34A",
    "POSITIVE": "#0D9488",
}

SEVERITY_LABELS = {
    "CRITICAL": "Critical",
    "HIGH": "High",
    "MEDIUM": "Medium",
    "LOW": "Low",
    "POSITIVE": "In your favor",
}

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# Filler phrases we strip from summary text before rendering, because
# they make the report read like AI slop instead of a legal memo.
_FILLER_PATTERNS = [
    r"\bIt is important to note that\b[,]?\s*",
    r"\bIt is worth noting that\b[,]?\s*",
    r"\bIt should be noted that\b[,]?\s*",
    r"\bPlease note that\b[,]?\s*",
    r"\bOverall[,]?\s*",
    r"\bIn conclusion[,]?\s*",
    r"\bIn summary[,]?\s*",
    r"\bAs mentioned (?:above|previously|earlier)[,]?\s*",
    r"\bDelve into\b",
    r"\bdelve into\b",
    r"\bIt goes without saying that\b[,]?\s*",
    r"\bNeedless to say[,]?\s*",
    r"\bAt the end of the day[,]?\s*",
    r"\bFurthermore[,]?\s*",
    r"\bMoreover[,]?\s*",
]


def _clean(text: str) -> str:
    """Strip AI filler, collapse whitespace, escape HTML for Paragraph."""
    if not text:
        return ""
    cleaned = text
    for pat in _FILLER_PATTERNS:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Capitalize the first character if our filler strip left a comma/lowercase at the head.
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return (
        cleaned.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _safe_filename(name: str) -> str:
    stem = re.sub(r"\.[a-zA-Z0-9]{1,5}$", "", name)
    stem = re.sub(r"[^A-Za-z0-9\-_]+", "-", stem).strip("-")
    return stem[:60] or "report"


def _compute_risk_score(result: AnalysisResult) -> int:
    """
    Client-mirrored risk score formula. Keeps the PDF consistent with
    the web UI when the backend's raw `risk_score` is off.
    """
    flags = list(result.red_flags or [])
    if not flags:
        return 0
    reds = sum(1 for f in flags if f.severity in ("CRITICAL", "HIGH"))
    yellows = sum(1 for f in flags if f.severity in ("MEDIUM", "LOW"))
    score = ((reds * 3 + yellows * 1.5) / (len(flags) * 3)) * 100
    return max(0, min(100, round(score)))


def _risk_band(score: int) -> tuple[str, str]:
    if score >= 65:
        return "High risk", "#DC2626"
    if score >= 35:
        return "Medium risk", "#CA8A04"
    return "Low risk", "#16A34A"


# ---------------------------------------------------------------------------
# Main render
# ---------------------------------------------------------------------------


def _render_pdf(
    result: AnalysisResult,
    *,
    filename: str,
    created_at: datetime,
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.platypus import (
        BaseDocTemplate,
        Flowable,
        Frame,
        KeepTogether,
        PageBreak,
        PageTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
    )

    # -------------------------- styles --------------------------
    body = ParagraphStyle(
        "Body",
        fontName="Times-Roman",
        fontSize=12,
        leading=18,  # 1.5x line-height
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111111"),
        spaceAfter=6,
    )
    body_italic = ParagraphStyle(
        "BodyItalic",
        parent=body,
        fontName="Times-Italic",
        textColor=colors.HexColor("#333333"),
    )
    cover_title = ParagraphStyle(
        "CoverTitle",
        fontName="Times-Bold",
        fontSize=26,
        leading=32,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111111"),
        spaceAfter=4,
    )
    cover_sub = ParagraphStyle(
        "CoverSub",
        fontName="Times-Italic",
        fontSize=12,
        leading=16,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#555555"),
        spaceAfter=24,
    )
    section_h = ParagraphStyle(
        "SectionH",
        fontName="Times-Bold",
        fontSize=14,
        leading=20,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111111"),
        spaceBefore=14,
        spaceAfter=8,
    )
    finding_title = ParagraphStyle(
        "FindingTitle",
        fontName="Times-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#111111"),
        spaceAfter=3,
    )
    badge_style = ParagraphStyle(
        "Badge",
        fontName="Times-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    small = ParagraphStyle(
        "Small",
        fontName="Times-Roman",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#555555"),
    )
    score_huge = ParagraphStyle(
        "ScoreHuge",
        fontName="Times-Bold",
        fontSize=72,
        leading=76,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#111111"),
        spaceAfter=2,
    )

    # -------------------------- doc template --------------------------
    buf = io.BytesIO()

    def draw_footer(canvas: Canvas, doc: BaseDocTemplate) -> None:
        canvas.saveState()
        canvas.setFont("Times-Roman", 9)
        canvas.setFillColor(colors.HexColor("#777777"))
        # Left: branding + disclaimer
        canvas.drawString(
            doc.leftMargin,
            0.5 * inch,
            "Pactsafe AI — Not legal advice",
        )
        # Right: page X of Y. reportlab doesn't know total pages in one
        # pass, so we render "Page X" and resolve the total via a second
        # pass below (see NumberedCanvas).
        canvas.drawRightString(
            A4[0] - doc.rightMargin,
            0.5 * inch,
            f"Page {canvas._pageNumber}",
        )
        # Thin rule above the footer
        canvas.setStrokeColor(colors.HexColor("#DDDDDD"))
        canvas.setLineWidth(0.5)
        canvas.line(
            doc.leftMargin,
            0.75 * inch,
            A4[0] - doc.rightMargin,
            0.75 * inch,
        )
        canvas.restoreState()

    class NumberedCanvas(Canvas):
        """
        Two-pass canvas that overwrites the single-page footer with
        "Page X of Y" once the total page count is known.
        """

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states: list[dict] = []

        def showPage(self) -> None:  # type: ignore[override]
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self) -> None:  # type: ignore[override]
            total = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_page_number(total)
                Canvas.showPage(self)
            Canvas.save(self)

        def _draw_page_number(self, total: int) -> None:
            self.saveState()
            self.setFont("Times-Roman", 9)
            self.setFillColor(colors.HexColor("#777777"))
            # Cover the single-page text with a white rect, then redraw.
            self.setFillColor(colors.white)
            self.rect(
                A4[0] - 2 * inch,
                0.45 * inch,
                1.5 * inch,
                0.22 * inch,
                fill=1,
                stroke=0,
            )
            self.setFillColor(colors.HexColor("#777777"))
            self.drawRightString(
                A4[0] - 1 * inch,
                0.5 * inch,
                f"Page {self._pageNumber} of {total}",
            )
            self.restoreState()

    doc = BaseDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
        title="PactSafe AI — Contract Analysis",
        author="PactSafe AI",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="main",
    )
    doc.addPageTemplates(
        [PageTemplate(id="with-footer", frames=[frame], onPage=draw_footer)]
    )

    story: list[Flowable] = []

    # -------------------------- cover --------------------------
    score = _compute_risk_score(result)
    band_label, band_hex = _risk_band(score)
    critical = sum(1 for f in result.red_flags if f.severity == "CRITICAL")
    high = sum(1 for f in result.red_flags if f.severity == "HIGH")
    medium = sum(1 for f in result.red_flags if f.severity == "MEDIUM")
    low = sum(1 for f in result.red_flags if f.severity == "LOW")
    green_count = len(result.green_flags or [])

    story.append(Paragraph("Contract Risk Analysis", cover_title))
    story.append(
        Paragraph(
            f"{_clean(result.contract_type) or 'Unclassified contract'}",
            ParagraphStyle(
                "CoverType",
                fontName="Times-Roman",
                fontSize=13,
                leading=16,
                textColor=colors.HexColor("#333333"),
                spaceAfter=2,
            ),
        )
    )
    story.append(
        Paragraph(
            f"{_clean(filename)} &nbsp;·&nbsp; "
            f"Analyzed {created_at.strftime('%B %d, %Y')}",
            cover_sub,
        )
    )

    # Big score card
    score_block = Table(
        [
            [
                Paragraph(f"<b>{score}</b>", score_huge),
                [
                    Paragraph(
                        "OVERALL RISK SCORE",
                        ParagraphStyle(
                            "ScoreLabel",
                            fontName="Times-Bold",
                            fontSize=10,
                            leading=12,
                            textColor=colors.HexColor("#777777"),
                        ),
                    ),
                    Spacer(1, 6),
                    Paragraph(
                        f'<font color="{band_hex}"><b>{band_label.upper()}</b></font>',
                        ParagraphStyle(
                            "ScoreBand",
                            fontName="Times-Bold",
                            fontSize=16,
                            leading=18,
                        ),
                    ),
                    Spacer(1, 4),
                    Paragraph(
                        "out of 100 &nbsp;·&nbsp; higher means more risk",
                        small,
                    ),
                ],
            ]
        ],
        colWidths=[2.2 * inch, doc.width - 2.2 * inch],
        hAlign="LEFT",
    )
    score_block.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, -1), 18),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7F7F8")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
                ("LINEBEFORE", (0, 0), (0, -1), 4, colors.HexColor(band_hex)),
            ]
        )
    )
    story.append(score_block)
    story.append(Spacer(1, 24))

    # -------------------------- executive summary --------------------------
    story.append(Paragraph("Executive Summary", section_h))
    summary_text = _clean(result.overall_summary) or (
        "This contract could not be fully summarized. See the findings "
        "list for the specific clauses our scan flagged."
    )
    story.append(Paragraph(summary_text, body))
    story.append(Spacer(1, 12))

    # -------------------------- at a glance --------------------------
    story.append(Paragraph("At a Glance", section_h))
    at_a_glance_rows = [
        ["Metric", "Count"],
        ["Overall risk score", f"{score} / 100 · {band_label}"],
        ["Critical", str(critical)],
        ["High", str(high)],
        ["Medium", str(medium)],
        ["Low", str(low)],
        ["Missing protections", str(len(result.missing_protections))],
        ["In your favor", str(green_count)],
    ]
    at_a_glance = Table(
        at_a_glance_rows,
        colWidths=[doc.width * 0.6, doc.width * 0.4],
        hAlign="LEFT",
    )
    at_a_glance.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
                ("FONTSIZE", (0, 0), (-1, -1), 11),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#555555")),
                ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
                ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.HexColor("#AAAAAA")),
                ("LINEBELOW", (0, 1), (-1, -2), 0.25, colors.HexColor("#DDDDDD")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#111111")),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                # Color-code severity rows
                ("TEXTCOLOR", (0, 2), (0, 2), colors.HexColor(SEVERITY_COLORS["CRITICAL"])),
                ("TEXTCOLOR", (0, 3), (0, 3), colors.HexColor(SEVERITY_COLORS["HIGH"])),
                ("TEXTCOLOR", (0, 4), (0, 4), colors.HexColor(SEVERITY_COLORS["MEDIUM"])),
                ("TEXTCOLOR", (0, 5), (0, 5), colors.HexColor(SEVERITY_COLORS["LOW"])),
                ("TEXTCOLOR", (0, 7), (0, 7), colors.HexColor(SEVERITY_COLORS["POSITIVE"])),
            ]
        )
    )
    story.append(at_a_glance)
    story.append(Spacer(1, 18))

    # -------------------------- findings --------------------------
    if result.red_flags:
        story.append(PageBreak())
        story.append(Paragraph("Findings", section_h))
        story.append(
            Paragraph(
                "Clauses grouped by severity. Each finding includes the "
                "risky language, why it matters, and the specific quoted "
                "text from the contract.",
                body,
            )
        )
        story.append(Spacer(1, 6))

        # Sort into severity buckets
        buckets: dict[str, list] = {k: [] for k in SEVERITY_ORDER}
        for f in result.red_flags:
            buckets.setdefault(f.severity, []).append(f)

        for sev in SEVERITY_ORDER:
            flags = buckets.get(sev, [])
            if not flags:
                continue
            story.append(
                Paragraph(
                    f'<font color="{SEVERITY_COLORS[sev]}">'
                    f"{SEVERITY_LABELS[sev]} &nbsp;·&nbsp; {len(flags)}"
                    f"</font>",
                    ParagraphStyle(
                        f"Sev{sev}",
                        fontName="Times-Bold",
                        fontSize=12,
                        leading=16,
                        spaceBefore=10,
                        spaceAfter=4,
                    ),
                )
            )
            for i, f in enumerate(flags, start=1):
                story.append(
                    _finding_flowable(
                        number=i,
                        severity=sev,
                        explanation=_clean(f.explanation),
                        clause=_clean(f.clause),
                        body_style=body,
                        italic_style=body_italic,
                        title_style=finding_title,
                        small_style=small,
                    )
                )
                story.append(Spacer(1, 6))

    # -------------------------- in your favor --------------------------
    if result.green_flags:
        story.append(Spacer(1, 6))
        story.append(Paragraph("In Your Favor", section_h))
        story.append(
            Paragraph(
                "Clauses that work for you. Protect these during negotiation.",
                body,
            )
        )
        for i, g in enumerate(result.green_flags, start=1):
            story.append(
                _finding_flowable(
                    number=i,
                    severity="POSITIVE",
                    explanation=_clean(g.explanation),
                    clause=_clean(g.clause),
                    body_style=body,
                    italic_style=body_italic,
                    title_style=finding_title,
                    small_style=small,
                )
            )
            story.append(Spacer(1, 6))

    # -------------------------- missing protections --------------------------
    if result.missing_protections:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Missing Protections", section_h))
        story.append(
            Paragraph(
                "Clauses a fair contract should include but this one does not.",
                body,
            )
        )
        missing_rows = []
        for m in result.missing_protections:
            missing_rows.append(
                [
                    Paragraph("—", small),
                    Paragraph(_clean(m), body),
                ]
            )
        t = Table(
            missing_rows,
            colWidths=[0.3 * inch, doc.width - 0.3 * inch],
            hAlign="LEFT",
        )
        t.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 12))

    # -------------------------- recommendations --------------------------
    if result.negotiation_suggestions:
        story.append(Spacer(1, 6))
        story.append(Paragraph("Recommendations", section_h))
        story.append(
            Paragraph(
                "Proposed revisions to bring this contract back to a fair "
                "baseline. Negotiate in order of severity.",
                body,
            )
        )
        for i, s in enumerate(result.negotiation_suggestions, start=1):
            story.append(
                Paragraph(
                    f"<b>{i}.</b>&nbsp; {_clean(s)}",
                    ParagraphStyle(
                        "Rec",
                        parent=body,
                        leftIndent=14,
                        firstLineIndent=-14,
                        spaceAfter=4,
                    ),
                )
            )

    # -------------------------- closing --------------------------
    story.append(Spacer(1, 18))
    story.append(
        Paragraph(
            "This report was generated by Pactsafe AI. It is a screening "
            "tool, not legal advice. For high-stakes or precedent-setting "
            "agreements, consult a licensed attorney in your jurisdiction.",
            ParagraphStyle(
                "Closing",
                parent=small,
                fontName="Times-Italic",
                alignment=TA_CENTER,
                textColor=colors.HexColor("#777777"),
                spaceBefore=12,
            ),
        )
    )

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Finding card helper
# ---------------------------------------------------------------------------


def _finding_flowable(
    *,
    number: int,
    severity: str,
    explanation: str,
    clause: str,
    body_style,
    italic_style,
    title_style,
    small_style,
):
    """
    A single finding rendered as a two-column table:
      - left: thin colored vertical bar (severity)
      - right: title, explanation, quoted clause text
    KeepTogether ensures a single finding doesn't split across pages
    in the middle of the quoted clause.
    """
    from reportlab.lib import colors
    from reportlab.platypus import KeepTogether, Paragraph, Table, TableStyle

    color = colors.HexColor(SEVERITY_COLORS.get(severity, "#777777"))
    label = SEVERITY_LABELS.get(severity, severity.title())

    title_html = (
        f'<font color="{SEVERITY_COLORS.get(severity, "#777777")}">'
        f"<b>{label} · #{number}</b></font>"
    )

    content = [
        Paragraph(title_html, title_style),
        Paragraph(explanation or "—", body_style),
    ]
    if clause:
        # Quoted clause in italics, slightly muted.
        quote_html = f'&ldquo;{clause}&rdquo;'
        content.append(Paragraph(quote_html, italic_style))

    t = Table(
        [[content]],
        colWidths=["*"],
        hAlign="LEFT",
    )
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LINEBEFORE", (0, 0), (0, -1), 3, color),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAFA")),
                ("BOX", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E5E5")),
            ]
        )
    )
    return KeepTogether(t)
