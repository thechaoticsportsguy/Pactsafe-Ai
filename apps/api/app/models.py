"""
SQLModel tables — users, jobs, analyses.

Note: AnalysisResult JSON is stored on the Analysis row as a JSON string. The
Pydantic AnalysisResult class (schemas.py) is the source of truth for shape.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _json_type() -> Column:  # type: ignore[type-arg]
    """Use JSONB on postgres, fall back to JSON for sqlite/tests."""

    # SQLAlchemy picks the dialect-specific type at DDL time.
    return Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id", index=True)

    filename: Optional[str] = None
    content_type: Optional[str] = None
    file_path: Optional[str] = Field(
        default=None, sa_column=Column(String(1024), nullable=True)
    )
    size_bytes: Optional[int] = None

    # queued / extracting / analyzing / completed / failed
    status: str = Field(default="queued", index=True)
    error: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    text_preview: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    # Full extracted text — populated by the smart-routing extractor
    # *before* the job is enqueued, so the background worker skips
    # extraction entirely for uploads that went through /jobs/from-file
    # or /jobs/from-text.
    extracted_text: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )

    # How the text was extracted: "direct" | "llama_parse" | "inline_text".
    # Surfaced on the job response so the frontend can show which path
    # was used and we can debug extraction quality regressions.
    extraction_route: Optional[str] = Field(
        default=None, sa_column=Column(String(32), nullable=True)
    )

    # Rough token count (len(text) // 4) — cheap, fine for routing.
    token_count: Optional[int] = None

    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


class Analysis(SQLModel, table=True):
    __tablename__ = "analyses"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    job_id: UUID = Field(foreign_key="jobs.id", unique=True, index=True)

    contract_type: str = "Unknown Contract"
    risk_score: int = 0
    model_used: str = ""
    provider: Optional[str] = None

    # Full AnalysisResult payload (see schemas.AnalysisResult)
    result_json: Optional[dict] = Field(default=None, sa_column=_json_type())

    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
