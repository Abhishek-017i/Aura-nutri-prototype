import argparse
import re
from pathlib import Path
from typing import Any

import pandas as pd
from firebase_admin import firestore
from google.cloud.firestore import Client

from app.services.firebase_auth import _initialize


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def parse_aliases(raw: Any) -> list[str]:
    if pd.isna(raw) or raw is None:
        return []
    text = str(raw).strip()
    if not text:
        return []
    # Split by comma or pipe
    parts = re.split(r"[,|]", text)
    return [p.strip() for p in parts if p.strip()]


def parse_tier(raw: Any) -> int:
    if pd.isna(raw) or raw is None:
        return 1
    if isinstance(raw, (int, float)):
        return int(raw)
    s = str(raw).strip().lower()
    if s == "core":
        return 1
    try:
        return int(s)
    except ValueError:
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed foods into Firestore")
    parser.add_argument("--fresh", action="store_true", help="Delete the foods collection first")
    args = parser.parse_args()

    app = _initialize()
    db: Client = firestore.client(app)
    foods_col = db.collection("foods")

    if args.fresh:
        print("Fresh flag set: deleting existing foods collection...")
        deleted = 0
        while True:
            docs = list(foods_col.limit(500).stream())
            if not docs:
                break
            batch = db.batch()
            for doc in docs:
                batch.delete(doc.reference)
                deleted += 1
            batch.commit()
            print(f"Deleted {deleted} foods so far...")
        print(f"Deletion complete. Total deleted: {deleted}")

    csv_path = Path(__file__).resolve().parent.parent / "app" / "data" / "foods_import.csv"
    if not csv_path.exists():
        csv_path = Path(__file__).resolve().parent.parent / "app" / "data" / "ifct_seed.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Neither ifct_seed_v2.csv nor ifct_seed.csv found in app/data/")

    print(f"Reading foods from {csv_path}...")
    df = pd.read_csv(csv_path)

    total_rows = len(df)
    batch = db.batch()
    batch_count = 0
    batch_num = 1
    count = 0
    skipped = 0

    for idx, row in df.iterrows():
        name_en = str(row.get("name_en", "")).strip()
        slug = slugify(name_en)[:40]
        food_id = f"{slug}-{idx+1:03d}"

        doc_ref = foods_col.document(food_id)
        if not args.fresh:
            doc_snap = doc_ref.get()
            if doc_snap.exists:
                skipped += 1
                continue

        name_hi = str(row.get("name_hi", "")) if pd.notna(row.get("name_hi")) else ""
        category = str(row.get("category", "General")) if pd.notna(row.get("category")) else "General"
        aliases = parse_aliases(row.get("aliases"))
        tier = parse_tier(row.get("tier"))
        source = str(row.get("source", "IFCT 2017")) if pd.notna(row.get("source")) else "IFCT 2017"

        energy_kcal = float(row.get("energy_kcal", 0.0)) if pd.notna(row.get("energy_kcal")) else 0.0
        protein_g = float(row.get("protein_g", 0.0)) if pd.notna(row.get("protein_g")) else 0.0
        iron_mg = float(row.get("iron_mg", 0.0)) if pd.notna(row.get("iron_mg")) else 0.0
        calcium_mg = float(row.get("calcium_mg", 0.0)) if pd.notna(row.get("calcium_mg")) else 0.0
        vit_d_iu = float(row.get("vit_d_iu", 0.0)) if pd.notna(row.get("vit_d_iu")) else 0.0
        b12_mcg = float(row.get("b12_mcg", 0.0)) if pd.notna(row.get("b12_mcg")) else 0.0
        serving_g = float(row.get("serving_g", 100.0)) if pd.notna(row.get("serving_g")) else 100.0
        piece_g = float(row.get("piece_g", 100.0)) if pd.notna(row.get("piece_g")) else 100.0

        doc_data: dict[str, Any] = {
            "name_en": name_en,
            "name_hi": name_hi,
            "aliases": aliases,
            "category": category,
            "tier": tier,
            "source": source,
            "energy_kcal": energy_kcal,
            "protein_g": protein_g,
            "iron_mg": iron_mg,
            "calcium_mg": calcium_mg,
            "vit_d_iu": vit_d_iu,
            "b12_mcg": b12_mcg,
            "serving_g": serving_g,
            "piece_g": piece_g,
        }

        batch.set(doc_ref, doc_data)
        batch_count += 1
        count += 1

        if batch_count == 500:
            batch.commit()
            print(f"Wrote batch {batch_num} (offset {count}/{total_rows})")
            batch = db.batch()
            batch_count = 0
            batch_num += 1

    if batch_count > 0:
        batch.commit()
        print(f"Wrote batch {batch_num} (offset {count}/{total_rows})")

    print(f"Seeded {count} foods; skipped {skipped} existing.")


if __name__ == "__main__":
    main()
