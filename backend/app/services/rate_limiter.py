"""In-memory token bucket rate limiter.

Used to guard calls to upstream APIs (Groq) from exhausting free-tier quotas.
The bucket is process-local and intentionally simple for the prototype.
"""

import threading
import time
from typing import Any

from app.config import settings


class TokenBucket:
    """Thread-safe token bucket with continuous refill.

    Args:
        capacity: Maximum number of tokens the bucket can hold.
        refill_per_second: Tokens added to the bucket every second.
    """

    def __init__(self, capacity: int, refill_per_second: float) -> None:
        self._capacity = capacity
        self._refill_per_second = refill_per_second
        self._tokens: float = float(capacity)
        self._last_refill = time.monotonic()
        self._lock = threading.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(
            float(self._capacity),
            self._tokens + elapsed * self._refill_per_second,
        )
        self._last_refill = now

    def consume(self, tokens: int = 1) -> tuple[bool, float]:
        """Try to consume ``tokens`` from the bucket.

        Returns:
            A tuple of (allowed, wait_seconds). ``wait_seconds`` is an
            estimate of how long the caller must wait before the request
            can be allowed if it was denied.
        """
        with self._lock:
            self._refill()
            if self._tokens >= tokens:
                self._tokens -= tokens
                return True, 0.0

            deficit = tokens - self._tokens
            wait_seconds = deficit / self._refill_per_second if self._refill_per_second > 0 else 60.0
            return False, wait_seconds

    @property
    def tokens(self) -> float:
        with self._lock:
            self._refill()
            return self._tokens

    def drain(self) -> None:
        with self._lock:
            self._tokens = 0.0
            self._last_refill = time.monotonic()


class KeyedRateLimiter:
    """Thread-safe rate limiter managing per-key TokenBuckets and cooldowns."""

    def __init__(self, keys: list[str], capacity: int = 20, refill_per_minute: float = 20.0) -> None:
        self._keys = list(keys)
        self._capacity = capacity
        self._refill_per_minute = refill_per_minute
        refill_per_second = refill_per_minute / 60.0
        self._buckets: dict[str, TokenBucket] = {
            k: TokenBucket(capacity=capacity, refill_per_second=refill_per_second)
            for k in self._keys
        }
        self._cooldowns: dict[str, float] = {k: 0.0 for k in self._keys}
        self._cursor: int = 0
        self._lock = threading.Lock()

    def acquire(self) -> str | None:
        """Finds next key with available tokens, rotating through keys."""
        with self._lock:
            if not self._keys:
                return None

            now = time.monotonic()
            num_keys = len(self._keys)

            for i in range(num_keys):
                idx = (self._cursor + i) % num_keys
                key = self._keys[idx]

                # Check cooldown
                if self._cooldowns[key] > now:
                    continue

                bucket = self._buckets[key]
                allowed, _ = bucket.consume(1)
                if allowed:
                    self._cursor = (idx + 1) % num_keys
                    return key

            return None

    def mark_failed(self, key: str, cooldown_seconds: float = 60.0) -> None:
        """Drains a key's bucket and sets a cooldown timestamp."""
        with self._lock:
            if key in self._buckets:
                self._buckets[key].drain()
                self._cooldowns[key] = time.monotonic() + cooldown_seconds

    def mark_success(self, key: str) -> None:
        """No-op (bucket already consumed a token on acquire)."""
        pass

    def status(self) -> dict[str, dict[str, Any]]:
        """Returns per-key state (tokens remaining, cooldown_until) for diagnostics endpoint."""
        with self._lock:
            now = time.monotonic()
            wall_now = time.time()
            res: dict[str, dict[str, Any]] = {}
            for idx, key in enumerate(self._keys):
                bucket = self._buckets[key]
                cooldown_left = max(0.0, self._cooldowns[key] - now)
                cooldown_until = (wall_now + cooldown_left) if cooldown_left > 0 else None
                res[f"key_{idx}"] = {
                    "index": idx,
                    "tokens": round(bucket.tokens, 2),
                    "cooldown_until": cooldown_until,
                    "in_cooldown": cooldown_left > 0,
                }
            return res


def make_groq_bucket(rpm: int | None = None) -> TokenBucket:
    """Create a token bucket sized for Groq's free-tier RPM limit."""
    limit = rpm if rpm is not None else settings.groq_rate_limit_rpm
    refill_per_second = limit / 60.0
    return TokenBucket(capacity=limit, refill_per_second=refill_per_second)


# Process-wide bucket used by backward-compatible callers.
groq_bucket = make_groq_bucket()
