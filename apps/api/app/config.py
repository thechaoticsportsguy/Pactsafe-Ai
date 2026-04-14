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
    llm_provider: Literal["ollama", "anthropic", "groq"] = "ollama"

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:0.5b"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-5"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- Database ---
    database_url: str = "sqlite:///./pactsafe.db"

    # --- App ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    upload_dir: str = "./uploads"
    max_upload_mb: int = 10
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
