"""
Pytest config — point tests at an in-memory sqlite DB and fake LLM creds.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Make `import app.*` work from the tests dir
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///./_test.db")
os.environ.setdefault("LLM_PROVIDER", "ollama")
os.environ.setdefault("OLLAMA_URL", "http://localhost:11434")
os.environ.setdefault("UPLOAD_DIR", str(ROOT / "uploads"))
