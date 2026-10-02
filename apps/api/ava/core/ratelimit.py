"""Fixed-window rate limiting (Redis when configured, in-process otherwise)."""

from __future__ import annotations

import threading
import time
from functools import lru_cache
from typing import Protocol

from ava.config import get_settings


class RateLimiter(Protocol):
    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        """Register one hit; return True if the caller is still within the limit."""

    def reset(self, key: str) -> None: ...


class MemoryRateLimiter:
    """Suitable for a single API process. Use Redis when running several workers."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._windows: dict[str, tuple[int, int]] = {}

    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        window = int(time.time() // window_seconds)
        with self._lock:
            current_window, count = self._windows.get(key, (window, 0))
            if current_window != window:
                count = 0
            count += 1
            self._windows[key] = (window, count)
            return count <= limit

    def reset(self, key: str) -> None:
        with self._lock:
            self._windows.pop(key, None)


class RedisRateLimiter:
    def __init__(self, url: str) -> None:
        import redis

        self._redis = redis.Redis.from_url(url, socket_timeout=2)

    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        window = int(time.time() // window_seconds)
        redis_key = f"ava:rl:{key}:{window}"
        pipe = self._redis.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, window_seconds)
        count, _ = pipe.execute()
        return int(count) <= limit

    def reset(self, key: str) -> None:
        for k in self._redis.scan_iter(f"ava:rl:{key}:*"):
            self._redis.delete(k)


@lru_cache
def get_rate_limiter() -> RateLimiter:
    url = get_settings().redis_url
    return RedisRateLimiter(url) if url else MemoryRateLimiter()
