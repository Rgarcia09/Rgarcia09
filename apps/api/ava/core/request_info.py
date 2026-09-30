from __future__ import annotations

from fastapi import Request

from ava.config import get_settings


def client_ip(request: Request) -> str | None:
    """Client address, honouring X-Forwarded-For only from the configured proxy hops."""
    hops = get_settings().trusted_proxy_count
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and hops > 0:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops][:64]
    return request.client.host[:64] if request.client else None
