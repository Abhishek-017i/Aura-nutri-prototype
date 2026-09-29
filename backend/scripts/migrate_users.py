"""One-off SQLite migration to bring the users table in sync with app/models/user.py.

The prototype DB predates the username column and the nullable phase column.
This script recreates the users table with the current schema, preserves existing
rows (username falls back to id for uniqueness), and reseeds foods so the app
remains demo-ready.
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "app" / "data" / "aura.db"

_NEW_USERS_DDL = """
CREATE TABLE users_new (
    id VARCHAR(36) NOT NULL,
    username VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phase VARCHAR(50),
    age INTEGER,
    gender VARCHAR(50),
    dietary_preferences VARCHAR(255),
    target_iron_mg FLOAT NOT NULL,
    target_calcium_mg FLOAT NOT NULL,
    target_vit_d_iu FLOAT NOT NULL,
    target_b12_mcg FLOAT NOT NULL,
    current_streak INTEGER NOT NULL,
    longest_streak INTEGER NOT NULL,
    last_log_date DATE,
    cheat_charms_available INTEGER NOT NULL,
    cheat_charms_used_this_week INTEGER NOT NULL,
    phase_adjusted_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    cheat_day_used_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE (username)
);
"""

_COLUMNS = [
    "id",
    "username",
    "name",
    "phase",
    "age",
    "gender",
    "dietary_preferences",
    "target_iron_mg",
    "target_calcium_mg",
    "target_vit_d_iu",
    "target_b12_mcg",
    "current_streak",
    "longest_streak",
    "last_log_date",
    "cheat_charms_available",
    "cheat_charms_used_this_week",
    "phase_adjusted_at",
    "created_at",
    "updated_at",
    "cheat_day_used_at",
]


def migrate() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")

    # Create the new table with the correct schema.
    conn.execute(_NEW_USERS_DDL)

    # Copy existing users, using their id as a unique username fallback.
    rows = conn.execute(f"SELECT {', '.join(_COLUMNS)} FROM users").fetchall()
    for row in rows:
        values = list(row)
        # username is the second column; fall back to id if missing.
        if values[1] is None:
            values[1] = values[0]
        placeholders = ", ".join("?" for _ in values)
        conn.execute(
            f"INSERT INTO users_new ({', '.join(_COLUMNS)}) VALUES ({placeholders})",
            values,
        )

    conn.execute("DROP TABLE users")
    conn.execute("ALTER TABLE users_new RENAME TO users")
    conn.execute("CREATE INDEX ix_users_username ON users(username)")
    conn.commit()

    # Verify.
    cur = conn.execute("PRAGMA table_info(users)")
    print("users columns:", [r[1] for r in cur.fetchall()])
    cur = conn.execute("SELECT COUNT(*) FROM users")
    print("users count:", cur.fetchone()[0])

    conn.close()


if __name__ == "__main__":
    migrate()
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from scripts.seed_db import seed, verify_iron_values

    print(f"Seeded {seed()} foods into the database.")
    if verify_iron_values():
        print("All iron values match the CSV.")
    else:
        print("Iron value mismatch detected.", file=sys.stderr)
        sys.exit(1)
