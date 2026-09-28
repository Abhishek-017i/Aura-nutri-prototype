import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import Food, MealLog, User

# Import all models so Base.metadata.create_all creates every table.
_ = (MealLog, User)


def _to_float(value: str) -> float:
    return float(value.strip()) if value.strip() else 0.0


def _to_optional_float(value: str) -> float | None:
    return float(value.strip()) if value.strip() else None


def load_seed_data() -> list[dict[str, object]]:
    data_dir = Path(__file__).resolve().parent.parent / "app" / "data"
    seed_path = data_dir / "ifct_seed_v2.csv"
    provenance_path = data_dir / "ifct_seed_v2_provenance.csv"

    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")
    if not provenance_path.exists():
        raise FileNotFoundError(f"Provenance file not found: {provenance_path}")

    with seed_path.open(newline="", encoding="utf-8") as f:
        seed_rows: dict[str, dict[str, str]] = {
            row["name_en"]: row for row in csv.DictReader(f)
        }

    with provenance_path.open(newline="", encoding="utf-8") as f:
        provenance_rows: dict[str, dict[str, str]] = {
            row["name_en"]: row for row in csv.DictReader(f)
        }

    merged: list[dict[str, object]] = []
    for name_en, row in seed_rows.items():
        prov = provenance_rows.get(name_en, {})
        merged.append(
            {
                "name_en": name_en,
                "name_hi": row.get("name_hi") or None,
                "category": row.get("category") or None,
                "energy_kcal": _to_float(row.get("energy_kcal", "")),
                "protein_g": _to_float(row.get("protein_g", "")),
                "iron_mg": _to_float(row.get("iron_mg", "")),
                "calcium_mg": _to_float(row.get("calcium_mg", "")),
                "vit_d_iu": _to_float(row.get("vit_d_iu", "")),
                "b12_mcg": _to_float(row.get("b12_mcg", "")),
                "serving_g": _to_float(row.get("serving_g", "")),
                "aliases": row.get("aliases") or None,
                "piece_g": _to_optional_float(row.get("piece_g", "")),
                "tier": prov.get("tier") or row.get("tier") or None,
                "source": prov.get("source") or row.get("source") or None,
            }
        )

    return merged


def seed() -> int:
    Base.metadata.create_all(bind=engine)

    data = load_seed_data()

    with Session(engine) as session:
        session.query(Food).delete()
        for row in data:
            session.add(Food(**row))
        session.commit()

    return len(data)


def verify_iron_values() -> bool:
    data_dir = Path(__file__).resolve().parent.parent / "app" / "data"
    seed_path = data_dir / "ifct_seed_v2.csv"

    with seed_path.open(newline="", encoding="utf-8") as f:
        csv_rows = {row["name_en"]: row for row in csv.DictReader(f)}

    test_foods = [
        "Spinach (palak)",
        "Rajma (kidney beans), raw",
        "Dal, cooked (toor/arhar, plain)",
        "Roti / chapati (wheat, plain)",
        "Rice, cooked (white)",
        "Milk, cow",
        "Paneer",
        "Sesame seeds, white (til)",
        "Egg, whole, boiled",
        "Jaggery (gur)",
    ]

    ok = True
    print("Per-100g iron verification:")
    for name in test_foods:
        csv_value = csv_rows.get(name, {}).get("iron_mg")
        if csv_value is None:
            print(f"  {name}: NOT FOUND in CSV")
            ok = False
            continue

        with Session(engine) as session:
            food = session.query(Food).filter(Food.name_en == name).first()

        if food is None:
            print(f"  {name}: NOT FOUND in DB")
            ok = False
            continue

        db_value = f"{food.iron_mg:.2f}"
        csv_value_fmt = f"{float(csv_value):.2f}"
        match = db_value == csv_value_fmt
        status = "OK" if match else "MISMATCH"
        print(f"  {name}: CSV={csv_value_fmt} DB={db_value} [{status}]")
        if not match:
            ok = False

    return ok


def main() -> int:
    count = seed()
    print(f"Seeded {count} foods into the database.")
    if verify_iron_values():
        print("All iron values match the CSV.")
        return 0
    print("Iron value mismatch detected.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
