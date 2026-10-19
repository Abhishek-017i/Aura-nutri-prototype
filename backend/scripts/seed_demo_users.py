from __future__ import annotations

import os
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

# Ensure imports resolve when running from scripts/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_admin import auth, firestore
from google.cloud.firestore import Client

from app.services.firebase_auth import _initialize
from app.services.phase_engine import calculate_dynamic_rdas

_DEMO_USERS: list[dict[str, object]] = [
    {"username": "krisha", "name": "Krisha", "age": 19, "gender": "female", "phase": "follicular"},
    {"username": "sneha", "name": "Sneha", "age": 25, "gender": "female", "phase": "menstrual"},
    {"username": "anshika", "name": "Anshika", "age": 20, "gender": "female", "phase": "luteal"},
    {"username": "garima", "name": "Garima", "age": 19, "gender": "female", "phase": "follicular"},
    {"username": "juhi", "name": "Juhi", "age": 56, "gender": "female", "phase": "menopause"},
    {"username": "priya", "name": "Priya", "age": 35, "gender": "female", "phase": "luteal"},
    {"username": "sakshi", "name": "Sakshi", "age": 23, "gender": "female", "phase": "menstrual"},
]

_PLAN_A = [
    [("Roti / chapati (wheat, plain)", 80), ("Red gram dal (toor/arhar), raw", 80), ("Spinach (palak)", 100), ("Sesame seeds, white (til)", 15), ("Curd (dahi), whole milk", 100)],
    [("Rice, cooked (white)", 150), ("Fish, sardine", 100), ("Milk, cow", 250)],
    [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
    [("Bajra roti (rotla)", 120), ("Lentil dal (masoor), raw", 80), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
    [("Roti / chapati (wheat, plain)", 80), ("Chicken curry", 150), ("Curd (dahi), whole milk", 150), ("Orange (santra)", 150)],
    [("Rice, cooked (white)", 150), ("Paneer", 100), ("Milk, cow", 250), ("Sesame seeds, white (til)", 10)],
    [],
    [("Roti / chapati (wheat, plain)", 100), ("Rajma, boiled (no gravy)", 150), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
    [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
    [("Rice flakes (poha), raw", 60), ("Curd (dahi), whole milk", 100)],
    [("Rice, cooked (white)", 150), ("Fish, rohu", 150), ("Palak paneer", 150)],
    [("Roti / chapati (wheat, plain)", 80), ("Chana / chole, boiled (no gravy)", 150), ("Milk, cow", 250), ("Almond (badam)", 20)],
    [("Ragi (finger millet)", 80), ("Curd (dahi), whole milk", 150), ("Spinach (palak)", 100)],
    [("Banana (kela)", 100), ("Milk, cow", 200)],
]

_PLAN_B = [
    [("Roti / chapati (wheat, plain)", 80), ("Green gram dal (moong), raw", 80), ("Paneer", 80), ("Milk, cow", 250)],
    [("Rice, cooked (white)", 150), ("Fish, sardine", 100), ("Curd (dahi), whole milk", 150)],
    [("Rice flakes (poha), raw", 60), ("Orange (santra)", 100)],
    [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Spinach (palak)", 100)],
    [("Rice, cooked (white)", 200), ("Chicken curry", 150), ("Milk, cow", 250)],
    [],
    [("Roti / chapati (wheat, plain)", 80), ("Palak paneer", 150), ("Sesame seeds, white (til)", 15), ("Curd (dahi), whole milk", 150)],
    [("Bajra roti (rotla)", 100), ("Lentil dal (masoor), raw", 80), ("Spinach (palak)", 100), ("Jaggery (gur)", 20)],
    [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
    [("Rice, cooked (white)", 150), ("Rajma, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
    [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
    [("Roti / chapati (wheat, plain)", 100), ("Chana / chole, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
    [("Ragi (finger millet)", 80), ("Paneer", 80), ("Milk, cow", 250)],
    [("Rice flakes (poha), raw", 60), ("Milk, cow", 200)],
]

_PLAN_C = [
    [("Roti / chapati (wheat, plain)", 80), ("Milk, cow", 250), ("Paneer", 100), ("Sesame seeds, white (til)", 15)],
    [("Rice, cooked (white)", 150), ("Palak paneer", 150), ("Curd (dahi), whole milk", 150)],
    [("Rice flakes (poha), raw", 60), ("Banana (kela)", 100)],
    [("Roti / chapati (wheat, plain)", 80), ("Egg, whole, boiled", 100), ("Milk, cow", 250)],
    [("Ragi (finger millet)", 80), ("Curd (dahi), whole milk", 150), ("Almond (badam)", 20)],
    [("Rice, cooked (white)", 150), ("Fish, rohu", 150), ("Milk, cow", 250)],
    [],
    [("Roti / chapati (wheat, plain)", 80), ("Paneer", 100), ("Spinach (palak)", 100), ("Milk, cow", 250)],
    [("Rice flakes (poha), raw", 60), ("Curd (dahi), whole milk", 100)],
    [("Roti / chapati (wheat, plain)", 80), ("Chicken curry", 100), ("Milk, cow", 250)],
    [("Rice, cooked (white)", 150), ("Rajma, boiled (no gravy)", 150), ("Curd (dahi), whole milk", 150)],
    [("Orange (santra)", 150), ("Milk, cow", 250)],
    [("Roti / chapati (wheat, plain)", 100), ("Chana / chole, boiled (no gravy)", 150), ("Sesame seeds, white (til)", 10)],
    [("Rice, cooked (white)", 150), ("Lentil dal (masoor), raw", 80), ("Paneer", 80)],
]

_MEAL_PLANS: dict[str, list[list[tuple[str, float]]]] = {
    "krisha": _PLAN_A,
    "sneha": _PLAN_B,
    "anshika": _PLAN_C,
    "garima": _PLAN_A,
    "juhi": _PLAN_B,
    "priya": _PLAN_C,
    "sakshi": _PLAN_A,
}


def _load_foods_map(db: Client) -> dict[str, dict[str, object]]:
    foods_docs = list(db.collection("foods").stream())
    by_name: dict[str, dict[str, object]] = {}
    for d in foods_docs:
        data = d.to_dict() or {}
        data["id"] = d.id
        name_en = str(data.get("name_en", "")).strip().lower()
        by_name[name_en] = data
    return by_name


def _find_food(foods: dict[str, dict[str, object]], query: str) -> dict[str, object] | None:
    q = query.strip().lower()
    if q in foods:
        return foods[q]
    for name, data in foods.items():
        if q in name or name in q:
            return data
    return None


def _ensure_auth_user(email: str) -> str:
    try:
        user = auth.get_user_by_email(email)
        return str(user.uid)
    except Exception:
        user = auth.create_user(email=email, password="test123password")
        return str(user.uid)


def _clear_subcollection(db: Client, user_ref: Any) -> None:
    logs_col = user_ref.collection("meal_logs")
    while True:
        docs = list(logs_col.limit(500).stream())
        if not docs:
            break
        batch = db.batch()
        for d in docs:
            batch.delete(d.reference)
        batch.commit()


def seed() -> None:
    app = _initialize()
    db: Client = firestore.client(app)
    foods_map = _load_foods_map(db)

    total_logs_all = 0
    start_date = date.today() - timedelta(days=9)

    base_times = [
        time(8, 30, 0),
        time(13, 0, 0),
        time(17, 0, 0),
        time(20, 0, 0),
        time(22, 0, 0),
    ]

    for demo in _DEMO_USERS:
        username = str(demo["username"])
        name = str(demo["name"])
        age = int(demo["age"])  # type: ignore[arg-type]
        gender = str(demo["gender"])
        phase = str(demo["phase"])
        email = f"{username}@auranutri.demo"

        uid = _ensure_auth_user(email)
        user_ref = db.collection("users").document(uid)

        rdas = calculate_dynamic_rdas(base_age=age, base_gender=gender, phase=phase)
        now_iso = datetime.now(timezone.utc).isoformat()

        user_doc = {
            "id": uid,
            "username": username,
            "name": name,
            "email": email,
            "age": age,
            "gender": gender,
            "phase": phase,
            "target_iron_mg": rdas.target_iron_mg,
            "target_calcium_mg": rdas.target_calcium_mg,
            "target_vit_d_iu": round(rdas.target_vit_d_mcg * 40.0, 2),
            "target_b12_mcg": rdas.target_b12_mcg,
            "current_streak": 5,
            "longest_streak": 10,
            "last_log_date": (date.today()).isoformat(),
            "cheat_charms_available": 1,
            "cheat_charms_used_this_week": 0,
            "cheat_day_used_at": None,
            "phase_adjusted_at": now_iso,
            "walkthrough_completed": False,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        user_ref.set(user_doc)
        _clear_subcollection(db, user_ref)

        plan = _MEAL_PLANS.get(username, _PLAN_A)
        user_logs = 0
        batch = db.batch()
        batch_count = 0

        for day_offset, meals in enumerate(plan[:10]):
            day = start_date + timedelta(days=day_offset)
            for meal_idx, (food_name, qty_g) in enumerate(meals):
                food_data = _find_food(foods_map, food_name)
                ratio = qty_g / 100.0

                energy = round(float(food_data.get("energy_kcal", 0.0)) * ratio, 2) if food_data else 0.0
                protein = round(float(food_data.get("protein_g", 0.0)) * ratio, 2) if food_data else 0.0
                iron = round(float(food_data.get("iron_mg", 0.0)) * ratio, 2) if food_data else 0.0
                calcium = round(float(food_data.get("calcium_mg", 0.0)) * ratio, 2) if food_data else 0.0
                vit_d = round(float(food_data.get("vit_d_iu", 0.0)) * ratio, 2) if food_data else 0.0
                b12 = round(float(food_data.get("b12_mcg", 0.0)) * ratio, 2) if food_data else 0.0

                m_time = base_times[meal_idx] if meal_idx < len(base_times) else time(12, 0, 0)
                base_dt = datetime.combine(day, m_time, tzinfo=timezone.utc)
                jitter = timedelta(minutes=random.randint(-15, 30))
                logged_at = (base_dt + jitter).isoformat()

                log_id = str(uuid4())
                log_ref = user_ref.collection("meal_logs").document(log_id)
                log_data = {
                    "id": log_id,
                    "user_id": uid,
                    "food_id": str(food_data.get("id")) if food_data else None,
                    "food_name": str(food_data.get("name_en")) if food_data else food_name,
                    "logged_at": logged_at,
                    "meal_type": "demo",
                    "qty_g": qty_g,
                    "energy_kcal": energy,
                    "protein_g": protein,
                    "iron_mg": iron,
                    "calcium_mg": calcium,
                    "vit_d_iu": vit_d,
                    "b12_mcg": b12,
                    "notes": "Seeded by scripts/seed_demo_users.py",
                    "created_at": logged_at,
                }
                batch.set(log_ref, log_data)
                batch_count += 1
                user_logs += 1

                if batch_count == 400:
                    batch.commit()
                    batch = db.batch()
                    batch_count = 0

        if batch_count > 0:
            batch.commit()

        total_logs_all += user_logs
        print(f"Seeded {user_logs} logs for {username} ({name}, uid={uid}, phase={phase}, age={age})")

    print(f"Seeded {len(_DEMO_USERS)} demo users with {total_logs_all} meal logs total.")


if __name__ == "__main__":
    seed()
