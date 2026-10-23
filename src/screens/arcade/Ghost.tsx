// Hayalet on the game screens: the chip shows the ghost's score at the same
// moment of its run next to the learner's (the hooks are in ghostHooks.ts).

import { type Ghost, ghostAt } from '../../progress/ghost'

/** "👻 14 · sen 12": the ghost's score at this point of its run, against the learner's. */
export function GhostChip({
  ghost,
  at,
  mine,
  unit = '',
  name,
}: {
  ghost: Ghost
  at: number
  mine: number
  unit?: string
  /** Hayalet düellosu: the friend whose ghost this is. */
  name?: string
}) {
  const theirs = ghostAt(ghost, at)
  const state = mine > theirs ? 'ahead' : mine < theirs ? 'behind' : 'level'
  return (
    <span
      className="ghost-chip"
      data-ghost={state}
      data-duel={name ? '' : undefined}
      title={
        name
          ? `Düello: ${name} bu oyunda ${ghost.score}${unit} yaptı. Onu geç!`
          : `Hayalet: en iyi turun (${ghost.score}${unit}). Onu geçmeye çalış!`
      }
    >
      👻 {name ? `${name} ` : ''}
      {theirs}
      {unit} · sen {mine}
      {unit}
    </span>
  )
}
