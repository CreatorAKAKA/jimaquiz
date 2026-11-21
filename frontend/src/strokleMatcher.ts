import type { VGComponent } from './kanjiVG'
import { getVGComponents } from './kanjiVG'

type Bounds = VGComponent['bounds']

export function getOverlap(a: Bounds, b: Bounds): number {
  const left = Math.max(a.x, b.x)
  const right = Math.min(
    a.x + a.width,
    b.x + b.width
  )

  const top = Math.max(a.y, b.y)
  const bottom = Math.min(
    a.y + a.height,
    b.y + b.height
  )

  const intersection =
    Math.max(0, right - left) *
    Math.max(0, bottom - top)

  const union =
    a.width * a.height +
    b.width * b.height -
    intersection

  return union > 0 ? intersection / union : 0
}

export type MatchStatus =
  | 'correct'
  | 'misplaced'
  | 'nested'
  | 'absent'

export type VGMatch = {
  id: string
  character: string
  status: MatchStatus
}

export async function matchVGKanji(
  guess: string,
  target: string
): Promise<VGMatch[]> {
  const guessed = await getVGComponents(guess)
  const answer = await getVGComponents(target)

  const usedGuessStrokes = new Set<string>()
  const usedTargetStrokes = new Set<string>()

  const results: VGMatch[] = []

  const pairs = guessed.flatMap((g) =>
    answer
      .filter((a) => a.character === g.character)
      .map((a) => ({
        guess: g,
        target: a,
        overlap: getOverlap(g.bounds, a.bounds),
      }))
  )

  pairs.sort((a, b) => {
    const positionDifference =
      Number(b.overlap >= 0.45) -
      Number(a.overlap >= 0.45)

    return positionDifference ||
      b.guess.strokeIds.length -
      a.guess.strokeIds.length ||
      b.overlap - a.overlap
  })

  for (const pair of pairs) {
    if (
      pair.guess.strokeIds.some(
        (id) => usedGuessStrokes.has(id)
      ) ||
      pair.target.strokeIds.some(
        (id) => usedTargetStrokes.has(id)
      )
    ) {
      continue
    }

    results.push({
      id: pair.guess.id,
      character: pair.guess.character,
      status: pair.overlap >= 0.45
        ? 'correct'
        : 'misplaced',
    })

    pair.guess.strokeIds.forEach(
      (id) => usedGuessStrokes.add(id)
    )

    pair.target.strokeIds.forEach(
      (id) => usedTargetStrokes.add(id)
    )
  }

  return results
}