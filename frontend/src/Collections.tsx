
import { useEffect, useState } from 'react'
import './Collections.css'
import SetPage from './SetPage'
import ProgressBadges, { type SetProgress } from './ProgressBadges'
import CollectionPage from './CollectionPage'
import CollectionSetCard from './CollectionSetCard'

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
  pathname: string
  navigate: (path: string) => void
}

function Collections({ onStudySet, pathname, navigate }: CollectionsProps) {
  const [groups, setGroups] = useState<CollectionGroup[]>([])
  const [positions, setPositions] = useState<Record<number, number>>({})
  const [animating, setAnimating] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setProgress, setSetProgress] = useState<Record<number, SetProgress>>({})

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

  useEffect(() => {
    if (groups.length === 0) return

    const sets = groups.flatMap((group) => group.sets)

    Promise.all(
        sets.map(async (set) => {
        const response = await fetch(
            `http://127.0.0.1:8000/api/collections/sets/${set.id}/progress`
        )

        if (!response.ok) {
            throw new Error(`Failed to load progress for set ${set.id}`)
        }

        const progress: SetProgress = await response.json()

        return [set.id, progress] as const
        })
    )
        .then((results) => {
        setSetProgress(Object.fromEntries(results))
        })
        .catch((error) => {
        console.error('Could not load collection progress:', error)
        })
    }, [groups])

  
  
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

  
  const setMatch = pathname.match(/^\/sets\/(\d+)$/)
  const groupMatch = pathname.match(/^\/collections\/(\d+)$/)

  if (setMatch) {
    const setId = Number(setMatch[1])
    const group = groups.find((group) =>
      group.sets.some((set) => set.id === setId)
    )
    const selectedSet = group?.sets.find((set) => set.id === setId)

    if (!selectedSet) return <p>Set not found.</p>

    return (
      <SetPage
        setId={selectedSet.id}
        title={selectedSet.title}
        onBack={() => navigate(`/collections/${group!.id}`)}
        onStudy={(id) => onStudySet?.(id)}
      />
    )
  }

  if (groupMatch) {
    const selectedGroup = groups.find(
      (group) => group.id === Number(groupMatch[1])
    )

    if (!selectedGroup) return <p>Collection not found.</p>

    return (
      <CollectionPage
        name={selectedGroup.name}
        sets={selectedGroup.sets}
        progress={setProgress}
        onBack={() => navigate('/collections')}
        onOpenSet={(set) => navigate(`/sets/${set.id}`)}
      />
    )
  }



  return (
    <div className="collections-page">
        <nav className="app-navigation">
        <button onClick={() => navigate('/create')}>Create</button>
        <button onClick={() => navigate('/review')}>
            Review
        </button>
        <button onClick={() => navigate('/collections')}>
            Collections
        </button>
        <button onClick={() => navigate('/strokle')}>Strokle</button>
        </nav>

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
                <button
                    className="deck-label"
                    onClick={() => navigate(`/collections/${group.id}`)}
                    >
                    {group.name}
                    </button>
                <div className={`deck-animation-wrapper ${
                animating[group.id] ? 'is-shuffling' : ''
                }`}>
                {group.sets.length > 2 && (
                    <div className="collection-card deck-third-card" aria-hidden="true">
                        <div className="set-card-main"> 
                            <div className="set-thumbnail">
                            <img
                                key={thirdSet.id}
                                src={`http://127.0.0.1:8000/api/collections/sets/${thirdSet.id}/images/cover`}
                                alt=""
                                className="set-thumbnail-image"
                                onLoad={(event) => {
                                    event.currentTarget.style.display = 'block'
                                    event.currentTarget.nextElementSibling?.setAttribute('hidden', '')
                                }}
                                onError={(event) => {
                                event.currentTarget.style.display = 'none'
                                event.currentTarget.nextElementSibling?.removeAttribute('hidden')
                                }}
                            />
                            <span hidden>🌸</span>
                        </div>

                        <div className="set-details">
                            <span className="set-next-title">{thirdSet.title}</span>
                        </div>
                        </div>

                        <div className="set-card-footer">
                            <ProgressBadges progress={setProgress[thirdSet.id]} />
                            </div>
                    </div>
                    )}
                {group.sets.length > 1 && (
                    <div className="collection-card deck-next-card" aria-hidden="true">
                    <div className="set-card-main">
                        <div className="set-thumbnail">       
                            <img
                                key={nextSet.id}
                                src={`http://127.0.0.1:8000/api/collections/sets/${nextSet.id}/images/cover`}
                                alt=""
                                className="set-thumbnail-image"
                                onLoad={(event) => {
                                    event.currentTarget.style.display = 'block'
                                    event.currentTarget.nextElementSibling?.setAttribute('hidden', '')
                                }}
                                onError={(event) => {
                                event.currentTarget.style.display = 'none'
                                event.currentTarget.nextElementSibling?.removeAttribute('hidden')
                                }}
                            />
                            <span hidden>🌸</span>
                        </div>

                        <div className="set-details">
                        <span className="set-next-title">{nextSet.title}</span>
                        </div>
                    </div>

                    <div className="set-card-footer">
                        <ProgressBadges progress={setProgress[nextSet.id]} />
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
                            navigate(`/sets/${currentSet.id}`)
                        }}
                        style={{ cursor: 'pointer' }}
                        >
                        <img

                            key={currentSet.id}
                            src={`http://127.0.0.1:8000/api/collections/sets/${currentSet.id}/images/cover`}
                            alt=""
                            className="set-thumbnail-image"
                            onLoad={(event) => {
                                event.currentTarget.style.display = 'block'
                                event.currentTarget.nextElementSibling?.setAttribute('hidden', '')
                            }}
                            onError={(event) => {
                            event.currentTarget.style.display = 'none'
                            event.currentTarget.nextElementSibling?.removeAttribute('hidden')
                            }}
                        />
                        <span key={`fallback-${currentSet.id}`} hidden>🌸</span>
                        </div>



                      <div className="set-details">  
                        <button
                        className="set-title-link"
                        onClick={(event) => {
                            event.stopPropagation()
                            navigate(`/sets/${currentSet.id}`)
                        }}
                        >
                        {currentSet.title}
                        </button>

                      </div>
                    </div>

                    <div className="set-card-footer">
                        <ProgressBadges progress={setProgress[currentSet.id]} />
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
