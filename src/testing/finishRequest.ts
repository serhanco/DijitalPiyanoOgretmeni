import { useEffect, useRef } from 'react'

// Test mode's "Dersi bitir": the lesson screen ends now with what was played so far.

type Listener = () => void
const listeners = new Set<Listener>()
let requested = false

/** Ask the running lesson to finish. Returns false when no lesson listens. */
export function requestFinish(): boolean {
  if (!listeners.size) return false
  requested = true
  ;[...listeners].forEach((l) => l())
  return true
}

/** True once for the summary that a test finish produced (App keeps it out of the progress). */
export function consumeFinishRequest(): boolean {
  const was = requested
  requested = false
  return was
}

export function onFinishRequest(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Lesson screens: `finish` builds the summary from what was played and calls onFinish. */
export function useFinishRequest(finish: () => void): void {
  const ref = useRef(finish)
  useEffect(() => {
    ref.current = finish
  })
  useEffect(() => onFinishRequest(() => ref.current()), [])
}
