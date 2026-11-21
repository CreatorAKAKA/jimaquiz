
import { useRef, useEffect, useState } from 'react'
import './CreatePage.css'
import { toHiragana } from 'wanakana'

type Screenshot = {
  id: string
  file: File
  preview: string
  text: string
  loading: boolean
  error: string
}

function CreatePage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [subtitlePercentage, setSubtitlePercentage] = useState(30)

  const [vocabulary, setVocabulary] = useState<GroupedWord[]>([])
  const [vocabLoading, setVocabLoading] = useState(false)
  const [vocabError, setVocabError] = useState('')


  const [groups, setGroups] = useState<CollectionGroup[]>([])
  const [selectedSet, setSelectedSet] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newSetName, setNewSetName] = useState('')
  const [creatingSet, setCreatingSet] = useState(false)
  const [collectionError, setCollectionError] = useState('')

  const [savedEntries, setSavedEntries] = useState<Set<string>>(new Set())
  const [savingWord, setSavingWord] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')



  const previewUrls = useRef<string[]>([])

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])




  async function recognizeScreenshot(file: File, id: string) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/create/ocr?subtitle_percentage=${subtitlePercentage}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error('OCR failed')
      }

      const result = await response.json()

      setScreenshots((previous) =>
        previous.map((screenshot) =>
          screenshot.id === id
            ? { ...screenshot, text: result.text, loading: false }
            : screenshot
        )
      )
    } catch {
      setScreenshots((previous) =>
        previous.map((screenshot) =>
          screenshot.id === id
            ? { ...screenshot, error: 'Could not recognize text', loading: false }
            : screenshot
        )
      )
    }
  }

  
  function handleUpload(files: FileList | null) {
    if (!files) return

    const uploaded = Array.from(files).map((file) => {
      const preview = URL.createObjectURL(file)

      previewUrls.current.push(preview)

      return {
        id: crypto.randomUUID(),
        file,
        preview,
        text: '',
        loading: true,
        error: '',
      }
    })

    setScreenshots((previous) => [...previous, ...uploaded])

    uploaded.forEach((screenshot) => {
      recognizeScreenshot(screenshot.file, screenshot.id)
    })
  }


  useEffect(() => {
    const controller = new AbortController()

    const readyScreenshots = screenshots.filter(
      (screenshot) => !screenshot.loading && screenshot.text.trim()
    )

    if (readyScreenshots.length === 0) {
      setVocabulary([])
      setVocabLoading(false)
      setVocabError('')
      return
    }

    setVocabLoading(true)
    setVocabError('')

    const timer = setTimeout(async () => {
      try {
        const grouped = new Map<string, GroupedWord>()

        for (const screenshot of readyScreenshots) {
          const response = await fetch(
            'http://127.0.0.1:8000/api/create/vocabulary',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: screenshot.text,
              }),
              signal: controller.signal,
            }
          )

          if (!response.ok) {
            throw new Error('Vocabulary extraction failed')
          }

          const result = await response.json()

          for (const entry of result.vocabulary as ExtractedWord[]) {
            if (!grouped.has(entry.word)) {
              grouped.set(entry.word, {
                word: entry.word,
                reading: entry.reading,
                meanings: entry.meanings,
                contexts: [],
                parts_of_speech: entry.parts_of_speech,
              })
            }

            grouped.get(entry.word)!.contexts.push({
              screenshotId: screenshot.id,
              sentence: screenshot.text,
              surface: entry.surface,
            })
          }
        }

        if (!controller.signal.aborted) {
          setVocabulary(
            Array.from(grouped.values()).sort(
              (a, b) => b.contexts.length - a.contexts.length
            )
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setVocabError('Could not extract vocabulary')
        }
      } finally {
        if (!controller.signal.aborted) {
          setVocabLoading(false)
        }
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [screenshots])



  async function fetchCollections() {
    const response = await fetch(
      'http://127.0.0.1:8000/api/collections'
    )

    if (!response.ok) {
      throw new Error('Could not load collections')
    }

    const result = await response.json()
    setGroups(result)
  }

  useEffect(() => {
    fetchCollections().catch(() => {
      setCollectionError('Could not load collections')
    })
  }, [])


  async function handleCreateSet() {
    if (!newSetName.trim() || !selectedGroup) return
    if (selectedGroup === 'new' && !newGroupName.trim()) return

    setCreatingSet(true)
    setCollectionError('')

    try {
      let groupId = Number(selectedGroup)

      if (selectedGroup === 'new') {
        const groupResponse = await fetch(
          'http://127.0.0.1:8000/api/collections/groups',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: newGroupName.trim(),
            }),
          }
        )

        if (!groupResponse.ok) {
          throw new Error('Could not create collection')
        }

        const group = await groupResponse.json()
        groupId = group.id
      }

      const setResponse = await fetch(
        'http://127.0.0.1:8000/api/collections/sets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            group_id: groupId,
            title: newSetName.trim(),
          }),
        }
      )

      if (!setResponse.ok) {
        throw new Error('Could not create set')
      }

      const createdSet = await setResponse.json()

      await fetchCollections()

      setSelectedSet(String(createdSet.id))
      setSelectedGroup('')
      setNewGroupName('')
      setNewSetName('')
    } catch {
      setCollectionError('Could not create vocabulary set')
    } finally {
      setCreatingSet(false)
    }
  }


  function getSaveKey(entry: GroupedWord) {
    return JSON.stringify([
      selectedSet,
      entry.word,
      entry.contexts,
    ])
  }

  async function handleSaveWord(entry: GroupedWord) {
    if (!selectedSet || selectedSet === 'new' || savingWord) return

    const setId = Number(selectedSet)
    const saveKey = getSaveKey(entry)

    setSavingWord(entry.word)
    setSaveError('')

    try {
      for (const context of entry.contexts) {
        const screenshot = screenshots.find(
          (item) => item.id === context.screenshotId
        )

        if (!screenshot) {
          throw new Error('Screenshot not found')
        }

        const formData = new FormData()

        formData.append('file', screenshot.file)
        formData.append(
          'data',
          JSON.stringify({
            set_id: setId,
            word: entry.word,
            reading: entry.reading,
            meanings: entry.meanings,
            sentence: context.sentence,
            surface: context.surface,
          })
        )

        const response = await fetch(
          'http://127.0.0.1:8000/api/create/save',
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          throw new Error('Could not save vocabulary')
        }
      }

      setSavedEntries((previous) => {
        const updated = new Set(previous)
        updated.add(saveKey)
        return updated
      })
    } catch {
      setSaveError(`Could not save ${entry.word}. Please retry.`)
    } finally {
      setSavingWord(null)
    }
  }



  function highlightSentence(sentence: string, surface: string) {
    if (!surface) return sentence

    const parts = sentence.split(surface)

    return parts.map((part, index) => (
      <span key={index}>
        {index > 0 && (
          <mark className="highlighted-vocab">{surface}</mark>
        )}
        {part}
      </span>
    ))
  }

  function removeScreenshot(id: string) {
    const screenshot = screenshots.find(
      (item) => item.id === id
    )

    if (!screenshot) return

    URL.revokeObjectURL(screenshot.preview)

    previewUrls.current = previewUrls.current.filter(
      (url) => url !== screenshot.preview
    )

    setScreenshots((previous) =>
      previous.filter((item) => item.id !== id)
    )

    setActiveIndex((index) =>
      Math.max(0, Math.min(index, screenshots.length - 2))
    )
  }

  const active = screenshots[activeIndex]

  return (
    <div className="create-page">
      <h1>Create 🌸</h1>
      <p>Upload anime screenshots to extract Japanese vocabulary.</p>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          handleUpload(event.target.files)
          event.target.value = ''
        }}
      />

      <div className="create-columns">
        {active && (
        <div className="create-workspace">
          <h2>
            Screenshot {activeIndex + 1} of {screenshots.length}
          </h2>

          <div>
            <button
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((index) => index - 1)}
            >
              ← Previous
            </button>

            <button
              disabled={activeIndex === screenshots.length - 1}
              onClick={() => setActiveIndex((index) => index + 1)}
            >
              Next →
            </button>
            <button
              className="remove-screenshot-button"
              onClick={() => removeScreenshot(active.id)}
              disabled={savingWord !== null}
              title="Remove screenshot"
            >
              ✕ Remove
            </button>
          </div>

          
          <div className="screenshot-preview">
            <img
              src={active.preview}
              alt="Uploaded anime screenshot"
            />

            <div
              className="ocr-region"
              style={{ height: `${subtitlePercentage}%` }}
            >
              <span>SUBTITLE REGION</span>
            </div>
          </div>


          <label>
            Subtitle region: {subtitlePercentage}%
            <input
              type="range"
              min="10"
              max="60"
              value={subtitlePercentage}
              onChange={(event) =>
                setSubtitlePercentage(Number(event.target.value))
              }
            />
          </label>

          <button
            disabled={active.loading}
            onClick={() => {
              setScreenshots((previous) =>
                previous.map((screenshot) =>
                  screenshot.id === active.id
                    ? { ...screenshot, loading: true, error: '' }
                    : screenshot
                )
              )

              recognizeScreenshot(active.file, active.id)
            }}
          >
            Scan Subtitles
          </button>

          <h3>
            Detected Subtitles
            <span className="subtitle-hint"> · Edit as needed</span>
          </h3>

          {active.loading && <p>Recognizing subtitles...</p>}
          {active.error && <p>{active.error}</p>}

          <textarea
            value={active.text}
            rows={4}
            onChange={(event) => {
              const text = event.target.value

              setScreenshots((previous) =>
                previous.map((screenshot) =>
                  screenshot.id === active.id
                    ? { ...screenshot, text }
                    : screenshot
                )
              )
            }}
          />
        
        </div>
        )}

        {active && (
          <section className="extracted-vocabulary">
            <div className="vocab-header">
              <h2>Extracted Vocabulary</h2>
              <span>{vocabulary.length} words</span>
            </div>

            
            <div className="vocab-destination">
              <label>Save vocabulary to</label>

              <select
                value={selectedSet}
                disabled={creatingSet}
                onChange={(event) => {
                  setSelectedSet(event.target.value)
                  setCollectionError('')
                }}
              >
                <option value="">Select a vocabulary set</option>

                {groups.map((group) => (
                  <optgroup key={group.id} label={group.name}>
                    {group.sets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.title}
                      </option>
                    ))}
                  </optgroup>
                ))}

                <option value="new">＋ Create a new set</option>
              </select>

              {selectedSet === 'new' && (
                <div className="inline-set-creation">
                  <h3>Create a new set</h3>

                  <label>Collection</label>

                  <select
                    value={selectedGroup}
                    disabled={creatingSet}
                    onChange={(event) =>
                      setSelectedGroup(event.target.value)
                    }
                  >
                    <option value="">Select a collection</option>

                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}

                    <option value="new">
                      ＋ Create a new collection
                    </option>
                  </select>

                  {selectedGroup === 'new' && (
                    <>
                      <label>Collection name</label>
                      <input
                        type="text"
                        placeholder="e.g. アニメ"
                        value={newGroupName}
                        disabled={creatingSet}
                        onChange={(event) =>
                          setNewGroupName(event.target.value)
                        }
                      />
                    </>
                  )}

                  <label>Set name</label>

                  <input
                    type="text"
                    placeholder="e.g. 葬送のフリーレン"
                    value={newSetName}
                    disabled={creatingSet}
                    onChange={(event) =>
                      setNewSetName(event.target.value)
                    }
                  />

                  <button
                    disabled={
                      creatingSet ||
                      !selectedGroup ||
                      !newSetName.trim() ||
                      (selectedGroup === 'new' &&
                        !newGroupName.trim())
                    }
                    onClick={handleCreateSet}
                  >
                    {creatingSet ? 'Creating...' : '＋ Create Set'}
                  </button>
                </div>
              )}

              {collectionError && (
                <p className="collection-error">
                  {collectionError}
                </p>
              )}
            </div>

            

            {vocabLoading && <p>Extracting vocabulary...</p>}
            {vocabError && <p>{vocabError}</p>}
            {saveError && (
              <p className="collection-error">{saveError}</p>
            )}

            {vocabulary.map((entry) => (
              <div className="extracted-word" key={entry.word}>
                <div className="extracted-word-top">
                  <div className="extracted-word-kanji">
                    <span>{toHiragana(entry.reading)}</span>
                    <strong>{entry.word}</strong>
                  </div>

                  <div className="extracted-word-definitions">
                    <div className="vocab-pos-tags">
                      {entry.parts_of_speech.map((pos) => (
                        <span key={pos}>{pos}</span>
                      ))}
                    </div>
                    <small>
                      Appeared as: {
                        [...new Set(
                          entry.contexts.map((context) => context.surface)
                        )].join('、')
                      }
                    </small>

                    {entry.meanings.slice(0, 3).map((sense, index) => (
                      <p key={index}>
                        {index + 1}. {sense.join('; ')}
                      </p>
                    ))}

                    {entry.meanings.length > 3 && (
                      <details>
                        <summary>More definitions</summary>
                        {entry.meanings.slice(3).map((sense, index) => (
                          <p key={index}>
                            {index + 4}. {sense.join('; ')}
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                    

                  <button
                    className={`save-word-button ${
                      savedEntries.has(getSaveKey(entry))
                        ? 'is-saved'
                        : ''
                    }`}
                    disabled={
                      !selectedSet ||
                      selectedSet === 'new' ||
                      vocabLoading ||
                      !!vocabError ||
                      screenshots.some((item) => item.loading) ||
                      savingWord !== null ||
                      savedEntries.has(getSaveKey(entry))
                    }
                    onClick={() => handleSaveWord(entry)}
                    title={
                      !selectedSet || selectedSet === 'new'
                        ? 'Select a vocabulary set first'
                        : 'Save vocabulary'
                    }
                  >
                    {savedEntries.has(getSaveKey(entry))
                      ? '✓'
                      : savingWord === entry.word
                        ? '…'
                        : '＋'}
                  </button>


                </div>

                <div className="extracted-word-context">
                  <small>EXAMPLE SENTENCE</small>
                  <p>
                    {highlightSentence(
                      entry.contexts[0].sentence,
                      entry.contexts[0].surface
                    )}
                  </p>

                  {entry.contexts.length > 1 && (
                    <details>
                      <summary>
                        {entry.contexts.length - 1} more examples
                      </summary>

                      {entry.contexts.slice(1).map((context) => (
                        <p key={context.screenshotId}>
                          {highlightSentence(
                            context.sentence,
                            context.surface
                          )}
                        </p>
                      ))}
                    </details>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}



type ExtractedWord = {
  word: string
  reading: string
  surface: string
  meanings: string[][]
  parts_of_speech: string[]
}

type GroupedWord = {
  word: string
  reading: string
  meanings: string[][]
  parts_of_speech: string[]
  contexts: {
    screenshotId: string
    sentence: string
    surface: string
  }[]
}


type CollectionGroup = {
  id: number
  name: string
  sets: {
    id: number
    title: string
  }[]
}



export default CreatePage
