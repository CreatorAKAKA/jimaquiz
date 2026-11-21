
import ProgressBadges, { type SetProgress } from './ProgressBadges'

type CollectionSetCardProps = {
  title: string
  progress?: SetProgress | null
  imageUrl?: string
  onOpen?: () => void
  className?: string
  preview?: boolean
}

function CollectionSetCard({
  title,
  progress,
  imageUrl,
  onOpen,
  className = '',
  preview = false,
}: CollectionSetCardProps) {
  return (
    <div className={`collection-card ${className}`}>
      <div className="set-card-main">
        <div
          className="set-thumbnail"
          onClick={preview ? undefined : (event) => {
            event.stopPropagation()
            onOpen?.()
          }}
          style={{ cursor: preview ? 'default' : 'pointer' }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="set-thumbnail-image"
            />
          ) : (
            <span>🌸</span>
          )}
        </div>

        <div className="set-details">
          {preview ? (
            <span className="set-next-title">{title}</span>
          ) : (
            <button
              className="set-title-link"
              onClick={(event) => {
                event.stopPropagation()
                onOpen?.()
              }}
            >
              {title}
            </button>
          )}
        </div>
      </div>

      <div className="set-card-footer">
        <ProgressBadges progress={progress} />
      </div>
    </div>
  )
}

export default CollectionSetCard
