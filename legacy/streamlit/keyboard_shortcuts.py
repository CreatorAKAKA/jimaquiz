
import streamlit as st


KEYBOARD_HTML = """
<div id="jq-keyboard-root" style="display:none"></div>
"""


KEYBOARD_JS = """
export default function(component) {
    const doc = window.parent.document;

    const readingInput = doc.querySelector("#reading");

    const isTypingReading = () => {
        const active = doc.activeElement;

        return (
            active?.tagName === "IFRAME" ||
            active?.id === "reading" ||
            readingInput?.matches(":focus")
        );
    };

    // Remove the previous listener if this component reinitializes.
    if (window.__jqKeyboardCleanup) {
        window.__jqKeyboardCleanup();
    }

    const onKeyDown = (event) => {
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        const target = event.composedPath()[0] || event.target;
        const tag = target?.tagName?.toLowerCase();

        // Don't interrupt typing or Japanese IME composition.
        const path = event.composedPath();

        const isTyping = path.some((element) => {
            const tagName = element?.tagName?.toLowerCase();

            return (
                tagName === "input" ||
                tagName === "textarea" ||
                tagName === "select" ||
                element?.isContentEditable
            );
        });

        if (event.isComposing || isTyping) {
            return;
        }

        const key = event.key.toLowerCase();
        const flipped = component.data.flipped;
        const studying = component.data.studying;

        let action = null;

        if (key === "f" || key === "arrowup" || key === "arrowdown") {
            action = "flip";
        } else if (studying && flipped) {
            const ratings = {
                "1": "Again",
                "2": "Hard",
                "3": "Good",
                "4": "Easy"
            };

            if (key === " " || key === "enter") {
                action = "rate:Easy";
            } else if (ratings[key]) {
                action = "rate:" + ratings[key];
            }
        }

        if (action) {
            event.preventDefault();

            component.setStateValue(
                "action",
                action + ":" + Date.now()
            );
        }
    };

    doc.addEventListener("keydown", onKeyDown, true);

    const cleanup = () => {
        doc.removeEventListener("keydown", onKeyDown, true);
    };

    window.__jqKeyboardCleanup = cleanup;

    return cleanup;
}
"""


def keyboard_shortcuts(flipped, studying):
    component = st.components.v2.component(
        "jimaquiz.keyboard_shortcuts",
        html=KEYBOARD_HTML,
        js=KEYBOARD_JS,
    )

    result = component(
        data={
            "flipped": flipped,
            "studying": studying,
        },
        key="jq_keyboard",
        default={"action": ""},
        on_action_change=lambda: None,
    )

    return result.action
