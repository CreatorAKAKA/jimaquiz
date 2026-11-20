
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import sqlite3
from fastapi import Response
from database import DB_PATH

from database import init_db, load_flashcards, rate_word, load_word_review, load_groups, load_set_words
from fastapi import FastAPI, HTTPException
from datetime import datetime, timezone
from pydantic import BaseModel

app = FastAPI(title="JimaQuiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

init_db()



@app.get("/api/words")
def get_words():
    word_bank = load_flashcards()
    now = datetime.now(timezone.utc)
    due_words = []

    for word, info in word_bank.items():
        review = load_word_review(word)

        if review and review["due_at"]:
            due_at = datetime.fromisoformat(review["due_at"])

            if due_at > now:
                continue

        due_words.append({
            "word": word,
            "reading": info["reading"],
            "meanings": info["meanings"],
            "contexts": [
                {
                    "screenshot_id": context["screenshot_id"],
                    "sentence": context["sentence"]
                }
                for context in info["contexts"]
            ],
            "example": (
                info["contexts"][0]["sentence"]
                if info.get("contexts") else ""
            ),
            "screenshot_id": (
                info["contexts"][0]["screenshot_id"]
                if info.get("contexts") else None
            )

        })


    return due_words



class RatingRequest(BaseModel):
    word: str
    rating: str


@app.post("/api/rate")
def submit_rating(request: RatingRequest):
    if request.rating not in ("Not yet", "Only just", "Easy"):
        return {"error": "Invalid rating"}

    rate_word(request.word, request.rating)

    return {"success": True}

@app.get("/api/collections")
def get_collections():
    return load_groups()



@app.get("/api/collections/sets/{set_id}/words")
def get_collection_set_words(set_id: int):
    groups = load_groups()

    set_exists = any(
        collection_set["id"] == set_id
        for group in groups
        for collection_set in group["sets"]
    )

    if not set_exists:
        raise HTTPException(status_code=404, detail="Set not found")

    words = load_set_words(set_id)
    now = datetime.now(timezone.utc)
    due_words = []

    for word in words:
        review = load_word_review(word["word"])

        if review and review["due_at"]:
            due_at = datetime.fromisoformat(review["due_at"])

            if due_at > now:
                continue

        due_words.append(word)

    return due_words


@app.get("/api/screenshots/{screenshot_id}")
def get_screenshot(screenshot_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT image FROM screenshots WHERE id = ?",
            (screenshot_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Screenshot not found"
        )

    return Response(
        content=row[0],
        media_type="image/png"
    )
