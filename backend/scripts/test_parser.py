"""Offline accuracy evaluation for the rule-based Hinglish parser.

Runs the deterministic parser against 50 labelled Hinglish meal samples and
prints a JSON accuracy report to stdout.
"""

import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import structlog
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Food
from app.schemas.parse import ParsedMeal
from app.services.parser import parse_meal
import scripts.seed_db as seed_db


structlog.configure(
    processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.processors.JSONRenderer()],
    logger_factory=structlog.PrintLoggerFactory(file=open(os.devnull, "w")),
)


@dataclass(frozen=True)
class ExpectedItem:
    food_name: str
    qty_g: float


@dataclass(frozen=True)
class TestCase:
    text: str
    expected: list[ExpectedItem]


@dataclass(frozen=True)
class _ItemMatch:
    expected_food: str
    expected_qty_g: float
    actual_food: str | None
    actual_qty_g: float | None
    matched: bool


@dataclass(frozen=True)
class _CaseResult:
    text: str
    exact: bool
    item_hits: int
    expected_items: int
    parsed_items: int
    matches: list[_ItemMatch]


_TOLERANCE = 0.20


_TEST_CASES: list[TestCase] = [
    TestCase("ek roti", [ExpectedItem("Roti / chapati (wheat, plain)", 40.0)]),
    TestCase("do roti", [ExpectedItem("Roti / chapati (wheat, plain)", 80.0)]),
    TestCase("teen roti", [ExpectedItem("Roti / chapati (wheat, plain)", 120.0)]),
    TestCase("char chapati", [ExpectedItem("Roti / chapati (wheat, plain)", 160.0)]),
    TestCase("ek paratha", [ExpectedItem("Paratha, plain (wheat, with oil)", 50.0)]),
    TestCase("do paratha", [ExpectedItem("Paratha, plain (wheat, with oil)", 100.0)]),
    TestCase("ek katori dal", [ExpectedItem("Dal, cooked (toor/arhar, plain)", 150.0)]),
    TestCase("ek bowl dal", [ExpectedItem("Dal, cooked (toor/arhar, plain)", 150.0)]),
    TestCase("do katori dal", [ExpectedItem("Dal, cooked (toor/arhar, plain)", 300.0)]),
    TestCase("ek plate rice", [ExpectedItem("Rice, cooked (white)", 150.0)]),
    TestCase("ek bowl rice", [ExpectedItem("Rice, cooked (white)", 150.0)]),
    TestCase("do katori rice", [ExpectedItem("Rice, cooked (white)", 300.0)]),
    TestCase("ek katori dahi", [ExpectedItem("Curd (dahi), whole milk", 150.0)]),
    TestCase("ek glass cow milk", [ExpectedItem("Milk, cow", 250.0)]),
    TestCase("ek cup chai", [ExpectedItem("Chai (milk tea with sugar)", 150.0)]),
    TestCase("ek boiled egg", [ExpectedItem("Egg, whole, boiled", 50.0)]),
    TestCase("do boiled egg", [ExpectedItem("Egg, whole, boiled", 100.0)]),
    TestCase("ek piece paneer", [ExpectedItem("Paneer", 50.0)]),
    TestCase("ek katori paneer bhurji", [ExpectedItem("Paneer bhurji", 100.0)]),
    TestCase("ek katori palak paneer", [ExpectedItem("Palak paneer", 150.0)]),
    TestCase("ek plate rajma masala", [ExpectedItem("Rajma masala", 150.0)]),
    TestCase("ek bowl chana masala", [ExpectedItem("Chana masala (chole)", 150.0)]),
    TestCase("do roti aur ek katori dal", [
        ExpectedItem("Roti / chapati (wheat, plain)", 80.0),
        ExpectedItem("Dal, cooked (toor/arhar, plain)", 150.0),
    ]),
    TestCase("ek katori dal fry", [ExpectedItem("Dal fry / dal tadka (toor, home style)", 150.0)]),
    TestCase("ek plate khichdi", [ExpectedItem("Khichdi (rice + moong dal, with ghee)", 200.0)]),
    TestCase("ek katori sambar", [ExpectedItem("Sambar", 150.0)]),
    TestCase("do idli", [ExpectedItem("Idli", 160.0)]),
    TestCase("ek dosa", [ExpectedItem("Dosa, plain", 100.0)]),
    TestCase("ek katori poha", [ExpectedItem("Poha (prepared)", 150.0)]),
    TestCase("ek katori upma", [ExpectedItem("Upma (sooji)", 150.0)]),
    TestCase("ek thepla", [ExpectedItem("Thepla, methi", 50.0)]),
    TestCase("do thepla", [ExpectedItem("Thepla, methi", 100.0)]),
    TestCase("ek katori kadhi", [ExpectedItem("Kadhi (Gujarati style)", 150.0)]),
    TestCase("ek katori fish curry", [ExpectedItem("Fish curry (rohu)", 150.0)]),
    TestCase("ek katori chicken curry", [ExpectedItem("Chicken curry", 150.0)]),
    TestCase("ek bowl vegetable pulao", [ExpectedItem("Vegetable pulao", 150.0)]),
    TestCase("ek katori curd rice", [ExpectedItem("Curd rice", 200.0)]),
    TestCase("ek bowl aloo sabzi", [ExpectedItem("Aloo sabzi (dry)", 100.0)]),
    TestCase("ek plate sabzi", [ExpectedItem("Sabzi, mixed vegetable (dry)", 100.0)]),
    TestCase("ek katori dal, ek katori rice aur ek roti", [
        ExpectedItem("Dal, cooked (toor/arhar, plain)", 150.0),
        ExpectedItem("Rice, cooked (white)", 150.0),
        ExpectedItem("Roti / chapati (wheat, plain)", 40.0),
    ]),
    TestCase("palak paneer with roti", [
        ExpectedItem("Palak paneer", 150.0),
        ExpectedItem("Roti / chapati (wheat, plain)", 40.0),
    ]),
    TestCase("egg bhurji aur do roti", [
        ExpectedItem("Egg bhurji", 100.0),
        ExpectedItem("Roti / chapati (wheat, plain)", 80.0),
    ]),
    TestCase("cow milk with badam", [
        ExpectedItem("Milk, cow", 250.0),
        ExpectedItem("Almond (badam)", 30.0),
    ]),
    TestCase("do roti and 1 katori dahi", [
        ExpectedItem("Roti / chapati (wheat, plain)", 80.0),
        ExpectedItem("Curd (dahi), whole milk", 150.0),
    ]),
    TestCase("ek glass buttermilk", [ExpectedItem("Buttermilk (chaas), diluted", 250.0)]),
    TestCase("ek bowl sambar", [ExpectedItem("Sambar", 150.0)]),
    TestCase("ek katori chana masala", [ExpectedItem("Chana masala (chole)", 150.0)]),
    TestCase("teen roti aur ek katori sabzi", [
        ExpectedItem("Roti / chapati (wheat, plain)", 120.0),
        ExpectedItem("Sabzi, mixed vegetable (dry)", 100.0),
    ]),
    TestCase("ek katori dal tadka", [ExpectedItem("Dal fry / dal tadka (toor, home style)", 150.0)]),
    TestCase("char roti", [ExpectedItem("Roti / chapati (wheat, plain)", 160.0)]),
]


def _seed_if_empty() -> None:
    with Session(engine) as session:
        if session.query(Food).first() is None:
            seed_db.seed()


def _qty_matches(actual: float, expected: float) -> bool:
    return abs(actual - expected) <= max(expected * _TOLERANCE, 5.0)


def _evaluate_case(db: Session, case: TestCase) -> _CaseResult:
    result: ParsedMeal = parse_meal(db, case.text)
    item_hits = 0
    matches: list[_ItemMatch] = []

    for expected in case.expected:
        hit = next(
            (
                item
                for item in result.items
                if item.matched and item.food_name == expected.food_name
            ),
            None,
        )
        qty_ok = hit is not None and _qty_matches(hit.qty_g, expected.qty_g)
        if hit is not None and qty_ok:
            item_hits += 1
        matches.append(
            _ItemMatch(
                expected_food=expected.food_name,
                expected_qty_g=expected.qty_g,
                actual_food=hit.food_name if hit else None,
                actual_qty_g=hit.qty_g if hit else None,
                matched=hit is not None and qty_ok,
            )
        )

    sample_exact = item_hits == len(case.expected) and len(result.items) == len(case.expected)

    return _CaseResult(
        text=case.text,
        exact=sample_exact,
        item_hits=item_hits,
        expected_items=len(case.expected),
        parsed_items=len(result.items),
        matches=matches,
    )


def main() -> int:
    _seed_if_empty()

    sample_results: list[_CaseResult] = []
    total_expected = 0
    total_hits = 0
    exact_samples = 0

    with Session(engine) as db:
        for case in _TEST_CASES:
            evaluation = _evaluate_case(db, case)
            sample_results.append(evaluation)
            total_expected += evaluation.expected_items
            total_hits += evaluation.item_hits
            if evaluation.exact:
                exact_samples += 1

    report = {
        "total_samples": len(_TEST_CASES),
        "exact_match_samples": exact_samples,
        "sample_exact_accuracy": round(exact_samples / len(_TEST_CASES) * 100, 2),
        "total_expected_items": total_expected,
        "matched_items": total_hits,
        "item_accuracy": round(total_hits / total_expected * 100, 2),
        "tolerance": _TOLERANCE,
        "samples": [asdict(result) for result in sample_results],
    }

    sys.stdout.write(json.dumps(report, indent=2, ensure_ascii=False))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
