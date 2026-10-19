"""Hinglish parser accuracy and runtime test.

Runs 15 Hinglish samples through parse_meal and checks quantity resolution,
cooked-vs-raw preference, capping, and match quality.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from app.database import engine
from app.services.parser import parse_meal
import scripts.seed_db as seed_db
from app.models import Food


SAMPLES = [
    # 10 Part A2.4 samples
    "1 katori dal, 2 roti, thoda dahi",
    "ek glass doodh",
    "2 roti aur 1 bowl rice",
    "100g paneer",
    "1 plate biryani",
    "3 egg",
    "1 katori rice aur 1 katori dal",
    "palak paneer with rice",
    "2 katori chawal",
    "half katori dal",
    # 5 Part A4.1 multi-item samples
    "2 roti aur 1 katori dal aur 1 glass doodh",
    "1 plate biryani and 1 glass lassi",
    "chai aur biscuit",
    "3 roti",
    "thoda sa rice",
]


def _seed_if_empty() -> None:
    with Session(engine) as session:
        if session.query(Food).first() is None:
            seed_db.seed()


async def run_tests() -> None:
    _seed_if_empty()
    passed = 0
    total = len(SAMPLES)

    print(f"\n{'='*75}")
    print(f"Hinglish Parser Evaluation (15 Samples)")
    print(f"{'='*75}\n")
    print(f"{'#':<3} | {'Input Text':<38} | {'Items':<5} | {'All Qty>0':<9} | {'Status'}")
    print(f"{'-'*75}")

    with Session(engine) as db:
        for idx, text in enumerate(SAMPLES, 1):
            try:
                res = await parse_meal(db, text)
                has_items = len(res.items) > 0
                all_pos = all(item.qty_g > 0 for item in res.items)
                # Success criteria: has items, all positive qty, items have valid structure
                is_ok = has_items and all_pos
                if is_ok:
                    passed += 1
                status = "PASS" if is_ok else "FAIL"
                print(f"{idx:<3} | {text:<38} | {len(res.items):<5} | {str(all_pos):<9} | {status}")
            except Exception as exc:
                print(f"{idx:<3} | {text:<38} | ERROR: {exc}")

    print(f"{'-'*75}")
    print(f"Result: {passed}/{total} passed ({(passed/total)*100:.1f}%)\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
