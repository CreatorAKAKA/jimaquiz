import { useState } from 'react'
import './Strokle.css'
import { kanjiData, parseKanji, matchKanji, expandKanji, printKanjiTree } from './kanjiData'
import type { KanjiNode } from './kanjiData'
import KanjiGlyph from './KanjiGlyph'
import { getVGComponents } from './kanjiVG'
import { matchVGKanji } from './strokleMatcher'
import type { MatchStatus } from './strokleMatcher'
getVGComponents('森').then((components) => {
  console.table(
    components.map((component) => ({
      id: component.id,
      character: component.character,
      ...component.bounds,
    }))
  )
})

matchVGKanji('森', '林').then(console.table)
matchVGKanji('明', '晴').then(console.table)
matchVGKanji('静', '晴').then(console.table)



function KanjiShape({
  node,
  matches = [],
  position = 'root',
}: {
  node: KanjiNode
  matches?: ReturnType<typeof matchKanji>
  position?: string
}) {
  if (node.children.length === 0) {
    const match = matches.find(
      (item) => item.position === position
    )

    return (
      <div className={`strokle-component ${match?.status ?? ''}`}>
        {node.character}
      </div>
    )
  }

  const vertical = ['⿱', '⿳'].includes(node.character)

  return (
    <div
      className={`strokle-structure ${
        vertical ? 'vertical' : 'horizontal'
      }`}
    >
      {node.children.map((child, index) => (
        <KanjiShape
          key={index}
          node={child}
          matches={matches}
          position={`${position}/${node.character}:${index}`}
        />
      ))}
    </div>
  )
}

function Strokle() {
  const [target, setTarget] = useState('晴')
  const [input, setInput] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [guessColors, setGuessColors] = useState<
    Record<string, Record<string, MatchStatus>>
  >({})
  const [error, setError] = useState('')

  const won = guesses.includes(target)
  const lost = guesses.length >= 9 && !won
  const finished = won || lost

  async function submitGuess() {
    if (finished) return

    const guess = input.trim()

    if (!Object.hasOwn(kanjiData, guess)) {
      setError('Kanji not in the current dictionary.')
      return
    }

    if (guesses.includes(guess)) {
      setError('You already guessed this kanji.')
      return
    }

    const matches = await matchVGKanji(guess, target)

    setGuessColors((previous) => ({
      ...previous,
      [guess]: Object.fromEntries(
        matches.map((match) => [
          match.id,
          match.status,
        ])
      ),
    }))

    setGuesses((previous) => [...previous, guess])
    setInput('')
    setError('')
  }

  function newGame() {
    const candidates = Object.keys(kanjiData).filter(
      (kanji) => kanji !== target
    )

    setTarget(
      candidates[Math.floor(Math.random() * candidates.length)]
    )

    setGuesses([])
    setGuessColors({})
    setInput('')
    setError('')
  }

  return (
    <div className="strokle-page">
      <h1>Strokle</h1>

      <p className="strokle-subtitle">
        Every kanji tells a story. Piece it together.
      </p>

      <div className="strokle-board">
        {Array.from({ length: 9 }, (_, index) => {
          const guess = guesses[index]

          return (
            <div className="strokle-row" key={index}>
              {guess ? (
                <KanjiGlyph
                  kanji={guess}
                  groupColors={guessColors[guess]}
                />
              ) : (
                <div className="strokle-empty-glyph" />
              )}
            </div>
          )
        })}
      </div>

      {!finished && (
        <div className="strokle-input">
          <input
            type="text"
            placeholder="Enter a kanji..."
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setError('')
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing
              ) {
                submitGuess()
              }
            }}
            autoComplete="off"
            spellCheck={false}
          />

          <button
            onClick={submitGuess}
            disabled={!input.trim()}
          >
            Guess
          </button>
        </div>
      )}

      {error && (
        <p className="strokle-error">{error}</p>
      )}

      {finished && (
        <div className="strokle-result">
          <h2>
            {won
              ? `正解！ Solved in ${guesses.length}/9`
              : `The answer was ${target}`}
          </h2>

          <button onClick={newGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default Strokle
