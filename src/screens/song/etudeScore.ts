// The score of an étude lesson, read once for the score view.

import { useMemo } from 'react'
import { type ParsedScore, parseScore } from '../../games/etudes/score'
import type { SongSpec } from '../../games/songs/song'

export interface EtudeScore {
  score: ParsedScore
  /** The bars the lesson plays, in the score's numbering. */
  bars: [number, number]
  /** 0 the right hand's staff, 1 the left's. */
  staves: number[]
}

const STAVES: Record<SongSpec['hands'], number[]> = { right: [0], left: [1], both: [0, 1] }

/** The score of an étude lesson; null for a song. */
export function useEtudeScore(spec: SongSpec): EtudeScore | null {
  const source = spec.songs.length === 1 ? spec.songs[0].score : undefined
  return useMemo(() => {
    if (!source) return null
    const score = parseScore(source)
    return { score, bars: spec.bars ?? [0, score.bars.length - 1], staves: STAVES[spec.hands] }
  }, [source, spec.bars, spec.hands])
}
