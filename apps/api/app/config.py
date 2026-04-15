"""
Application settings — loaded from environment variables / .env.

All secrets (API keys, DB URLs) live here, server-side only. Never expose to
the browser.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# apps/api/app/config.py -> parents[3] = repo root (Pactsafe-Ai/)
_REPO_ROOT = Path(__file__).resolve().parents[3]
_REPO_ENV = _REPO_ROOT / ".env"
_API_ENV = _REPO_ROOT / "apps" / "api" / ".env"

# Explicitly load the repo-root .env so the process env is populated even if
# pydantic-settings doesn't find it (CWD may be anywhere).
if _REPO_ENV.exists():
    load_dotenv(_REPO_ENV, override=False)
if _API_ENV.exists():
    load_dotenv(_API_ENV, override=False)


class Settings(BaseSettings):
    """Runtime settings. Reads from ENV / .env at the repo root."""

    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ENV), str(_API_ENV), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- LLM provider ---
    llm_provider: Literal["ollama", "anthropic", "groq", "gemini"] = "gemini"

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:0.5b"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-5"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-pro"

    # --- Database ---
    database_url: str = "sqlite:///./pactsafe.db"

    # --- App ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    upload_dir: str = "./uploads"
    max_upload_mb: int = 10
    cors_origins: str = "http://localhost:3000"

    # --- LlamaParse (smart extraction routing) ---
    llama_cloud_api_key: str = ""
    token_threshold: int = 120_000
    hard_max_upload_mb: int = 100

    @model_validator(mode="after")
    def _require_gemini_key_when_selected(self) -> "Settings":
        if self.llm_provider == "gemini" and not self.gemini_api_key.strip():
            raise ValueError(
                "LLM_PROVIDER=gemini requires GEMINI_API_KEY to be set in .env."
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def hard_max_upload_bytes(self) -> int:
        return self.hard_max_upload_mb * 1024 * 1024

    @property
    def llama_parse_enabled(self) -> bool:
        return bool(self.llama_cloud_api_key.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def require_gemini_api_key() -> str:
    """Return the configured Gemini API key or raise ValueError."""
    key = (get_settings().gemini_api_key or "").strip()
    if not key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Put it in the repo-root .env file."
        )
    return key


def _configure_genai() -> None:
    import google.generativeai as genai

    genai.configure(api_key=require_gemini_api_key())


def list_generate_content_models() -> list[str]:
    """Return names of Gemini models that support generateContent."""
    import google.generativeai as genai

    _configure_genai()
    names: list[str] = []
    for m in genai.list_models():
        methods = getattr(m, "supported_generation_methods", []) or []
        if "generateContent" in methods:
            names.append(m.name)
    return names


def list_gemini_25_models() -> list[str]:
    """Return only Gemini 2.5 models that support generateContent."""
    return [n for n in list_generate_content_models() if "gemini-2.5" in n]


def test_api_key() -> bool:
    """True if at least one Gemini 2.5 model supports generateContent."""
    try:
        models_25 = list_gemini_25_models()
    except Exception as exc:
        print(f"[test_api_key] Failed to list models: {exc}")
        return False

    if models_25:
        print(f"[test_api_key] OK — {len(models_25)} Gemini 2.5 models available:")
        for name in models_25:
            print(f"  - {name}")
        return True

    try:
        available = list_generate_content_models()
    except Exception as exc:
        print(f"[test_api_key] Failed to list all models: {exc}")
        return False

    print("[test_api_key] No Gemini 2.5 models found. Available generateContent models:")
    for name in available:
        print(f"  - {name}")
    return False
