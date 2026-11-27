
import streamlit as st

COMPONENT_HTML = """
<div class="reading-wrapper">
    <input
        id="reading"
        type="text"
        placeholder="Type the reading..."
        autocomplete="off"
        spellcheck="false"
    >
</div>

<style>
.reading-wrapper input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid rgba(244, 114, 182, 0.35);
    background: rgba(244, 114, 182, 0.05);
    color: inherit;
    font-size: 18px;
    outline: none;
}
.reading-wrapper input:focus {
    border-color: #F9A8D4;
}
</style>

<script>
const input = document.getElementById("reading");

function normalizeReading(value) {
    return value.trim().normalize("NFKC").replace(
        /[ァ-ヶ]/g,
        character => String.fromCharCode(
            character.charCodeAt(0) - 96
        )
    );
}

function checkAnswer() {
    if (window.isComposing) return;

    const typed = normalizeReading(input.value);
    const correct = normalizeReading(
        window.parentCorrectReading || ""
    );

    if (typed && typed === correct) {
        Streamlit.setComponentValue(true);
    }
}

input.addEventListener("input", checkAnswer);
input.addEventListener("compositionstart", () => {
    window.isComposing = true;
});
input.addEventListener("compositionend", () => {
    window.isComposing = false;
    checkAnswer();
});

input.focus();
</script>
"""


def instant_reading_input(correct_reading, key):
    component = st.components.v2.component(
        "jimaquiz.reading_input",
        html=COMPONENT_HTML,
        js="""
        export default async function(component) {
            const input = component.parentElement.querySelector("#reading");
            const wanakana = await import("https://esm.sh/wanakana@5.3.1");
            wanakana.bind(input, { IMEMode: true });
            const correct = component.data.correct_reading;

            function normalizeReading(value) {
                return value.trim().normalize("NFKC").replace(
                    /[ァ-ヶ]/g,
                    char => String.fromCharCode(char.charCodeAt(0) - 96)
                );
            }

            let composing = false;
            let matched = false;

            function checkAnswer() {
                if (composing || matched) return;

                const typed = normalizeReading(input.value);

                if (typed && typed === normalizeReading(correct)) {
                    matched = true;
                    component.setStateValue("matched", true);
                }
            }

            input.addEventListener("input", checkAnswer);
            input.addEventListener("compositionstart", () => {
                composing = true;
            });
            input.addEventListener("compositionend", () => {
                composing = false;
                checkAnswer();
            });

            input.focus();

            return () => {
                input.removeEventListener("input", checkAnswer);
            };
        }
        """
    )

    result = component(
        data={"correct_reading": correct_reading},
        key=key,
        default={"matched": False},
        on_matched_change=lambda: None
    )

    return result.matched

