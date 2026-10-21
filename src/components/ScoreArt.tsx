// A few bars of an étude's score as a theory card's picture. Its own chunk:
// the score view brings VexFlow.

import { useMemo } from 'react'
import { ETUDE_PIECES } from '../games/etudes/catalog'
import { parseScore } from '../games/etudes/score'
import { ScoreView } from './ScoreView'

const STAVES = [0, 1]

export default function ScoreArt({ piece, bars }: { piece: string; bars: [number, number] }) {
  const score = useMemo(() => {
    const song = ETUDE_PIECES.find((p) => p.id === piece)
    return song?.score ? parseScore(song.score) : null
  }, [piece])
  if (!score) return null
  return (
    <div className="art art-score">
      <ScoreView score={score} bars={bars} staves={STAVES} current={-1} stateOf={() => 'todo'} version="art" />
    </div>
  )
}
