// Balloon passengers: when a balloon pops, its passenger floats down on a
// parachute and joins the rescued ones standing on the grass. Pure: the scene
// feeds time and reads positions.

export interface Chute {
  index: number
  x: number
  y: number
  color: number
  kind: number
  /** Seconds in the air. */
  age: number
  /** Canvas-height fractions: where the grass starts (landing height). */
  landed: boolean
}

/** Seconds a parachute takes to come down a full screen height. */
export const FALL_S = 3.2

/** Starts a parachute at a popped balloon (positions are fractions of the width and height). */
export const startChute = (index: number, x: number, y: number, color: number): Chute => ({
  index,
  x,
  y,
  color,
  kind: index,
  age: 0,
  landed: false,
})

/** Moves a parachute on; it lands when it reaches `groundY`. */
export function stepChute(c: Chute, dtS: number, groundY: number): Chute {
  if (c.landed) return c
  const y = c.y + (dtS / FALL_S) * 0.9
  return y >= groundY ? { ...c, y: groundY, age: c.age + dtS, landed: true } : { ...c, y, age: c.age + dtS }
}

/** Sideways sway of a hanging parachute, in fractions of its radius. */
export const sway = (age: number) => Math.sin(age * 3.2) * 0.35

/** How far into the "help!" zone a balloon is (0 at the edge, 1 at the very top); 0 below it. */
export function danger(y: number, zone = 0.3): number {
  return y >= zone ? 0 : Math.min(1, (zone - y) / zone)
}

/** Where the n-th rescued passenger stands on the grass: x as a fraction of the width. */
export function standX(n: number, total: number, perRow = 10): number {
  const slots = Math.max(total, 1)
  const gap = Math.min(0.09, 0.9 / Math.min(slots, perRow + 1))
  return 0.06 + (n % Math.max(perRow, 1)) * gap
}
