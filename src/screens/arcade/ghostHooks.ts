// Hayalet on the game screens: the best run kept for this game races the
// learner; endless games record their own run second by second.

import { useCallback, useEffect, useRef, useState } from 'react'
import { gameNow } from '../../input/gameClock'
import { type Ghost, GHOST_MAX_POINTS, GHOST_STEP_MS } from '../../progress/ghost'
import { useProfile } from '../../state/profile'
import { duelFor } from '../../cloud/rival'

/** The ghost kept for this lesson (a friend's in a duel), read once when the game starts. */
export function useStoredGhost(lessonId: string, enabled: boolean): Ghost | null {
  const [ghost] = useState(() =>
    enabled ? (duelFor(lessonId)?.ghost ?? useProfile.getState().ghosts[lessonId] ?? null) : null,
  )
  return ghost
}

/** In a duel, the friend's name for the ghost chip. */
export function useDuelName(lessonId: string): string | undefined {
  const [name] = useState(() => duelFor(lessonId)?.name)
  return name
}

/**
 * Endless games: the score after every second of play (game time, so a pause
 * does not count). `run()` is the run so far; `second` re-renders the chip.
 */
export function useSecondTrace(score: () => number, enabled: boolean) {
  const points = useRef<number[]>([])
  const [second, setSecond] = useState(0)
  const scoreRef = useRef(score)
  useEffect(() => {
    scoreRef.current = score
  })
  useEffect(() => {
    if (!enabled) return
    const start = gameNow()
    const t = window.setInterval(() => {
      const due = Math.min(GHOST_MAX_POINTS, Math.floor((gameNow() - start) / GHOST_STEP_MS))
      if (points.current.length >= due) return
      while (points.current.length < due) points.current.push(scoreRef.current())
      setSecond(due)
    }, 200)
    return () => clearInterval(t)
  }, [enabled])
  const run = useCallback((): Ghost => {
    const final = scoreRef.current()
    return { by: 'second', points: [...points.current, final].slice(0, GHOST_MAX_POINTS), score: final }
  }, [])
  return { second, run }
}
