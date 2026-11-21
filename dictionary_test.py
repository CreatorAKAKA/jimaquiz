from jamdict import Jamdict



def format_pos(pos):
    labels = {
        "transitive verb": "Transitive",
        "intransitive verb": "Intransitive",
        "noun (common) (futsuumeishi)": "Noun",
        "noun or participle which takes the aux. verb suru": "Suru verb",
        "adjective (keiyoushi)": "I-adjective",
        "adjectival nouns or quasi-adjectives (keiyodoshi)": "Na-adjective",
        "adverb (fukushi)": "Adverb",
        "adverb taking the 'to' particle": "To-adverb",
    }

    godan_endings = {
        "u": "う",
        "ku": "く",
        "gu": "ぐ",
        "su": "す",
        "tsu": "つ",
        "nu": "ぬ",
        "bu": "ぶ",
        "mu": "む",
        "ru": "る",
    }

    for romaji, kana in godan_endings.items():
        if pos == f"Godan verb with '{romaji}' ending":
            return f"Godan verb (-{kana})"

    return labels.get(pos, pos)

def get_word_info(word, reading):
    jam = Jamdict()
    result = jam.lookup(word)
    meanings = []
    parts_of_speech = []

    for entry in result.entries:
        if not any(
            hiragana_to_katakana(kana.text) == reading
            for kana in entry.kana_forms
        ):
            continue

        for sense in entry.senses:
            definitions = []

            for gloss in sense.gloss:
                definitions.append(gloss.text)

            meanings.append(definitions)

            for pos in sense.pos:
                label = format_pos(pos)

                if label not in parts_of_speech:
                    parts_of_speech.append(label)

    return {
        "meanings": meanings,
        "parts_of_speech": parts_of_speech
    }


def get_definitions(word, reading):
    return get_word_info(word, reading)["meanings"]

def hiragana_to_katakana(text):
    result = ""

    for char in text:
        if "ぁ" <= char <= "ゖ":
            result += chr(ord(char) + 96)
        else:
            result += char

    return result

if __name__ == "__main__":
    print(get_word_info("聞き流す", "キキナガス"))
    print(get_word_info("食べる", "タベル"))
    print(get_word_info("勉強", "ベンキョウ"))
    print(get_word_info("危ない", "アブナイ"))