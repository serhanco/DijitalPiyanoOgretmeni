// Ton çemberi on the profile: the twelve major keys around the circle of
// fifths, their relative minors inside, each filled as far as its stars go.

import type { KeyNode } from '../progress/keyCircle'
import { keyColor } from '../games/keys/units'

const SIZE = 300
const C = SIZE / 2
const OUTER = 118
const INNER = 72

/** Position on the circle: C at the top, then clockwise. Flats sit on the left as on printed circles. */
const SLOTS = [0, 1, 11, 2, 10, 3, 9, 4, 8, 5, 7, 6]

function point(slot: number, r: number) {
  const a = (slot / 12) * 2 * Math.PI - Math.PI / 2
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
}

export function KeyCircle({ nodes }: { nodes: KeyNode[] }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="key-circle" role="img" aria-label="Ton çemberi">
      <circle cx={C} cy={C} r={OUTER} className="key-circle-ring" />
      <circle cx={C} cy={C} r={INNER} className="key-circle-ring" />
      {nodes.map((n, i) => {
        const slot = SLOTS[i]
        const color = keyColor(i)
        return [
          { r: OUTER, size: 22, share: n.majorShare, label: n.major, kind: 'major' },
          { r: INNER, size: 16, share: n.minorShare, label: n.minor, kind: 'minor' },
        ].map((d) => {
          const { x, y } = point(slot, d.r)
          return (
            <g
              key={`${n.unit}-${d.kind}`}
              data-key={`${n.unit}-${d.kind}`}
              data-share={Math.round(d.share * 100)}
              aria-label={`${d.label} ${d.kind === 'major' ? 'Majör' : 'Minör'}: %${Math.round(d.share * 100)}`}
            >
              <circle cx={x} cy={y} r={d.size} className={n.open ? 'key-node' : 'key-node locked'} />
              {d.share > 0 && (
                <circle cx={x} cy={y} r={d.size * Math.sqrt(d.share)} fill={color} opacity={0.35 + 0.65 * d.share} />
              )}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                className={d.share >= 0.5 ? 'key-node-label filled' : 'key-node-label'}
                fontSize={d.kind === 'major' ? 11 : 10}
              >
                {d.label}
              </text>
              {d.kind === 'major' && n.boss && (
                <text x={x + d.size * 0.7} y={y - d.size * 0.6} fontSize={11}>
                  🏆
                </text>
              )}
            </g>
          )
        })
      })}
    </svg>
  )
}
