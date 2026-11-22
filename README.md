# ジマクイズ (JimaQuiz) 🌸

*Learn Japanese through the stories you love.*

JimaQuiz is a Japanese vocabulary learning application that transforms anime screenshots into interactive flashcards with readings, English definitions, and contextual examples.

Currently focused on anime subtitles, with plans to support manga, song lyrics, light novels, and more.

*「単語だけじゃなく、出会った瞬間も覚える。」*

*"Remember not just the word, but the moment you encountered it."*

## Features

- **Japanese Subtitle Recognition:** Upload anime screenshots and automatically extract Japanese subtitles using OCR.
- **Vocabulary Extraction:** Analyze recognized text using Japanese morphological analysis to identify individual vocabulary words and their dictionary forms.
- **Dictionary Integration:** Retrieve word readings, English definitions, and grammatical information.
- **Interactive Flashcards:** Review saved vocabulary alongside the original screenshots and example sentences using spaced repetition.
- **Vocabulary Collections:** Organize saved vocabulary into customizable groups and study sets.
- **Multiple Contexts:** Associate the same vocabulary word with multiple screenshots and sentences.
- **Editable Subtitles:** Correct OCR results before saving vocabulary and contextual examples.
- **Persistent Storage:** Save vocabulary, screenshots, collections, and review information locally using SQLite.
- **Batch Processing:** Upload multiple screenshots and extract vocabulary across them.
- **Strokle:** Play an experimental Wordle-inspired kanji guessing game that compares character components and their positions.

## Screenshots

### Vocabulary Extraction

<img width="1569" height="1257" alt="image" src="https://github.com/user-attachments/assets/4ce18867-79af-4d53-a2ba-93bd77fb5bac" />


### Vocabulary Collections

<img width="1281" height="854" alt="image" src="https://github.com/user-attachments/assets/95e4a757-03b1-45fe-b834-420c80b1d33c" />
<img width="1330" height="1253" alt="image" src="https://github.com/user-attachments/assets/1964f6b4-0853-4d85-a307-2ddb6369210d" />



### Flashcard Review

<img width="1119" height="974" alt="image" src="https://github.com/user-attachments/assets/c1a73ab1-8f8a-40e7-a7c4-dd551d968f2d" />
<img width="1065" height="917" alt="image" src="https://github.com/user-attachments/assets/254fc1e0-4532-4665-8136-cc6cf0a06470" />



### Strokle

<img width="974" height="1244" alt="image" src="https://github.com/user-attachments/assets/77cc9704-ff6d-44b3-b83d-ff8602e49230" />
<img width="938" height="1253" alt="image" src="https://github.com/user-attachments/assets/f80ad05c-7134-4662-8772-87597dd0a172" />



## Strokle 🀄

Strokle is a kanji guessing minigame inspired by Wordle.

Instead of comparing individual letters, Strokle breaks down kanji into their structural components and provides color-coded feedback based on component matches and positioning.

Players have nine attempts to identify the mystery kanji.

The game uses SVG stroke data from KanjiVG and character decomposition data from CJKVI-IDS to analyze and compare kanji structures.

Strokle is currently a prototype, with ongoing improvements to its matching algorithm, component bank, and gameplay.

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend application logic |
| FastAPI | REST API |
| React / TypeScript | Interactive frontend |
| Vite | Frontend development and build tooling |
| EasyOCR | Japanese subtitle recognition |
| SudachiPy | Japanese morphological analysis |
| Jamdict | Japanese dictionary lookups |
| SQLite | Persistent vocabulary and screenshot storage |
| FSRS | Spaced repetition scheduling |
| Pillow / NumPy | Image processing |
| KanjiVG / CJKVI-IDS | Kanji stroke rendering and structural analysis |

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/CreatorAKAKA/jimaquiz.git
cd jimaquiz
```

### 2. Set up the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Start the backend

```bash
uvicorn api:app --reload
```

The backend should be available at `http://127.0.0.1:8000`.

### 4. Start the frontend

Open another
