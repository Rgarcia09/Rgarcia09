"""Strict-local-mode enforcement.

With STRICT_LOCAL_MODE=true, office data must never reach an external AI service. Besides
refusing the cloud adapter, AVA verifies that the configured AI endpoint is on the local
machine or the private network, so a mistyped URL cannot silently leak documents.
"""

from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

LOCAL_SUFFIXES = (".local", ".lan", ".internal", ".home.arpa", ".localdomain", ".corp")


class StrictLocalViolation(RuntimeError):
    pass


def is_private_endpoint(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower().rstrip(".")
    if not host:
        return False
    if host == "localhost":
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        # Single-label names (e.g. Docker service "ollama") and internal DNS suffixes.
        return "." not in host or host.endswith(LOCAL_SUFFIXES)
    return ip.is_private or ip.is_loopback or ip.is_link_local


def enforce_local_endpoint(url: str, *, purpose: str) -> None:
    if not is_private_endpoint(url):
        raise StrictLocalViolation(
            f"STRICT_LOCAL_MODE is enabled, but the {purpose} endpoint '{url}' is not on the "
            "local machine or private network. Refusing to send office data to it."
        )
