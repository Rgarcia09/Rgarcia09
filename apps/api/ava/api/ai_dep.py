from __future__ import annotations

import logging

from ava.ai.factory import get_provider
from ava.ai.policy import StrictLocalViolation
from ava.ai.providers.base import AIProvider, AIProviderError, ChatMessage, ProviderHealth

log = logging.getLogger("ava.ai")


class _BlockedProvider:
    """Stands in when configuration violates strict local mode: refuses every request."""

    name = "blocked"
    model = "none"
    is_local = True

    def __init__(self, reason: str) -> None:
        self.reason = reason

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str:
        raise AIProviderError(self.reason)

    def health(self) -> ProviderHealth:
        return ProviderHealth(False, self.reason)


def ai_provider() -> AIProvider:
    """FastAPI dependency (overridable in tests)."""
    try:
        return get_provider()
    except StrictLocalViolation as exc:
        log.error("AI provider blocked: %s", exc)
        return _BlockedProvider(str(exc))
