from __future__ import annotations

import httpx

from ava.ai.providers.base import AIProviderError, ChatMessage, ProviderHealth


class OllamaProvider:
    name = "ollama"
    is_local = True

    def __init__(self, base_url: str, model: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "options": {"temperature": temperature},
            "messages": [{"role": m.role, "content": m.content} for m in messages],
        }
        try:
            resp = httpx.post(f"{self.base_url}/api/chat", json=payload, timeout=self.timeout)
            resp.raise_for_status()
            content = resp.json()["message"]["content"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            raise AIProviderError(f"Ollama request failed: {type(exc).__name__}") from exc
        if not isinstance(content, str):
            raise AIProviderError("Ollama returned an unexpected response.")
        return content.strip()

    def health(self) -> ProviderHealth:
        try:
            resp = httpx.get(f"{self.base_url}/api/tags", timeout=5)
            resp.raise_for_status()
            models = {m.get("name", "") for m in resp.json().get("models", [])}
        except (httpx.HTTPError, ValueError):
            return ProviderHealth(False, "The local AI engine (Ollama) is not reachable.")
        available = self.model in models or f"{self.model}:latest" in models
        detail = "Online" if available else f"Online, but model '{self.model}' is not pulled."
        return ProviderHealth(True, detail, model_available=available)
