
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { toHiragana } from 'wanakana'
import './SetPage.css'
import ProgressBadges, { type SetProgress } from './ProgressBadges'


type SetWord = {
  word: string
  reading: string
  meanings: string[][]
  added_at: string | null
  screenshot_id: number | null
  due_at: string | null
  review_state: string
}


function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return 'New'

  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return 'Unknown'

  const now = new Date()

  if (due <= now) return 'Due now'

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  if (due >= tomorrow && due < dayAfterTomorrow) {
    return 'Tomorrow'
  }

  return due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: due.getFullYear() !== now.getFullYear()
      ? 'numeric'
      : undefined,
  })
}

function formatAddedDate(addedAt: string | null): string {
  if (!addedAt) return '—'

  const date = new Date(
    addedAt.includes('T') ? addedAt : addedAt.replace(' ', 'T') + 'Z'
  )

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}



type SetPageProps = {
  setId: number
  title: string
  onBack: () => void
  onStudy: (setId: number) => void
}

function SetPage({ setId, title, onBack, onStudy }: SetPageProps) {

  const [words, setWords] = useState<SetWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [imageVersion, setImageVersion] = useState(0)
  const [draggingImage, setDraggingImage] = useState<'banner' | 'cover' | null>(null)
  const [editingImage, setEditingImage] = useState<'banner' | 'cover' | null>(null)
  const [editorZoom, setEditorZoom] = useState(1)
  const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 })
  const [editorError, setEditorError] = useState('')
  const [savingImage, setSavingImage] = useState(false)
  const [progress, setProgress] = useState<SetProgress | null>(null)
  
  const editorCanvasRef = useRef<HTMLCanvasElement>(null)
  const editorImageRef = useRef<HTMLImageElement | null>(null)
  const editorDragRef = useRef<{ x: number; y: number } | null>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  
  const imageUrl = (type: 'banner' | 'cover') =>
  `http://127.0.0.1:8000/api/collections/sets/${setId}/images/${type}?v=${imageVersion}`
  
  async function uploadImage(
  type: 'banner' | 'cover',
  file: File
  ) {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
      const response = await fetch(
      `http://127.0.0.1:8000/api/collections/sets/${setId}/images/${type}`,
      {
          method: 'POST',
          body: formData,
      }
      )
  
      if (!response.ok) {
      throw new Error('Image upload failed')
      }
  
      setImageVersion((version) => version + 1)
  } catch (error) {
      console.error(error)
      alert('Could not upload image')
  }
  }

  function handleImageDrop(
    event: React.DragEvent<HTMLDivElement>,
    type: 'banner' | 'cover'
    ) {
    event.preventDefault()
    event.stopPropagation()

    setDraggingImage(null)

    const file = event.dataTransfer.files[0]

    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!validTypes.includes(file.type)) {
        alert('Please upload a JPG, PNG, or WebP image.')
        return
    }

    uploadImage(type, file)
    }
  
  function openImageEditor(type: 'banner' | 'cover') {
    setEditingImage(type)
    setEditorZoom(1)
    setEditorPosition({ x: 0, y: 0 })
    setEditorError('')
  }

  function closeImageEditor() {
    setEditingImage(null)
    editorImageRef.current = null
    editorDragRef.current = null
  }

  function handleEditorPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    editorDragRef.current = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handleEditorPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!editorDragRef.current) return

    const dx = event.clientX - editorDragRef.current.x
    const dy = event.clientY - editorDragRef.current.y

    const canvas = event.currentTarget
    const scale = canvas.width / canvas.getBoundingClientRect().width

    setEditorPosition((previous) => ({
      x: previous.x + dx * scale,
      y: previous.y + dy * scale,
    }))

    editorDragRef.current = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handleEditorPointerUp() {
    editorDragRef.current = null
  }

  function drawEditorImage() {
    const canvas = editorCanvasRef.current
    const image = editorImageRef.current

    if (!canvas || !image) return

    const context = canvas.getContext('2d')
    if (!context) return

    const baseScale = Math.max(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight
    )

    const scale = baseScale * editorZoom
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale

    const maxX = (width - canvas.width) / 2
    const maxY = (height - canvas.height) / 2

    const x = Math.max(-maxX, Math.min(maxX, editorPosition.x))
    const y = Math.max(-maxY, Math.min(maxY, editorPosition.y))

    context.clearRect(0, 0, canvas.width, canvas.height)

    context.drawImage(
      image,
      (canvas.width - width) / 2 + x,
      (canvas.height - height) / 2 + y,
      width,
      height
    )
  }

  useEffect(() => {
    setLoading(true)
    setError('')

    fetch(`http://127.0.0.1:8000/api/collections/sets/${setId}/vocabulary`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load vocabulary')
        return response.json()
      })
      .then((data: SetWord[]) => setWords(data))
      .catch(() => setError('Could not load set vocabulary'))
      .finally(() => setLoading(false))
  }, [setId])

  useEffect(() => {
    setProgress(null)

    fetch(`http://127.0.0.1:8000/api/collections/sets/${setId}/progress`)
        .then((response) => {
        if (!response.ok) throw new Error('Failed to load progress')
        return response.json()
        })
        .then((data: SetProgress) => setProgress(data))
        .catch((error) => console.error(error))
    }, [setId])

  useEffect(() => {
    if (!editingImage) return

    const image = new Image()
    let cancelled = false
    image.crossOrigin = 'anonymous'

    image.onload = () => {
      if (cancelled) return
      editorImageRef.current = image
      drawEditorImage()
    }

    image.onerror = () => {
      if (!cancelled) {
        setEditorError('Could not load image. Upload an image first.')
      }
    }

    image.src = imageUrl(editingImage)

    return () => {
      cancelled = true
    }
  }, [editingImage, setId, imageVersion])

  useEffect(() => {
    drawEditorImage()
  }, [editorZoom, editorPosition, editingImage])


  async function saveEditedImage() {
    const canvas = editorCanvasRef.current

    if (!canvas || !editingImage || !editorImageRef.current) return

    drawEditorImage()

    setSavingImage(true)

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!blob) throw new Error('Could not create image')

      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Edited image exceeds the 5 MB upload limit')
      }

      const file = new File([blob], `${editingImage}.png`, {
        type: 'image/png',
      })

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `http://127.0.0.1:8000/api/collections/sets/${setId}/images/${editingImage}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) throw new Error('Could not save edited image')

      setImageVersion((version) => version + 1)
      closeImageEditor()
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : 'Could not save image'
      )
    } finally {
      setSavingImage(false)
    }
  }

  return (
    <div className="set-page">

      <div
        className={`set-page-banner ${draggingImage === 'banner' ? 'image-dragging' : ''}`}
        onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setDraggingImage('banner')
        }}
        onDragLeave={(event) => {
            event.preventDefault()
            setDraggingImage(null)
        }}
        onDrop={(event) => handleImageDrop(event, 'banner')}
        title="Click or drag an image to upload banner"
        >
        <div className="set-image-overlay">
            <div className="set-image-actions">
                <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation()
                    openImageEditor('banner')
                }}
                >
                Edit Image
                </button>

                <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation()
                    bannerInputRef.current?.click()
                }}
                >
                Replace Image
                </button>
            </div>

            <small>or drag & drop to replace</small>
            </div>

        <img
            src={imageUrl('banner')}
            alt="Set banner"
            onError={(event) => {
            event.currentTarget.style.display = 'none'
            }}
            onLoad={(event) => {
            event.currentTarget.style.display = 'block'
            }}
        />

        <input
            ref={bannerInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) uploadImage('banner', file)
            event.target.value = ''
            }}
        />

        <button
          type="button"
          className="set-banner-back"
          onClick={(event) => {
            event.stopPropagation()
            onBack()
          }}
        >
          ← Back
        </button>
      </div>

      <div className="set-page-header">
        <div
            className={`set-page-cover ${draggingImage === 'cover' ? 'image-dragging' : ''}`}
            onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'copy'
                setDraggingImage('cover')
            }}
            onDragLeave={(event) => {
                event.preventDefault()
                setDraggingImage(null)
            }}
            onDrop={(event) => handleImageDrop(event, 'cover')}
            title="Click or drag an image to upload cover"
            >
            <div className="set-image-overlay">
                <div className="set-image-actions">
                    <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation()
                        openImageEditor('cover')
                    }}
                    >
                    Edit Image
                    </button>

                    <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation()
                        coverInputRef.current?.click()
                    }}
                    >
                    Replace Image
                    </button>
                </div>

                <small>or drag & drop to replace</small>
                </div>

            <img
                src={imageUrl('cover')}
                alt="Set cover"
                onError={(event) => {
                event.currentTarget.style.display = 'none'
                }}
                onLoad={(event) => {
                event.currentTarget.style.display = 'block'
                }}
            />

            <input
                ref={coverInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadImage('cover', file)
                event.target.value = ''
                }}
            />
            </div>

        <div className="set-page-info">
            <h1>{title}</h1>
            <ProgressBadges progress={progress} />
            </div>

            <button
            className="set-study-button"
            onClick={() => onStudy(setId)}
            >
            Study Set
            </button>
      </div>

      
    
      <div className="set-page-content">
        {loading ? (
          <p>Loading vocabulary... 🌸</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <div className="set-vocabulary-table-wrapper">
            <table className="set-vocabulary-table">
              <thead>
                <tr>
                  <th>Vocabulary ({words.length})</th>
                  <th>Reading</th>
                  <th>Meaning</th>
                  <th>Date Added</th>
                  <th>Next Review</th>
                </tr>
              </thead>

              <tbody>
                {words.map((word) => (
                  <tr key={word.word}>
                    <td>
                      
                        
                        <div className="set-word-cell">
                        <div
                            className="set-word-preview"
                            tabIndex={word.screenshot_id != null ? 0 : undefined}
                        >
                            <strong>{word.word}</strong>

                            {word.screenshot_id != null && (
                            <div className="set-word-popup">
                                <img
                                src={`http://127.0.0.1:8000/api/screenshots/${word.screenshot_id}`}
                                alt={`Screenshot for ${word.word}`}
                                />
                            </div>
                            )}
                        </div>
                        </div>


                    </td>

                    <td>{toHiragana(word.reading)}</td>

                    <td className="set-word-meaning">
                      {word.meanings[0]?.join('; ') ?? ''}
                    </td>

                    <td className="set-word-due">
                      {formatAddedDate(word.added_at)}
                    </td>

                    <td className="set-word-due">
                      {formatDueDate(word.due_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {words.length === 0 && (
              <p>No vocabulary saved in this set yet.</p>
            )}
          </div>
        )}
    </div>

      {editingImage && (
        <div className="set-editor-backdrop">
            <div className="set-editor-modal">
            <h2>
                Edit {editingImage === 'banner' ? 'Banner' : 'Cover'} Image
            </h2>

            <p>Drag to reposition your image.</p>

            <canvas
                ref={editorCanvasRef}
                width={editingImage === 'banner' ? 1100 : 500}
                height={editingImage === 'banner' ? 200 : 500}
                className="set-editor-canvas"
                onPointerDown={handleEditorPointerDown}
                onPointerMove={handleEditorPointerMove}
                onPointerUp={handleEditorPointerUp}
                onPointerCancel={handleEditorPointerUp}
                onLostPointerCapture={handleEditorPointerUp}
            />

            <div className="set-editor-zoom">
                <label htmlFor="set-editor-zoom">
                Zoom: {Math.round(editorZoom * 100)}%
                </label>

                <input
                id="set-editor-zoom"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={editorZoom}
                onChange={(event) => {
                    setEditorZoom(Number(event.target.value))
                }}
                />
            </div>

            {editorError && (
                <p className="set-editor-error">{editorError}</p>
            )}

            <div className="set-editor-buttons">
                <button onClick={closeImageEditor} disabled={savingImage}>
                Cancel
                </button>

                <button onClick={saveEditedImage} disabled={savingImage}>
                {savingImage ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            </div>
        </div>
        )}

    </div>
  )
}

export default SetPage
