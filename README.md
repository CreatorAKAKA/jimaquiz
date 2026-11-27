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

<p align="center">
  <img src="https://github.com/user-attachments/assets/4ce18867-79af-4d53-a2ba-93bd77fb5bac" width="450" alt="Vocabulary Extraction" />
</p>

### Vocabulary Collections

<p align="center">
  <img src="https://github.com/user-attachments/assets/95e4a757-03b1-45fe-b834-420c80b1d33c" width="30%" alt="Vocabulary Collections" />
  <img src="https://github.com/user-attachments/assets/22ed1fe7-a0a5-4cd3-a2c1-dea73bb1f389" width="30%" alt="Collection Details" />
  <img src="https://github.com/user-attachments/assets/1964f6b4-0853-4d85-a307-2ddb6369210d" width="30%" alt="Vocabulary Context Preview" />
</p>

### Flashcard Review

<p align="center">
  <img src="https://github.com/user-attachments/assets/503a9778-35fd-4c2e-9943-2f4566d9009d" width="45%" alt="Flashcard Review" />
  <img src="https://github.com/user-attachments/assets/81f0b8b0-2ea3-43fc-8d08-188593729199" width="45%" alt="Flashcard Answer" />
</p>

### Strokle

<p align="center">
  <img src="https://github.com/user-attachments/assets/3f729b41-e709-4562-a97e-b2900a3c131b" width="30%" alt="Strokle Overview" />
  <img src="https://github.com/user-attachments/assets/77cc9704-ff6d-44b3-b83d-ff8602e49230" width="30%" alt="Strokle Gameplay" />
  <img src="https://github.com/user-attachments/assets/f80ad05c-7134-4662-8772-87597dd0a172" width="30%" alt="Strokle Component Matching" />
</p>





## Strokle

Strokle is a Wordle-inspired kanji review game that challenges players to recall kanji through their structural components and vocabulary.

Instead of comparing individual letters, Strokle breaks down kanji into their structural components and provides color-coded feedback based on component matches and positioning.

Players have nine attempts to identify the mystery kanji, with additional hints unlocked throughout the game.

Strokle is also available as a standalone web application and is integrated into JimaQuiz through a Git submodule.

- [Play Strokle](https://creatorakaka.github.io/strokle/)
- [Strokle Repository](https://github.com/CreatorAKAKA/strokle)

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

## Project Structure

```
jimaquiz/
├── backend/          # FastAPI, OCR, dictionary, and database
├── frontend/         # React / TypeScript application
│   └── src/
│       └── strokle/  # Strokle Git submodule
├── tests/            # Development test scripts
├── scripts/          # Database maintenance scripts
├── legacy/           # Original Streamlit prototype
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone --recurse-submodules https://github.com/CreatorAKAKA/jimaquiz.git
cd jimaquiz
```

### 2. Set up the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Start the backend

From the project root:

```bash
cd backend
uvicorn api:app --reload
```

The backend should be available at `http://127.0.0.1:8000`.

### 4. Start the frontend

Open another terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend should be available at `http://localhost:5173`.

Both the backend and frontend must be running simultaneously for the application to function properly.

### Updating Strokle

To retrieve the latest version of Strokle, run the following from the project root:

```bash
git submodule update --init --remote frontend/src/strokle
```

Commit the updated submodule reference to preserve the version used by JimaQuiz.
