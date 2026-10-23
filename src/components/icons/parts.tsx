import { INK, line, PINK, PURPLE } from './palette'

// Pieces every character icon is built from: Notiş's eyes and cheeks, a smile, a note head.

/** Notiş's eye: white, a dark pupil looking slightly right, a glint. */
export function Eye({ x, y, r = 3.6 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" {...line} strokeWidth={1.4} />
      <circle cx={x + r * 0.2} cy={y + r * 0.1} r={r * 0.55} fill={INK} />
      <circle cx={x + r * 0.45} cy={y - r * 0.3} r={r * 0.2} fill="#fff" />
    </g>
  )
}

export function Cheek({ x, y }: { x: number; y: number }) {
  return <ellipse cx={x} cy={y} rx={2.4} ry={1.5} fill={PINK} opacity={0.85} />
}

export function Smile({ x, y, w = 4 }: { x: number; y: number; w?: number }) {
  return <path d={`M${x - w / 2} ${y} q${w / 2} ${w * 0.6} ${w} 0`} fill="none" {...line} strokeWidth={1.6} />
}

/** A note head tilted like printed music, filled and outlined. */
export function Head({
  x,
  y,
  fill = PURPLE,
  rx = 5.2,
  ry = 4,
}: {
  x: number
  y: number
  fill?: string
  rx?: number
  ry?: number
}) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(-20 ${x} ${y})`} fill={fill} {...line} />
}
