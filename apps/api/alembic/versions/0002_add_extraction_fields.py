"""add extraction fields to jobs: extracted_text, extraction_route, token_count

Revision ID: 0002_add_extraction_fields
Revises: 0001_initial
Create Date: 2026-04-15 00:00:00.000000

These three columns support the smart-routing extraction pipeline that
pre-extracts text (via LlamaParse or pdfplumber) synchronously in the
HTTP endpoint, then stores the result so the background worker can skip
extraction entirely and jump straight to analysis.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_add_extraction_fields"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.add_column(sa.Column("extracted_text",    sa.Text(),          nullable=True))
        batch.add_column(sa.Column("extraction_route",  sa.String(32),      nullable=True))
        batch.add_column(sa.Column("token_count",       sa.Integer(),       nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.drop_column("token_count")
        batch.drop_column("extraction_route")
        batch.drop_column("extracted_text")
