"""
Application settings — loaded from environment variables / .env.

All secrets (API keys, DB URLs) live here, server-side only. Never expose to
the browser.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Reads from ENV / .env at the repo root."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
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
    gemini_model: str = "gemini-2.0-flash"

    # --- Database ---
    database_url: str = "sqlite:///./pactsafe.db"

    # --- App ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    upload_dir: str = "./uploads"
    max_upload_mb: int = 10
    cors_origins: str = "http://localhost:3000"

    # --- LlamaParse (smart extraction routing) ---
    # Set LLAMA_CLOUD_API_KEY in Fly secrets to enable LlamaParse for
    # large documents. When empty, the backend falls back to direct
    # extraction (pdfplumber + python-docx) only.
    llama_cloud_api_key: str = ""
    # Tokens above this threshold trigger the LlamaParse route.
    token_threshold: int = 120_000
    # Hard ceiling: reject uploads above this many MB before we even
    # touch LlamaParse or the local extractor.
    hard_max_upload_mb: int = 100

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
