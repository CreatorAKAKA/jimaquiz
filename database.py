import sqlite3
from pathlib import Path
import json
import hashlib
from datetime import datetime, timedelta, timezone
from fsrs import Scheduler, Card, Rating, ReviewLog


DB_PATH = Path(__file__).parent / "jimaquiz.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY,
                word TEXT NOT NULL UNIQUE,
                reading TEXT NOT NULL,
                meanings TEXT NOT NULL DEFAULT '[]'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS screenshots (
                id INTEGER PRIMARY KEY,
                image BLOB NOT NULL,
                image_hash TEXT NOT NULL UNIQUE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS contexts (
                id INTEGER PRIMARY KEY,
                word_id INTEGER NOT NULL,
                screenshot_id INTEGER NOT NULL,
                sentence TEXT NOT NULL,
                surface TEXT NOT NULL,
                FOREIGN KEY (word_id) REFERENCES words(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (screenshot_id) REFERENCES screenshots(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS collection_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS collection_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                FOREIGN KEY (group_id)
                    REFERENCES collection_groups(id)
                    ON DELETE CASCADE,
                UNIQUE(group_id, title)
            )
        """)

        columns = [
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(collection_sets)"
            ).fetchall()
        ]

        if "cover_image" not in columns:
            conn.execute(
                "ALTER TABLE collection_sets ADD COLUMN cover_image BLOB"
            )

        if "banner_image" not in columns:
            conn.execute(
                "ALTER TABLE collection_sets ADD COLUMN banner_image BLOB"
            )

        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS set_words (
                set_id INTEGER NOT NULL,
                word_id INTEGER NOT NULL,
                added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (set_id, word_id),
                FOREIGN KEY (set_id) REFERENCES collection_sets(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (word_id) REFERENCES words(id)
                    ON DELETE CASCADE
            )
        """)

        set_word_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(set_words)"
            ).fetchall()
        }

        if "added_at" not in set_word_columns:
            conn.execute(
                "ALTER TABLE set_words ADD COLUMN added_at TEXT"
            )

        conn.execute("""
            CREATE TABLE IF NOT EXISTS word_reviews (
                word_id INTEGER PRIMARY KEY,
                due_at TEXT NOT NULL,
                stability REAL NOT NULL DEFAULT 0,
                difficulty REAL NOT NULL DEFAULT 0,
                review_count INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                last_reviewed_at TEXT,
                state TEXT NOT NULL DEFAULT 'new',
                FOREIGN KEY (word_id) REFERENCES words(id)
                    ON DELETE CASCADE
            )
        """)
        review_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(word_reviews)"
            ).fetchall()
        }

        if "fsrs_card" not in review_columns:
            conn.execute(
                "ALTER TABLE word_reviews ADD COLUMN fsrs_card TEXT"
            )

        if "fsrs_history" not in review_columns:
            conn.execute(
                "ALTER TABLE word_reviews ADD COLUMN fsrs_history TEXT"
            )

        


def save_word(word, reading, meanings):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO words (word, reading, meanings)
            VALUES (?, ?, ?)
            """,
            (word, reading, json.dumps(meanings, ensure_ascii=False))
        )

        cursor = conn.execute(
            "SELECT id FROM words WHERE word = ?",
            (word,)
        )
        return cursor.fetchone()[0]
        

def save_screenshot(image_bytes):
    image_hash = hashlib.sha256(image_bytes).hexdigest()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT id FROM screenshots WHERE image_hash = ?",
            (image_hash,)
        )

        existing = cursor.fetchone()

        if existing is not None:
            return existing[0]

        cursor = conn.execute(
            "INSERT INTO screenshots (image, image_hash) VALUES (?, ?)",
            (image_bytes, image_hash)
        )

        return cursor.lastrowid

def save_context(word_id, screenshot_id, sentence, surface):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """
            INSERT INTO contexts
                (word_id, screenshot_id, sentence, surface)
            VALUES (?, ?, ?, ?)
            """,
            (word_id, screenshot_id, sentence, surface)
        )

def save_flashcard(word, reading, meanings, image_bytes, sentence, surface):
    word_id = save_word(word, reading, meanings)
    screenshot_id = save_screenshot(image_bytes)

    save_context(word_id, screenshot_id, sentence, surface)


def load_flashcards():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("""
            SELECT
                words.word,
                words.reading,
                words.meanings,
                contexts.sentence,
                contexts.surface,
                screenshots.id
            FROM contexts
            JOIN words ON contexts.word_id = words.id
            JOIN screenshots ON contexts.screenshot_id = screenshots.id
            ORDER BY contexts.id
        """)

        rows = cursor.fetchall()
        word_bank = {}

        for word, reading, meanings, sentence, surface, screenshot_id in rows:
            if word not in word_bank:
                word_bank[word] = {
                    "reading": reading,
                    "meanings": json.loads(meanings),
                    "contexts": []
                }

            word_bank[word]["contexts"].append({
                "screenshot_id": screenshot_id,
                "sentence": sentence,
                "surface": surface
            })

        return word_bank


def update_context_sentences(image_bytes, corrected_text):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            UPDATE contexts
            SET sentence = ?
            WHERE screenshot_id IN (
                SELECT id FROM screenshots
                WHERE image = ?
            )
            """,
            (corrected_text, image_bytes)
        )

def delete_word(word):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            "DELETE FROM words WHERE word = ?",
            (word,)
        )
        conn.execute("""
            DELETE FROM screenshots
            WHERE NOT EXISTS (
                SELECT 1
                FROM contexts
                WHERE contexts.screenshot_id = screenshots.id
            )
        """)

def delete_context(word, image_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")

        # delete the specific context
        cursor = conn.execute("""
            DELETE FROM contexts
            WHERE word_id = (
                SELECT id FROM words WHERE word = ?
            )
            AND screenshot_id = (
                SELECT id FROM screenshots WHERE image_hash = ?
            )
        """, (word, image_id))

        # remove words with no remaining contexts
        conn.execute("""
            DELETE FROM words
            WHERE NOT EXISTS (
                SELECT 1 FROM contexts
                WHERE contexts.word_id = words.id
            )
        """)

        # remove screenshots with no remaining contexts
        conn.execute("""
            DELETE FROM screenshots
            WHERE NOT EXISTS (
                SELECT 1 FROM contexts
                WHERE contexts.screenshot_id = screenshots.id
            )
        """)


def create_group(name):
    """Create a new collection group."""
    name = name.strip()

    if not name:
        return

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO collection_groups (name) VALUES (?)",
            (name,)
        )


def create_set(group_id, title):
    """Create a new set inside a collection group."""
    title = title.strip()

    if not title:
        return

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """
            INSERT OR IGNORE INTO collection_sets (group_id, title)
            VALUES (?, ?)
            """,
            (group_id, title)
        )


def load_groups():
    """Return groups and their sets from SQLite."""
    with sqlite3.connect(DB_PATH) as conn:
        groups = conn.execute(
            "SELECT id, name FROM collection_groups ORDER BY id"
        ).fetchall()

        result = []

        for group_id, name in groups:
            sets = conn.execute(
                """
                SELECT id, title
                FROM collection_sets
                WHERE group_id = ?
                ORDER BY id
                """,
                (group_id,)
            ).fetchall()

            result.append({
                "id": group_id,
                "name": name,
                "sets": [
                    {"id": set_id, "title": title}
                    for set_id, title in sets
                ]
            })

        return result

def delete_set(set_id):
    """Delete a collection set without deleting vocabulary."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            "DELETE FROM collection_sets WHERE id = ?",
            (set_id,)
        )

def rename_set(set_id, new_title):
    """Rename an existing set."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            UPDATE collection_sets
            SET title = ?
            WHERE id = ?
            """,
            (new_title, set_id)
        )

def move_set(set_id, new_group_id):
    """Move a set to another deck."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            UPDATE collection_sets
            SET group_id = ?
            WHERE id = ?
            """,
            (new_group_id, set_id)
        )


def add_word_to_set(word, set_id):
    """Add an existing vocabulary word to a set."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO set_words (set_id, word_id, added_at)
            SELECT ?, id, ?
            FROM words
            WHERE word = ?
            """,
            (set_id, datetime.now(timezone.utc).isoformat(), word)
        )
        return cursor.rowcount > 0





def load_set_words(set_id):
    """Load vocabulary belonging to a particular set."""
    word_bank = load_flashcards()

    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT
                words.word,
                words.reading,
                words.meanings,
                set_words.added_at
            FROM set_words
            JOIN words ON set_words.word_id = words.id
            WHERE set_words.set_id = ?
            ORDER BY words.word
            """,
            (set_id,)
        ).fetchall()

    result = []

    for word, reading, meanings, added_at in rows:
        contexts = [
            {
                "screenshot_id": context["screenshot_id"],
                "sentence": context["sentence"]
            }
            for context in word_bank.get(word, {}).get("contexts", [])
        ]

        result.append({
            "word": word,
            "reading": reading,
            "meanings": json.loads(meanings),
            "added_at": added_at,
            "contexts": contexts,
            "example": contexts[0]["sentence"] if contexts else "",
            "screenshot_id": contexts[0]["screenshot_id"] if contexts else None
        })

    return result


def load_saved_words():
    """Return all saved vocabulary words."""
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            "SELECT word FROM words ORDER BY word"
        ).fetchall()

        return [row[0] for row in rows]

def load_set_progress(set_id):
    """Count new, learning, and mastered words in a set."""
    now = datetime.now(timezone.utc)
    mastered = 0
    learning = 0
    new = 0

    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("""
            SELECT wr.due_at, wr.last_reviewed_at, wr.state
            FROM set_words AS sw
            LEFT JOIN word_reviews AS wr ON sw.word_id = wr.word_id
            WHERE sw.set_id = ?
        """, (set_id,)).fetchall()

    for due_at, last_reviewed_at, state in rows:
        if last_reviewed_at is None:
            new += 1
        elif state == "review" and due_at and (
            datetime.fromisoformat(due_at) - now
        ) >= timedelta(days=30):
            mastered += 1
        else:
            learning += 1

    return {
        "mastered": mastered,
        "learning": learning,
        "new": new,
    }

def load_word_review(word):
    """Load SRS progress for a vocabulary word."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row

        row = conn.execute(
            """
            SELECT wr.*
            FROM word_reviews AS wr
            JOIN words AS w ON wr.word_id = w.id
            WHERE w.word = ?
            """,
            (word,)
        ).fetchone()

        return dict(row) if row else None


def rate_word(word, rating):
    """Update a word's review progress using FSRS."""

    rating_map = {
        "Not yet": Rating.Again,
        "Only just": Rating.Hard,
        "Easy": Rating.Good,
    }

    if rating not in rating_map:
        raise ValueError(f"Invalid rating: {rating}")

    previous = load_word_review(word)
    now = datetime.now(timezone.utc)

    scheduler = Scheduler()

    if previous and previous.get("fsrs_card"):
        card = Card.from_json(previous["fsrs_card"])
    else:
        card = Card()

    card, review_log = scheduler.review_card(
        card,
        rating_map[rating],
        review_datetime=now,
    )

    history = (
        json.loads(previous["fsrs_history"])
        if previous and previous.get("fsrs_history")
        else []
    )

    history.append(review_log.to_json())

    review_count = (
        (previous["review_count"] if previous else 0)
        + (1 if rating == "Easy" else 0)
    )

    lapses = (
        (previous["lapses"] if previous else 0)
        + (1 if rating == "Not yet" else 0)
    )

    state = "new" if rating == "Not yet" else "review"

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA foreign_keys = ON")

        conn.execute("""
            INSERT INTO word_reviews (
                word_id, due_at, stability, difficulty,
                review_count, lapses, last_reviewed_at,
                state, fsrs_card, fsrs_history
            )
            SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM words
            WHERE word = ?
            ON CONFLICT(word_id) DO UPDATE SET
                due_at = excluded.due_at,
                stability = excluded.stability,
                difficulty = excluded.difficulty,
                review_count = excluded.review_count,
                lapses = excluded.lapses,
                last_reviewed_at = excluded.last_reviewed_at,
                state = excluded.state,
                fsrs_card = excluded.fsrs_card,
                fsrs_history = excluded.fsrs_history
        """, (
            card.due.isoformat(),
            card.stability or 0,
            card.difficulty or 0,
            review_count,
            lapses,
            now.isoformat(),
            state,
            card.to_json(),
            json.dumps(history),
            word,
        ))

    return card.due


def save_set_image(set_id, image_type, image_data):
    """Save a cover or banner image for a set."""
    if image_type not in ("cover", "banner"):
        raise ValueError("Invalid image type")

    column = f"{image_type}_image"

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            f"UPDATE collection_sets SET {column} = ? WHERE id = ?",
            (image_data, set_id)
        )
        return cursor.rowcount > 0


def load_set_image(set_id, image_type):
    """Retrieve a cover or banner image."""
    if image_type not in ("cover", "banner"):
        raise ValueError("Invalid image type")

    column = f"{image_type}_image"

    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            f"SELECT {column} FROM collection_sets WHERE id = ?",
            (set_id,)
        ).fetchone()

    return row[0] if row else None


if __name__ == "__main__":
    init_db()
    print("Database initialized!")
    save_word(
        "不思議"
    )