"""In-memory token bucket rate limiter.

Used to guard calls to upstream APIs (Groq) from exhausting free-tier quotas.
The bucket is process-local and intentionally simple for the prototype.
"""

import threading
import time

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
            self._capacity,
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
            wait_seconds = deficit / self._refill_per_second
            return False, wait_seconds


def make_groq_bucket(rpm: int | None = None) -> TokenBucket:
    """Create a token bucket sized for Groq's free-tier RPM limit."""
    limit = rpm if rpm is not None else settings.groq_rate_limit_rpm
    refill_per_second = limit / 60.0
    return TokenBucket(capacity=limit, refill_per_second=refill_per_second)


# Process-wide bucket used by the Groq client wrapper.
groq_bucket = make_groq_bucket()
