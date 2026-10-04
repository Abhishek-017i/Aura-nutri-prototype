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
    seed_path = data_dir / "foods_import.csv"

    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")

    with seed_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    merged: list[dict[str, object]] = []
    for row in rows:
        merged.append(
            {
                "id": row.get("id"),
                "name_en": row.get("name_en"),
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
                "tier": row.get("tier") or None,
                "source": row.get("source") or None,
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
        
        seed_users(session, data)

    return len(data)

from datetime import datetime, timezone, timedelta, date, time
from uuid import uuid4
from app.services.phase_engine import calculate_dynamic_rdas

def seed_users(session: Session, foods_data: list[dict[str, object]]) -> None:
    users_info = [
        {"username": "krisha", "name": "Krisha", "age": 19, "phase": "follicular"},
        {"username": "sneha", "name": "Sneha", "age": 26, "phase": "menstrual"},
        {"username": "garima", "name": "Garima", "age": 19, "phase": "luteal"},
        {"username": "anshika", "name": "Anshika", "age": 20, "phase": "follicular"},
        {"username": "juhi", "name": "Juhi", "age": 57, "phase": "menopause"},
        {"username": "priya", "name": "Priya", "age": 36, "phase": "luteal"},
    ]
    
    # We clear these specific users and their logs
    usernames = [u["username"] for u in users_info]
    existing_users = session.query(User).filter(User.username.in_(usernames)).all()
    user_ids = [u.id for u in existing_users]
    if user_ids:
        session.query(MealLog).filter(MealLog.user_id.in_(user_ids)).delete(synchronize_session=False)
        session.query(User).filter(User.username.in_(usernames)).delete(synchronize_session=False)
        session.commit()
        
    db_foods = {f.name_en: f for f in session.query(Food).all()}
    
    # Create the users
    for ui in users_info:
        targets = calculate_dynamic_rdas(
            base_age=ui["age"],
            base_gender="female",
            phase=ui["phase"]
        )
        user = User(
            id=str(uuid4()),
            username=ui["username"],
            name=ui["name"],
            age=ui["age"],
            gender="female",
            phase=ui["phase"],
            target_iron_mg=targets.target_iron_mg,
            target_calcium_mg=targets.target_calcium_mg,
            target_vit_d_iu=targets.target_vit_d_mcg * 40.0,
            target_b12_mcg=targets.target_b12_mcg,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Seed realistic historical meal logs from Sep 24 to Sep 29
        # 2026-09-24 to 2026-09-29
        
        days_to_seed = [
            date(2026, 9, 24),
            date(2026, 9, 25),
            date(2026, 9, 26),
            date(2026, 9, 27),
            date(2026, 9, 28),
            date(2026, 9, 29),
        ]
        
        # Realistic meals pool
        # Breakfast: 8:30-9:15, Lunch: 13:00-14:15, Snacks: 17:00, Dinner: 20:00-21:30
        food_options = list(db_foods.values())
        
        for d in days_to_seed:
            meal_times = [
                (time(8, 45, 0), "Roti / chapati (wheat, plain)", 80),
                (time(13, 30, 0), "Rice, cooked (white)", 150),
                (time(17, 15, 0), "Banana (kela)", 100),
                (time(20, 30, 0), "Spinach (palak)", 100)
            ]
            
            for t_idx, (m_time, default_food, qty_g) in enumerate(meal_times):
                food = db_foods.get(default_food)
                if not food and food_options:
                    food = food_options[t_idx % len(food_options)]
                if not food:
                    continue
                
                ratio = qty_g / 100.0
                logged_at = datetime.combine(d, m_time, tzinfo=timezone.utc)
                log = MealLog(
                    id=str(uuid4()),
                    user_id=user.id,
                    food_id=food.id,
                    food_name=food.name_en,
                    logged_at=logged_at,
                    meal_type="demo",
                    qty_g=qty_g,
                    energy_kcal=round(food.energy_kcal * ratio, 2),
                    protein_g=round(food.protein_g * ratio, 2),
                    iron_mg=round(food.iron_mg * ratio, 2),
                    calcium_mg=round(food.calcium_mg * ratio, 2),
                    vit_d_iu=round(food.vit_d_iu * ratio, 2),
                    b12_mcg=round(food.b12_mcg * ratio, 2),
                    notes="Seeded by natural timestamps logic",
                )
                session.add(log)
    
    session.commit()


def verify_iron_values() -> bool:
    data_dir = Path(__file__).resolve().parent.parent / "app" / "data"
    seed_path = data_dir / "foods_import.csv"

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
