// Hayalet düellosu (phase 17): a friend's best run in a Salon game races the
// learner instead of their own ghost. Set when the duel starts, read by the
// game and the results, cleared when another game starts.

import type { Ghost } from '../progress/ghost'

export interface Duel {
  lessonId: string
  friendId: string
  name: string
  best: number
  ghost: Ghost | null
}

let duel: Duel | null = null

export const setDuel = (d: Duel | null) => {
  duel = d
}

/** The duel of this game, if one was started for it. */
export const duelFor = (lessonId: string): Duel | null => (duel?.lessonId === lessonId ? duel : null)
