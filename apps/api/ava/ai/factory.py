from __future__ import annotations

from functools import lru_cache

from ava.ai.policy import StrictLocalViolation, enforce_local_endpoint
from ava.ai.providers.base import AIProvider
from ava.ai.providers.disabled import DisabledProvider
from ava.ai.providers.ollama import OllamaProvider
from ava.ai.providers.openai_compatible import OpenAICompatibleProvider
from ava.config import Settings, get_settings


def build_provider(settings: Settings, model: str | None = None) -> AIProvider:
    model = model or settings.ai_model
    if settings.ai_provider == "none":
        return DisabledProvider()
    if settings.strict_local_mode:
        if settings.ai_provider == "cloud":
            raise StrictLocalViolation("The cloud AI provider is disabled in strict local mode.")
        enforce_local_endpoint(settings.ai_base_url, purpose="AI engine")
    if settings.ai_provider == "ollama":
        return OllamaProvider(settings.ai_base_url, model, settings.ai_timeout_seconds)
    if settings.ai_provider == "vllm":
        return OpenAICompatibleProvider(
            name="vllm",
            base_url=settings.ai_base_url,
            model=model,
            timeout=settings.ai_timeout_seconds,
            is_local=True,
        )
    # "cloud": reachable only when an administrator turned strict local mode off.
    key = settings.cloud_ai_api_key.get_secret_value() if settings.cloud_ai_api_key else None
    return OpenAICompatibleProvider(
        name="cloud",
        base_url=settings.ai_base_url,
        model=model,
        timeout=settings.ai_timeout_seconds,
        is_local=False,
        api_key=key,
    )


@lru_cache(maxsize=4)
def _cached(model: str) -> AIProvider:
    return build_provider(get_settings(), model)


def get_provider(model: str | None = None) -> AIProvider:
    return _cached(model or get_settings().ai_model)
