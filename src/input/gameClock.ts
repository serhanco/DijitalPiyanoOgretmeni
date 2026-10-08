// The clock every game keeps time with: performance.now() minus the time spent
// paused (test notes pause the game). Input events are converted to it in the
// input bus, so engines never see a pause.

type Listener = (paused: boolean) => void

let pausedTotal = 0
let pausedAt: number | null = null
const listeners = new Set<Listener>()

interface Timer {
  fn: () => void
  due: number // game time
  handle: number | null
}
const timers = new Set<Timer>()

/** Game time in milliseconds; frozen while paused. */
export function gameNow(): number {
  return (pausedAt ?? performance.now()) - pausedTotal
}

/** A performance.now() time (e.g. a MIDI event's timestamp) on the game clock. */
export function toGameTime(t: number): number {
  return t - pausedTotal
}

export const isPaused = () => pausedAt !== null

export function onPauseChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function arm(t: Timer) {
  t.handle = window.setTimeout(
    () => {
      timers.delete(t)
      t.fn()
    },
    Math.max(0, t.due - gameNow()),
  )
}

/** setTimeout on the game clock: it waits out pauses. Returns a cancel function. */
export function gameTimeout(fn: () => void, ms: number): () => void {
  const t: Timer = { fn, due: gameNow() + Math.max(0, ms), handle: null }
  timers.add(t)
  if (!isPaused()) arm(t)
  return () => {
    if (t.handle !== null) clearTimeout(t.handle)
    timers.delete(t)
  }
}

export function pauseGame(): void {
  if (pausedAt !== null) return
  pausedAt = performance.now()
  for (const t of timers) {
    if (t.handle !== null) clearTimeout(t.handle)
    t.handle = null
  }
  listeners.forEach((l) => l(true))
}

export function resumeGame(): void {
  if (pausedAt === null) return
  pausedTotal += performance.now() - pausedAt
  pausedAt = null
  for (const t of timers) arm(t)
  listeners.forEach((l) => l(false))
}
