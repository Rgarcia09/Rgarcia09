"""Application configuration.

All configuration comes from environment variables (or a `.env` file in development).
Secrets are never hard-coded. See `.env.example` at the repository root.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["development", "test", "production"]
AIProviderName = Literal["ollama", "vllm", "cloud", "none"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Identity -------------------------------------------------------------
    # The assistant's name is provisional; change it here (or in Settings UI) only.
    ava_name: str = "AVA"
    office_name: str = "Architecture Office"
    internal_url: str = "https://ava.office.local"
    # IANA zone used for "today", deadlines and briefings.
    office_timezone: str = "America/Puerto_Rico"

    # --- Runtime --------------------------------------------------------------
    app_env: AppEnv = "development"
    # Demo seed data may only be loaded when this is explicitly enabled outside production.
    demo_mode: bool = False
    log_level: str = "INFO"

    # --- Database / cache -----------------------------------------------------
    database_url: str = "postgresql+psycopg://ava:ava@localhost:5432/ava"
    redis_url: str | None = None

    # --- Security -------------------------------------------------------------
    secret_key: SecretStr = Field(default=SecretStr(""))
    session_cookie_name: str = "ava_session"
    csrf_cookie_name: str = "ava_csrf"
    session_ttl_hours: int = 12
    # Must be true whenever AVA is served over HTTPS (always, in production).
    cookie_secure: bool = True
    login_rate_limit_per_minute: int = 10
    trusted_proxy_count: int = 1
    # Comma-separated Host header allow-list, e.g. "ava.office.local,localhost". Empty = any.
    allowed_hosts: str = ""

    # --- Privacy / AI ---------------------------------------------------------
    # When true: no office data may be sent to any external AI service.
    strict_local_mode: bool = True
    ai_provider: AIProviderName = "ollama"
    ai_base_url: str = "http://ollama:11434"
    ai_model: str = "llama3.1:8b-instruct-q4_K_M"
    ai_timeout_seconds: float = 120.0
    ai_max_context_chars: int = 12000
    # Only honoured when strict_local_mode is false AND ai_provider == "cloud".
    cloud_ai_api_key: SecretStr | None = None
    embedding_model: str = "nomic-embed-text"

    # --- Billing defaults (Phase 4) -------------------------------------------
    invoice_alert_threshold_days: int = 30
    invoice_review_frequency_days: int = 15

    @model_validator(mode="after")
    def _validate(self) -> Settings:
        if self.app_env == "production":
            if len(self.secret_key.get_secret_value()) < 32:
                raise ValueError("SECRET_KEY must be set to at least 32 characters in production")
            if self.demo_mode:
                raise ValueError("DEMO_MODE cannot be enabled in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
        if self.strict_local_mode and self.ai_provider == "cloud":
            raise ValueError("AI_PROVIDER=cloud is not allowed while STRICT_LOCAL_MODE=true")
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
