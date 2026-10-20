"""Unit test for KeyedRateLimiter."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.rate_limiter import KeyedRateLimiter


def test_keyed_rate_limiter() -> None:
    # Create a KeyedRateLimiter with 2 keys, capacity 2
    limiter = KeyedRateLimiter(keys=["key1", "key2"], capacity=2, refill_per_minute=2.0)

    # acquire() 5 times
    k1 = limiter.acquire()
    k2 = limiter.acquire()
    k3 = limiter.acquire()
    k4 = limiter.acquire()
    k5 = limiter.acquire()

    assert k1 == "key1", f"Expected key1, got {k1}"
    assert k2 == "key2", f"Expected key2, got {k2}"
    assert k3 == "key1", f"Expected key1, got {k3}"
    assert k4 == "key2", f"Expected key2, got {k4}"
    assert k5 is None, f"Expected None (exhausted), got {k5}"

    # mark_failed("key1") with a fresh limiter where keys have tokens
    limiter2 = KeyedRateLimiter(keys=["key1", "key2"], capacity=2, refill_per_minute=2.0)
    limiter2.mark_failed("key1", cooldown_seconds=60.0)

    # acquire() should return key2 because key1 is in cooldown and drained
    acquired = limiter2.acquire()
    assert acquired == "key2", f"Expected key2, got {acquired}"

    status = limiter2.status()
    assert "key_0" in status and "key_1" in status
    assert status["key_0"]["in_cooldown"] is True

    print("PASS: test_keyed_rate_limiter passed all assertions.")


if __name__ == "__main__":
    test_keyed_rate_limiter()
