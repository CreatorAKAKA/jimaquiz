
import { useEffect, useState } from 'react'
import './Collections.css'
import SetPage from './SetPage'

type CollectionSet = {
  id: number
  title: string
}

type CollectionGroup = {
  id: number
  name: string
  sets: CollectionSet[]
}

type CollectionsProps = {
  onStudySet?: (setId: number) => void
}

function Collections({ onStudySet }: CollectionsProps) {
  const [groups, setGroups] = useState<CollectionGroup[]>([])
  const [selectedSet, setSelectedSet] = useState<CollectionSet | null>(null)
  const [positions, setPositions] = useState<Record<number, number>>({})
  const [animating, setAnimating] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/collections')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load collections')
        return response.json()
      })
      .then((data: CollectionGroup[]) => setGroups(data))
      .catch(() => setError('Could not load collections'))
      .finally(() => setLoading(false))
  }, [])

  
  
  function shuffleDeck(groupId: number, setCount: number) {
    console.log('Deck clicked:', groupId, 'Sets:', setCount, 'Animating:', animating[groupId])
    if (setCount <= 1 || animating[groupId]) return

    setAnimating((previous) => ({
        ...previous,
        [groupId]: true,
    }))
  }



  if (loading) return <p>Loading collections... 🌸</p>
  if (error) return <p>{error}</p>

  if (selectedSet) {
    return (
      <SetPage
        setId={selectedSet.id}
        title={selectedSet.title}
        onBack={() => setSelectedSet(null)}
        onStudy={(setId) => onStudySet?.(setId)}
      />
    )
  }


  return (
    <div className="collections-page">
      <h2>My Collections</h2>
      <p className="collections-subtitle">
        Click a card to browse its sets.
      </p>

      <div className="collections-grid">
        {groups.map((group) => {
          const position = positions[group.id] ?? 0
          const currentSet = group.sets[position]
          const nextSet = group.sets[(position + 1) % group.sets.length]
          const thirdSet = group.sets[(position + 2) % group.sets.length]

          return (
            <div className="deck-container" key={group.id}>
                <div className="deck-label">{group.name}</div>
                <div className={`deck-animation-wrapper ${
                animating[group.id] ? 'is-shuffling' : ''
                }`}>
                {group.sets.length > 2 && (
                    <div className="collection-card deck-third-card" aria-hidden="true">
                        <div className="set-card-main">
                        <div className="set-thumbnail">
                            <span>🌸</span>
                        </div>

                        <div className="set-details">
                            <span className="set-next-title">{thirdSet.title}</span>
                        </div>
                        </div>

                        <div className="set-card-footer">
                        <span>完璧</span>
                        <span>まだ</span>
                        <span>全然</span>
                        </div>
                    </div>
                    )}
                {group.sets.length > 1 && (
                    <div className="collection-card deck-next-card" aria-hidden="true">
                    <div className="set-card-main">
                        <div className="set-thumbnail">
                        <span>🌸</span>
                        </div>

                        <div className="set-details">
                        <span className="set-next-title">{nextSet.title}</span>
                        </div>
                    </div>

                    <div className="set-card-footer">
                        <span>完璧</span>
                        <span>まだ</span>
                        <span>全然</span>
                    </div>
                    </div>
                )}

                <div
                    className="collection-card collection-deck"
                onClick={() => shuffleDeck(group.id, group.sets.length)}

                onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.animationName !== 'shuffle-to-back') return

                    setPositions((previous) => ({
                        ...previous,
                        [group.id]: ((previous[group.id] ?? 0) + 1) % group.sets.length,
                    }))

                    setAnimating((previous) => ({
                        ...previous,
                        [group.id]: false,
                    }))
                }}

                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    shuffleDeck(group.id, group.sets.length)
                  }
                }}
              >
                {currentSet ? (
                  <>
                    <div className="set-card-main">               
                        <div
                        className="set-thumbnail"
                        onClick={(event) => {
                            event.stopPropagation()
                            setSelectedSet(currentSet)
                        }}
                        style={{ cursor: 'pointer' }}
                        >
                        <span>🌸</span>
                        </div>


                      <div className="set-details">  
                        <button
                        className="set-title-link"
                        onClick={(event) => {
                            event.stopPropagation()
                            setSelectedSet(currentSet)
                        }}
                        >
                        {currentSet.title}
                        </button>

                      </div>
                    </div>

                    <div className="set-card-footer">
                      <span>完璧</span>
                      <span>まだ</span>
                      <span>全然</span>
                    </div>
                  </>
                ) : (
                  <p className="empty-deck">No sets yet</p>
                )}
              </div>
            </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Collections
