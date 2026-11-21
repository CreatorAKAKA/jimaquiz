
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import sqlite3
from fastapi import Response
from database import DB_PATH, save_set_image, load_set_image
from database import save_flashcard, add_word_to_set
from database import init_db, load_flashcards, rate_word, load_word_review, load_groups, load_set_words, load_set_progress
from database import create_group, create_set
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone
from pydantic import BaseModel


import io
import numpy as np
import easyocr
from PIL import Image, ImageEnhance
from functools import lru_cache

from token_test import extract_vocabulary
from dictionary_test import get_definitions, get_word_info



app = FastAPI(title="JimaQuiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

init_db()


@lru_cache(maxsize=1)
def get_ocr_reader():
    return easyocr.Reader(["ja"], gpu=False)


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

@app.get("/api/collections/sets/{set_id}/progress")
def get_set_progress(set_id: int):
    groups = load_groups()

    set_exists = any(
        collection_set["id"] == set_id
        for group in groups
        for collection_set in group["sets"]
    )

    if not set_exists:
        raise HTTPException(status_code=404, detail="Set not found")

    return load_set_progress(set_id)

@app.post("/api/collections/sets/{set_id}/images/{image_type}")
async def upload_set_image(
    set_id: int,
    image_type: str,
    file: UploadFile = File(...)
):
    if image_type not in ("cover", "banner"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format")

    image_data = await file.read(5 * 1024 * 1024 + 1)

    if len(image_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be under 5 MB")

    if not image_data:
        raise HTTPException(status_code=400, detail="Empty image")

    saved = save_set_image(set_id, image_type, image_data)

    if not saved:
        raise HTTPException(status_code=404, detail="Set not found")

    return {"success": True}

@app.get("/api/collections/sets/{set_id}/images/{image_type}")
def get_set_image(set_id: int, image_type: str):
    if image_type not in ("cover", "banner"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    image_data = load_set_image(set_id, image_type)

    if image_data is None:
        raise HTTPException(status_code=404, detail="Image not found")

    if image_data.startswith(b"\x89PNG\r\n\x1a\n"):
        media_type = "image/png"
    elif image_data.startswith(b"\xff\xd8\xff"):
        media_type = "image/jpeg"
    elif image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP":
        media_type = "image/webp"
    else:
        raise HTTPException(status_code=415, detail="Unsupported stored image")

    return Response(content=image_data, media_type=media_type)

@app.get("/api/collections/sets/{set_id}/vocabulary")
def get_set_vocabulary(set_id: int):
    groups = load_groups()

    set_exists = any(
        collection_set["id"] == set_id
        for group in groups
        for collection_set in group["sets"]
    )

    if not set_exists:
        raise HTTPException(status_code=404, detail="Set not found")

    words = load_set_words(set_id)

    for word in words:
        review = load_word_review(word["word"])
        word["due_at"] = review["due_at"] if review else None
        word["review_state"] = review["state"] if review else "new"

    return words



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


@app.post("/api/create/ocr")
async def recognize_screenshot(
    file: UploadFile = File(...),
    subtitle_percentage: int = 30
):
    if not 10 <= subtitle_percentage <= 60:
        raise HTTPException(
            status_code=400,
            detail="Subtitle percentage must be between 10 and 60"
        )

    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format"
        )

    image_bytes = await file.read(10 * 1024 * 1024 + 1)

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image must be under 10 MB"
        )

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid image"
        )

    width, height = image.size

    subtitle_region = image.crop((
        0,
        int(height * (1 - subtitle_percentage / 100)),
        width,
        height
    ))

    grayscale = subtitle_region.convert("L")
    processed = ImageEnhance.Contrast(grayscale).enhance(2.0)

    results = get_ocr_reader().readtext(
        np.array(processed),
        detail=0
    )

    return {
        "text": "".join(results),
        "subtitle_percentage": subtitle_percentage
    }


class VocabularyRequest(BaseModel):
    text: str


@app.post("/api/create/vocabulary")
def extract_screenshot_vocabulary(request: VocabularyRequest):
    if not request.text.strip():
        return {"vocabulary": []}

    entries = extract_vocabulary(request.text)
    vocabulary = []
    seen_words = set()

    for entry in entries:
        word = entry["dictionary"]

        if word in seen_words:
            continue

        seen_words.add(word)

        info = get_word_info(word, entry["reading"])

        vocabulary.append({
            "word": word,
            "reading": entry["reading"],
            "surface": entry["surface"],
            "meanings": info["meanings"],
            "parts_of_speech": info["parts_of_speech"]
        })

    return {"vocabulary": vocabulary}



class SaveVocabularyRequest(BaseModel):
    set_id: int
    word: str
    reading: str
    meanings: list[list[str]]
    sentence: str
    surface: str


@app.post("/api/create/save")
async def save_created_vocabulary(
    file: UploadFile = File(...),
    data: str = Form(...)
):
    import json

    try:
        request = SaveVocabularyRequest.model_validate_json(data)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid vocabulary data"
        )

    groups = load_groups()

    set_exists = any(
        collection_set["id"] == request.set_id
        for group in groups
        for collection_set in group["sets"]
    )

    if not set_exists:
        raise HTTPException(
            status_code=404,
            detail="Set not found"
        )

    
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format"
        )

    image_bytes = await file.read(10 * 1024 * 1024 + 1)

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Screenshot must be under 10 MB"
        )


    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Empty screenshot"
        )

    save_flashcard(
        request.word,
        request.reading,
        request.meanings,
        image_bytes,
        request.sentence,
        request.surface
    )

    add_word_to_set(request.word, request.set_id)

    return {
        "success": True,
        "word": request.word,
        "set_id": request.set_id
    }


class CreateGroupRequest(BaseModel):
    name: str


class CreateSetRequest(BaseModel):
    group_id: int
    title: str


@app.post("/api/collections/groups")
def create_collection_group(request: CreateGroupRequest):
    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Collection name cannot be empty"
        )

    group_id = create_group(name)

    return {
        "success": True,
        "id": group_id,
        "name": name
    }


@app.post("/api/collections/sets")
def create_collection_set(request: CreateSetRequest):
    title = request.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Set name cannot be empty"
        )

    groups = load_groups()

    if not any(group["id"] == request.group_id for group in groups):
        raise HTTPException(
            status_code=404,
            detail="Collection not found"
        )

    set_id = create_set(request.group_id, title)

    return {
        "success": True,
        "id": set_id,
        "group_id": request.group_id,
        "title": title
    }
