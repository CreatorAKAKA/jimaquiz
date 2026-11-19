
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, load_flashcards, rate_word, load_word_review, load_groups
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
            "example": (
                info["contexts"][0]["sentence"]
                if info.get("contexts")
                else ""
            ),
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