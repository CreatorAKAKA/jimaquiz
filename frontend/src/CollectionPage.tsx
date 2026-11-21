
import CollectionSetCard from './CollectionSetCard'
import type { SetProgress } from './ProgressBadges'
import './Collections.css'

type CollectionSet = {
  id: number
  title: string
}

type CollectionPageProps = {
  name: string
  sets: CollectionSet[]
  progress: Record<number, SetProgress>
  onBack: () => void
  onOpenSet: (set: CollectionSet) => void
}

function CollectionPage({
  name,
  sets,
  progress,
  onBack,
  onOpenSet,
}: CollectionPageProps) {
  return (
    <div className="collections-page">
      <button className="collections-back" onClick={onBack}>
        ← Back to My Collections
      </button>

      <h2>{name}</h2>
      <p className="collections-subtitle">
        {sets.length} sets in this collection
      </p>

      <div className="collection-sets-grid">
        {sets.map((set) => (
          <CollectionSetCard
            key={set.id}
            title={set.title}
            progress={progress[set.id]}
            imageUrl={`http://127.0.0.1:8000/api/collections/sets/${set.id}/images/cover`}
            onOpen={() => onOpenSet(set)}
          />
        ))}
      </div>
    </div>
  )
}

export default CollectionPage
