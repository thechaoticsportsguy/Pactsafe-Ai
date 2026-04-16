"""add model_preference to jobs

Revision ID: 0003_add_model_preference
Revises: 0002_add_extraction_fields
Create Date: 2026-04-16 00:00:00.000000

Stores the caller's desired model (``"pro"`` / ``"flash"`` / ``"flash-lite"``)
on the job so the worker can pick the right tier. NULL falls back to the
provider default configured in settings.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_model_preference"
down_revision: Union[str, None] = "0002_add_extraction_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.add_column(sa.Column("model_preference", sa.String(32), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.drop_column("model_preference")
