"""Database engine + session factory (SQLModel / SQLAlchemy)."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings

_settings = get_settings()

# For sqlite we need check_same_thread=False; for postgres we don't.
_connect_args: dict[str, object] = {}
if _settings.database_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False

engine = create_engine(
    _settings.database_url,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
)


def init_db() -> None:
    """Create all tables. Use only for tests / bootstrapping; prefer alembic in prod."""

    # Import models so SQLModel.metadata sees them
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency — yields a per-request DB session."""

    with Session(engine) as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    """Standalone context manager for background tasks."""

    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
