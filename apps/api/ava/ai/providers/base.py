"""Provider-agnostic interface to a language model.

AVA is never coupled to one model or engine: Ollama, vLLM (or any OpenAI-compatible local
server) and an optional, disabled-by-default cloud adapter all implement `AIProvider`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class ChatMessage:
    role: Role
    content: str


@dataclass(frozen=True)
class ProviderHealth:
    online: bool
    detail: str
    model_available: bool | None = None


class AIProviderError(RuntimeError):
    """The engine could not produce an answer (offline, timeout, bad response)."""


class AIProvider(Protocol):
    name: str
    model: str
    #: True when inference runs on infrastructure controlled by the office.
    is_local: bool

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str: ...

    def health(self) -> ProviderHealth: ...
