"""initial schema: users, jobs, analyses

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-14 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _uuid() -> sa.types.TypeEngine:
    # Use native UUID on postgres, fall back to 36-char string on sqlite.
    return postgresql.UUID(as_uuid=True).with_variant(sa.String(36), "sqlite")


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "jobs",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("user_id", _uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("filename", sa.String(length=512), nullable=True),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("file_path", sa.String(length=1024), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("text_preview", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_jobs_user_id", "jobs", ["user_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])

    op.create_table(
        "analyses",
        sa.Column("id", _uuid(), primary_key=True),
        sa.Column("job_id", _uuid(), sa.ForeignKey("jobs.id"), nullable=False, unique=True),
        sa.Column("contract_type", sa.String(length=255), nullable=False, server_default="Unknown Contract"),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("model_used", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("provider", sa.String(length=32), nullable=True),
        sa.Column("result_json", _json(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_analyses_job_id", "analyses", ["job_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_analyses_job_id", table_name="analyses")
    op.drop_table("analyses")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_user_id", table_name="jobs")
    op.drop_table("jobs")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
