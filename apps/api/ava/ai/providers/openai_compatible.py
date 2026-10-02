"""OpenAI-compatible chat API. Used for local vLLM / llama.cpp servers, and — only when an
administrator disables strict local mode — for an external cloud provider."""

from __future__ import annotations

import httpx

from ava.ai.providers.base import AIProviderError, ChatMessage, ProviderHealth


class OpenAICompatibleProvider:
    def __init__(
        self,
        *,
        name: str,
        base_url: str,
        model: str,
        timeout: float,
        is_local: bool,
        api_key: str | None = None,
    ) -> None:
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.is_local = is_local
        self._headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    def chat(self, messages: list[ChatMessage], *, temperature: float = 0.2) -> str:
        payload = {
            "model": self.model,
            "temperature": temperature,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
        }
        try:
            resp = httpx.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                headers=self._headers,
                timeout=self.timeout,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            raise AIProviderError(f"{self.name} request failed: {type(exc).__name__}") from exc
        return str(content).strip()

    def health(self) -> ProviderHealth:
        try:
            resp = httpx.get(f"{self.base_url}/v1/models", headers=self._headers, timeout=5)
            resp.raise_for_status()
            ids = {m.get("id") for m in resp.json().get("data", [])}
        except (httpx.HTTPError, ValueError):
            return ProviderHealth(False, f"The AI engine ({self.name}) is not reachable.")
        available = self.model in ids
        detail = "Online" if available else f"Online, but model '{self.model}' is not served."
        return ProviderHealth(True, detail, model_available=available)
