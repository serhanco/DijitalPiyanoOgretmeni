// Whether the opening animation (Intro.tsx) plays.

/** Browser scripts set this key to 'off' so tests start on the map. */
export const INTRO_KEY = 'dpo-intro'
/** Shown on every start, unless motion is reduced or a script turned it off. */
export function introWanted(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return localStorage.getItem(INTRO_KEY) !== 'off'
  } catch {
    return true
  }
}
