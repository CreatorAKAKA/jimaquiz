
import './ProgressBadges.css'

export type SetProgress = {
  mastered: number
  learning: number
  new: number
}

type ProgressBadgesProps = {
  progress?: SetProgress | null
}

function ProgressBadges({ progress }: ProgressBadgesProps) {
  return (
    <div className="progress-badges">
      <span className="progress-badge mastered">
        完璧 {progress?.mastered ?? '—'}
      </span>
      <span className="progress-badge learning">
        まだ {progress?.learning ?? '—'}
      </span>
      <span className="progress-badge new">
        全然 {progress?.new ?? '—'}
      </span>
    </div>
  )
}

export default ProgressBadges
