import { useState, useEffect } from 'react'
import './Strokle.css'
import { kanjiData, matchKanji } from './kanjiData'
import type { KanjiNode } from './kanjiData'
import KanjiGlyph from './KanjiGlyph'
import { getVGComponents } from './kanjiVG'
import { matchVGKanji } from './strokleMatcher'
import type { MatchStatus } from './strokleMatcher'
import RadicalBank from './RadicalBank'
import joyoData from './data/joyo.json'

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

const answerPool = Object.keys(joyoData).filter(
  (kanji) => Object.hasOwn(kanjiData, kanji)
)

console.log('Strokle answer pool:', answerPool.length)

function Strokle() {
  const [target, setTarget] = useState(
    () => answerPool[Math.floor(Math.random() * answerPool.length)] ?? '晴'
  )
  const [input, setInput] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [guessColors, setGuessColors] = useState<
    Record<string, Record<string, MatchStatus>>
  >({})
  const [error, setError] = useState('')
  const [gaveUp, setGaveUp] = useState(false)
  const [showRadicalHint, setShowRadicalHint] = useState(false)
  const [showStrokeHint, setShowStrokeHint] = useState(false)
  const [showMeaningHint, setShowMeaningHint] = useState(false)
  const [hintComponents, setHintComponents] = useState<
    Awaited<ReturnType<typeof getVGComponents>>
  >([])

  const won = guesses.includes(target)
  const lost = guesses.length >= 9 && !won
  const finished = won || lost || gaveUp


  useEffect(() => {
    let cancelled = false

    setHintComponents([])

    getVGComponents(target)
      .then((components) => {
        if (!cancelled) {
          setHintComponents(components)
        }
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [target])

  const knownComponents = new Set(
    guesses.flatMap((guess) =>
      Object.entries(guessColors[guess] ?? {})
        .filter(([, status]) =>
          status === 'correct' || status === 'misplaced'
        )
        .map(([id]) => id)
    )
  )


  const targetInfo =
    joyoData[target as keyof typeof joyoData]

  const hintCandidates = hintComponents
    .filter((component) =>
      component.character !== target &&
      component.strokeIds.length >= 2 &&
      component.strokeIds.length < targetInfo.strokes
    )
    .sort((a, b) =>
      b.strokeIds.length - a.strokeIds.length
    )

  const radicalHint =
    hintCandidates[0]?.character ?? null

  const meaningHint =
    targetInfo?.meanings?.[0] ?? null


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

    
    try {
      const matches = await matchVGKanji(guess, target)
      console.table(matches)

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
    } catch (error) {
      console.error('Strokle matching failed:', error)
      setError('Could not check this guess. Please try again.')
    }
  }

  function newGame() {
    const candidates = answerPool.filter(
        (kanji) => kanji !== target
    )

    setTarget(
      candidates[Math.floor(Math.random() * candidates.length)]
    )

    setGuesses([])
    setGuessColors({})
    setInput('')
    setError('')
    setShowRadicalHint(false)
    setShowStrokeHint(false)
    setShowMeaningHint(false)
    setGaveUp(false)
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

      <div className="strokle-legend">
        <span><i className="legend-correct" /> Correct position</span>
        <span><i className="legend-misplaced" /> Wrong position</span>
        <span><i className="legend-absent" /> Not present</span>
      </div>


      <div className="strokle-hints">
        <p className="strokle-hints-title">Need a hint?</p>

        <div className="strokle-hint-buttons">
          <button
            className={showRadicalHint ? 'revealed' : ''}
            disabled={guesses.length < 3 || showRadicalHint}
            onClick={() => setShowRadicalHint(true)}
          >
            <span className="hint-icon">◇</span>
            <span>Component</span>
            <small>{guesses.length < 3 ? `${3 - guesses.length} left` : showRadicalHint ? 'Revealed' : 'Unlock'}</small>
          </button>

          <button
            className={showStrokeHint ? 'revealed' : ''}
            disabled={guesses.length < 5 || showStrokeHint}
            onClick={() => setShowStrokeHint(true)}
          >
            <span className="hint-icon">＃</span>
            <span>Strokes</span>
            <small>{guesses.length < 5 ? `${5 - guesses.length} left` : showStrokeHint ? 'Revealed' : 'Unlock'}</small>
          </button>

          <button
            className={showMeaningHint ? 'revealed' : ''}
            disabled={guesses.length < 7 || showMeaningHint}
            onClick={() => setShowMeaningHint(true)}
          >
            <span className="hint-icon">あ</span>
            <span>Meaning</span>
            <small>{guesses.length < 7 ? `${7 - guesses.length} left` : showMeaningHint ? 'Revealed' : 'Unlock'}</small>
          </button>
        </div>

        {(showRadicalHint || showStrokeHint || showMeaningHint) && (
          <div className="strokle-hint-results">
            {showRadicalHint && (
              <p>Component: <strong>{radicalHint ?? 'Unavailable'}</strong></p>
            )}
            {showStrokeHint && (
              <p>Strokes: <strong>{targetInfo?.strokes ?? 'Unknown'}</strong></p>
            )}
            {showMeaningHint && (
              <p>Meaning: <strong>{meaningHint ?? 'Unknown'}</strong></p>
            )}
          </div>
        )}
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

      {!finished && (
        <button
          className="strokle-end-game"
          onClick={() => setGaveUp(true)}
        >
          End Game
        </button>
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

      <RadicalBank />
    </div>
  )
}
export default Strokle
