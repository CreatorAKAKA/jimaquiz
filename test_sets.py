from database import (
    init_db,
    load_groups,
    load_flashcards,
    add_word_to_set,
    load_set_words
)

init_db()

groups = load_groups()
flashcards = load_flashcards()

if not groups or not groups[0]["sets"]:
    print("Create a deck and set first.")
elif not flashcards:
    print("Save a vocabulary flashcard first.")
else:
    set_id = groups[0]["sets"][0]["id"]
    word = next(iter(flashcards))

    print("Adding:", word)
    print("Added:", add_word_to_set(word, set_id))
    print("Set contents:", load_set_words(set_id))