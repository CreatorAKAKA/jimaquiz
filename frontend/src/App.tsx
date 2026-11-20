
import { useEffect, useState } from 'react'
import { toHiragana } from 'wanakana'
import './App.css'
import Collections from './Collections'

type Vocabulary = {
  word: string
  reading: string
  meanings: string[][]
  example: string
}

function App() {

  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([])
  const [reviewVocabulary, setReviewVocabulary] = useState<Vocabulary[]>([])
  const [reviewQueue, setReviewQueue] = useState<Vocabulary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState<'review' | 'collections'>('review')
  const [studyMode, setStudyMode] = useState<'review' | 'set'>('review')
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/words')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load vocabulary')
        return response.json()
      })
      .then((data: Vocabulary[]) => {
        setReviewVocabulary(data)
        setReviewQueue(data)
        setVocabulary(data)
        setStudyQueue(data)
        setTotalCards(data.length)
      })
      .catch(() => setError('Could not connect to JimaQuiz backend'))
      .finally(() => setLoading(false))
  }, [])

  const [studyQueue, setStudyQueue] = useState<Vocabulary[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [snoozedWords, setSnoozedWords] = useState<string[]>([])
  const [flipped, setFlipped] = useState(false)
  const [readingInput, setReadingInput] = useState('')


  
  async function returnToReview() {
    setPage('review')
    setStudyMode('review')
    setSelectedSetId(null)
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:8000/api/words')

      if (!response.ok) {
        throw new Error('Failed to load review vocabulary')
      }

      const words: Vocabulary[] = await response.json()

      setReviewVocabulary(words)
      setReviewQueue(words)
      setVocabulary(words)
      setStudyQueue(words)
      setTotalCards(words.length)
      setSnoozedWords([])
      setFlipped(false)
      setReadingInput('')
    } catch (error) {
      console.error(error)
      setError('Could not load review vocabulary')
    } finally {
      setLoading(false)
    }
  }



  const card = studyQueue[0]

  async function startSetStudy(setId: number) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/collections/sets/${setId}/words`
      )

      if (!response.ok) {
        throw new Error('Failed to load collection set')
      }

      const words: Vocabulary[] = await response.json()

      setSelectedSetId(setId)
      setStudyMode('set')
      setVocabulary(words)
      setStudyQueue(words)
      setTotalCards(words.length)
      setSnoozedWords([])
      setFlipped(false)
      setReadingInput('')
      setPage('review')
    } catch (error) {
      console.error(error)
      alert('Could not load this collection set. Please try again.')
    } finally {
      setLoading(false)
    }
  }




async function rateCard(rating: string) {
  if (!card) return

  if (rating !== 'Snooze') {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word: card.word,
          rating: rating,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save rating')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error('Rating was rejected')
      }
    } catch (error) {
      console.error(error)
      alert('Could not save your rating. Please try again.')
      return
    }
  }

  if (rating === 'Snooze') {
    setSnoozedWords((previous) =>
      previous.includes(card.word)
        ? previous
        : [...previous, card.word]
    )
  } else {
    setSnoozedWords((previous) =>
      previous.filter((word) => word !== card.word)
    )
  }

  setStudyQueue((previous) => {
    const remaining = previous.slice(1)

    if (rating === 'Snooze' || rating === 'Not yet') {
      return [...remaining, previous[0]]
    }

    return remaining
  })

  setFlipped(false)
  setReadingInput('')
}

  if (page === 'collections') {
    return (
      <main>
        <nav className="app-navigation">
          <button onClick={returnToReview}>Review</button>
          <button onClick={() => setPage('collections')}>Collections</button>
        </nav>
        <Collections onStudySet={startSetStudy} />
      </main>
    )
  }


  if (loading) return <p>Loading vocabulary... 🌸</p>
  if (error) return <p>{error}</p>
  if (vocabulary.length === 0 || studyQueue.length === 0) {
    return (
      <main>
        <nav className="app-navigation">
          <button onClick={returnToReview}>Review</button>
          <button onClick={() => setPage('collections')}>Collections</button>
        </nav>
        <h1>ジマクイズ 🌸</h1>
        <p>Learn Japanese through the stories you love.</p>

        <div className="flashcard">
          <div className="flashcard-content">
            <div className="empty-state">
              <span className="empty-state-icon">🌸</span>
              <h2>今日もお疲れ様！</h2>
              <p>You're all caught up!</p>
              <p className="empty-state-subtitle">
                No vocabulary is due for review right now.
                Come back when your next reviews are ready!
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }


  return (
    <main>
      <nav className="app-navigation">
        <button onClick={returnToReview}>Review</button>
        <button onClick={() => setPage('collections')}>Collections</button>
      </nav>

      <h1>ジマクイズ 🌸</h1>
      <p>Learn Japanese through the stories you love.</p>

      <div className="flashcard">
        <div className="flashcard-content">
          <span className="card-progress">
            {totalCards - studyQueue.length} completed · {studyQueue.length} remaining
            {snoozedWords.length > 0 && ` (${snoozedWords.length} snoozed)`}
          </span>

          
          <div className="card-layout">
            <section className="vocabulary-side">
              <h2>{card.word}</h2>

              {flipped ? (
                <div className="card-answer">
                  <p className="reading">{toHiragana(card.reading)}</p>
                  <div className="meaning">
                    {card.meanings.slice(0, 3).map((sense, index) => (
                      <p key={index}>{sense.join('; ')}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="reading-section">
                  <input
                    key={card.word}
                    autoFocus
                    type="text"
                    placeholder="Type the reading..."
                    value={readingInput}
                    onChange={(event) => {
                      const converted = toHiragana(event.target.value)
                      setReadingInput(converted)

                      if (converted === toHiragana(card.reading)) {
                        setFlipped(true)
                      }
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <button onClick={() => setFlipped(true)}>
                    Show Answer
                  </button>
                </div>
              )}
            </section>

            <section className="context-side">
              <div className="screenshot-placeholder">
                <span>🌸</span>
                <p>Screenshot integration coming next</p>
              </div>

              <div className="example-sentence">
                <span>SENTENCE</span>
                <p>{card.example}</p>
              </div>
            </section>
          </div>
        </div>

        {flipped && (
          <div className="rating-footer">
            <button className="snooze" onClick={() => rateCard('Snooze')}>Snooze</button>
            <button className="not-yet" onClick={() => rateCard('Not yet')}>Not yet</button>
            <button className="only-just" onClick={() => rateCard('Only just')}>Only just</button>
            <button className="easy" onClick={() => rateCard('Easy')}>Easy</button>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
