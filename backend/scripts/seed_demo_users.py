
"""Seed demo users with realistic 14-day meal histories.

This script is for local demo/testing only. It is intentionally not wired into
any production deploy step. Re-running it is safe: existing demo users are
updated in place and their previous demo logs are replaced with a fresh 14-day
window.
"""

from __future__ import annotations

import os
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

# Ensure imports resolve when running from scripts/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import Food, MealLog, User
from app.services.phase_engine import calculate_dynamic_rdas

# ---------------------------------------------------------------------------
# Demo user definitions
# ---------------------------------------------------------------------------

_DEMO_USERS: list[dict[str, object]] = [
    {
        "username": "priya_sharma",
        "name": "Priya Sharma",
        "age": 28,
        "gender": "female",
        "phase": "menstrual",
    },
    {
        "username": "kavita_patel",
        "name": "Kavita Patel",
        "age": 24,
        "gender": "female",
        "phase": "luteal",
    },
    {
        "username": "meena_shah",
        "name": "Meena Shah",
        "age": 48,
        "gender": "female",
        "phase": "menopause",
    },
]

# ---------------------------------------------------------------------------
# Reference food catalog (name_en -> canonical DB row)
# Loaded at runtime from the seeded foods table.
# ---------------------------------------------------------------------------

_FOOD_NAMES: list[str] = [
    "Roti / chapati (wheat, plain)",
    "Rice, cooked (white)",
    "Red gram dal (toor/arhar), raw",
    "Green gram dal (moong), raw",
    "Lentil dal (masoor), raw",
    "Bengal gram dal (chana dal), raw",
    "Milk, cow",
    "Curd (dahi), whole milk",
    "Paneer",
    "Palak paneer",
    "Egg, whole, boiled",
    "Spinach (palak)",
    "Fish, rohu",
    "Fish, sardine",
    "Chicken curry",
    "Rajma, boiled (no gravy)",
    "Chana / chole, boiled (no gravy)",
    "Banana (kela)",
    "Orange (santra)",
    "Indian gooseberry (amla)",
    "Rice flakes (poha), raw",
    "Ragi (finger millet)",
    "Bajra roti (rotla)",
    "Sesame seeds, white (til)",
    "Jaggery (gur)",
    "Almond (badam)",
]

# ---------------------------------------------------------------------------
# 14-day meal plans per user.
# Each tuple is (food_name, qty_g). Quantities are deliberately varied so some
# days show good nutrient coverage and others show gaps.
# ---------------------------------------------------------------------------

_MEAL_PLANS: dict[str, list[list[tuple[str, float]]]] = {
    "priya_sharma": [
        # Strong iron/calcium day.
        [("Roti / chapati (wheat, plain)", 80), ("Red gram dal (toor/arhar), raw", 80), ("Spinach (palak)", 100), ("Sesame seeds, white (til)", 15), ("Curd (dahi), whole milk", 100)],
        # Good non-veg day for B12 and D.
        [("Rice, cooked (white)", 150), ("Fish, sardine", 100), ("Milk, cow", 250)],
        # Light day.
        [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
        # Vegetarian iron focus.
        [("Bajra roti (rotla)", 120), ("Lentil dal (masoor), raw", 80), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
        # Mixed day.
        [("Roti / chapati (wheat, plain)", 80), ("Chicken curry", 150), ("Curd (dahi), whole milk", 150), ("Orange (santra)", 150)],
        # Calcium focus.
        [("Rice, cooked (white)", 150), ("Paneer", 100), ("Milk, cow", 250), ("Sesame seeds, white (til)", 10)],
        # Gap day.
        [],
        # Iron + protein.
        [("Roti / chapati (wheat, plain)", 100), ("Rajma, boiled (no gravy)", 150), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
        # Egg day.
        [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
        # Light day.
        [("Rice flakes (poha), raw", 60), ("Curd (dahi), whole milk", 100)],
        # Strong mixed day.
        [("Rice, cooked (white)", 150), ("Fish, rohu", 150), ("Palak paneer", 150)],
        # Vegetarian.
        [("Roti / chapati (wheat, plain)", 80), ("Chana / chole, boiled (no gravy)", 150), ("Milk, cow", 250), ("Almond (badam)", 20)],
        # Ragi iron/calcium.
        [("Ragi (finger millet)", 80), ("Curd (dahi), whole milk", 150), ("Spinach (palak)", 100)],
        # Snack-like light day.
        [("Banana (kela)", 100), ("Milk, cow", 200)],
    ],
    "kavita_patel": [
        # Balanced start.
        [("Roti / chapati (wheat, plain)", 80), ("Green gram dal (moong), raw", 80), ("Paneer", 80), ("Milk, cow", 250)],
        # Good B12/D day.
        [("Rice, cooked (white)", 150), ("Fish, sardine", 100), ("Curd (dahi), whole milk", 150)],
        # Light.
        [("Rice flakes (poha), raw", 60), ("Orange (santra)", 100)],
        # Egg + greens.
        [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Spinach (palak)", 100)],
        # Generous non-veg.
        [("Rice, cooked (white)", 200), ("Chicken curry", 150), ("Milk, cow", 250)],
        # Gap day.
        [],
        # Vegetarian calcium day.
        [("Roti / chapati (wheat, plain)", 80), ("Palak paneer", 150), ("Sesame seeds, white (til)", 15), ("Curd (dahi), whole milk", 150)],
        # Lentils + greens.
        [("Bajra roti (rotla)", 100), ("Lentil dal (masoor), raw", 80), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
        # Light.
        [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
        # Rajma rice.
        [("Rice, cooked (white)", 150), ("Rajma, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
        # Egg + dairy.
        [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
        # Chana.
        [("Roti / chapati (wheat, plain)", 100), ("Chana / chole, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
        # Calcium.
        [("Ragi (finger millet)", 80), ("Paneer", 80), ("Milk, cow", 250)],
        # Light.
        [("Rice flakes (poha), raw", 60), ("Milk, cow", 200)],
    ],
    "meena_shah": [
        # Calcium-heavy day.
        [("Roti / chapati (wheat, plain)", 80), ("Milk, cow", 250), ("Paneer", 100), ("Sesame seeds, white (til)", 15)],
        # Greens + dairy.
        [("Rice, cooked (white)", 150), ("Palak paneer", 150), ("Curd (dahi), whole milk", 150)],
        # Light.
        [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
        # Egg day for D/B12.
        [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
        # Calcium focus.
        [("Ragi (finger millet)", 80), ("Curd (dahi), whole milk", 150), ("Almond (badam)", 20)],
        # Fish day.
        [("Rice, cooked (white)", 150), ("Fish, rohu", 150), ("Milk, cow", 250)],
        # Gap day.
        [],
        # Dairy + greens.
        [("Roti / chapati (wheat, plain)", 80), ("Paneer", 100), ("Spinach (palak)", 100), ("Milk, cow", 250)],
        # Light.
        [("Rice flakes (poha), raw", 60), ("Curd (dahi), whole milk", 100)],
        # Mixed.
        [("Roti / chapati (wheat, plain)", 80), ("Chicken curry", 100), ("Milk, cow", 250)],
        # Legumes + dairy.
        [("Rice, cooked (white)", 150), ("Rajma, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
        # Fruit + dairy.
        [("Orange (santra)", 150), ("Milk, cow", 250)],
        # Chana.
        [("Roti / chapati (wheat, plain)", 100), ("Chana / chole, boiled (no gravy)", 150), ("Sesame seeds, white (til)", 10)],
        # Lentil + paneer.
        [("Rice, cooked (white)", 150), ("Lentil dal (masoor), raw", 80), ("Paneer", 80)],
    ],
}


def _load_foods(db: Session) -> dict[str, Food]:
    """Return a mapping from English food name to Food row."""
    rows = db.query(Food).filter(Food.name_en.in_(_FOOD_NAMES)).all()
    by_name = {row.name_en: row for row in rows}
    missing = set(_FOOD_NAMES) - set(by_name)
    if missing:
        raise RuntimeError(f"Demo foods missing from DB: {sorted(missing)}")
    return by_name


def _ensure_user(db: Session, demo: dict[str, object]) -> User:
    """Create or update a demo user and apply phase-based targets."""
    username = str(demo["username"])
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        user = User(
            id=str(uuid4()),
            username=username,
            name=str(demo["name"]),
            age=int(demo["age"]),  # type: ignore[arg-type]
            gender=str(demo["gender"]),
            phase=str(demo["phase"]),
        )
        db.add(user)
    else:
        user.name = str(demo["name"])
        user.age = int(demo["age"])  # type: ignore[arg-type]
        user.gender = str(demo["gender"])
        user.phase = str(demo["phase"])

    targets = calculate_dynamic_rdas(
        base_age=user.age or 30,
        base_gender=user.gender or "female",
        phase=user.phase or "follicular",
    )
    user.target_iron_mg = targets.target_iron_mg
    user.target_calcium_mg = targets.target_calcium_mg
    user.target_vit_d_iu = targets.target_vit_d_mcg * 40.0
    user.target_b12_mcg = targets.target_b12_mcg

    db.commit()
    db.refresh(user)
    return user


def _clear_demo_logs(db: Session, user: User) -> None:
    """Delete previous demo meal logs for this user so re-runs never duplicate."""
    db.query(MealLog).filter(MealLog.user_id == user.id).delete(synchronize_session=False)
    db.commit()


def _create_logs_for_user(
    db: Session,
    user: User,
    foods: dict[str, Food],
    meal_plan: list[list[tuple[str, float]]],
) -> int:
    """Create 10 days of backdated logs and return the count created."""
    logs_created = 0
    start_date = date(2026, 9, 24)

    # Base times for up to 5 meals: Breakfast, Lunch, Snack, Dinner, Late Snack
    base_times = [
        time(8, 30, 0),
        time(13, 0, 0),
        time(17, 0, 0),
        time(20, 0, 0),
        time(22, 0, 0)
    ]

    for day_offset, meals in enumerate(meal_plan[:10]):
        day = start_date + timedelta(days=day_offset)
        for meal_index, (food_name, qty_g) in enumerate(meals):
            food = foods[food_name]
            ratio = qty_g / 100.0
            
            # Map index to a base time, fallback to 12:00 if index > 4
            m_time = base_times[meal_index] if meal_index < len(base_times) else time(12, 0, 0)
            base_dt = datetime.combine(day, m_time, tzinfo=timezone.utc)
            
            # Add random jitter between -15 to 30 minutes
            jitter = timedelta(minutes=random.randint(-15, 30))
            logged_at = base_dt + jitter
            
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
                notes="Seeded by scripts/seed_demo_users.py",
            )
            db.add(log)
            logs_created += 1

    db.commit()
    return logs_created


def seed() -> None:
    """Main entry point: create demo users and backdated meal logs."""
    # Ensure tables exist in case this runs against a fresh clone.
    from app.database import Base

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        foods = _load_foods(db)
        for demo in _DEMO_USERS:
            user = _ensure_user(db, demo)
            _clear_demo_logs(db, user)
            meal_plan = _MEAL_PLANS[str(demo["username"])]
            count = _create_logs_for_user(db, user, foods, meal_plan)
            print(f"Seeded {count} logs for {user.username} ({user.name}, phase={user.phase}, age={user.age})")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
