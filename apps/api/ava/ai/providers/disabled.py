from __future__ import annotations

from ava.ai.providers.base import AIProviderError, ChatMessage, ProviderHealth


class DisabledProvider:
    """Used when AI_PROVIDER=none. Structured answers still work; free-form ones do not."""

    name = "none"
    model = "none"
    is_local = True

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str:
        raise AIProviderError("No AI engine is configured.")

    def health(self) -> ProviderHealth:
        return ProviderHealth(False, "No AI engine is configured (AI_PROVIDER=none).")
