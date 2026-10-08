// Static pictures for the theory lessons: a keyboard, a treble staff, a hand
// with finger numbers and the note durations. Plain SVG, scaled by CSS.

import type { Illustration } from '../games/theory/quiz'
import { diatonicIndex, isBlackKey, MIDDLE_C, parseNote, solfegeName } from '../music/notes'

const ACCENT = '#ffc800'
const ACCENT_DARK = '#e0a000'
const INK = '#3c3c3c'

function KeyboardArt({ low, high, marks = [], groups, labels, fingers }: Extract<Illustration, { kind: 'keyboard' }>) {
  const W = 30
  const H = 110
  const top = groups || fingers ? 26 : 4
  const whites: number[] = []
  for (let m = low; m <= high; m++) if (!isBlackKey(m)) whites.push(m)
  const xOfWhite = (m: number) => whites.indexOf(m) * W
  const blacks: number[] = []
  for (let m = low; m <= high; m++) if (isBlackKey(m) && m - 1 >= low) blacks.push(m)
  const xOfBlack = (m: number) => xOfWhite(m - 1) + W - 9
  // Runs of neighbouring black keys: the groups of two and three.
  const runs: number[][] = []
  for (const b of blacks) {
    const last = runs[runs.length - 1]
    if (last && b - last[last.length - 1] === 2) last.push(b)
    else runs.push([b])
  }
  const width = whites.length * W
  return (
    <svg
      viewBox={`-2 0 ${width + 4} ${H + top + 4}`}
      className="art art-keyboard"
      role="img"
      aria-label="Piyano klavyesi"
    >
      {whites.map((m) => (
        <g key={m}>
          <rect
            x={xOfWhite(m)}
            y={top}
            width={W}
            height={H}
            rx={4}
            fill={marks.includes(m) ? ACCENT : '#fff'}
            stroke="#b9b9b9"
            strokeWidth={1.5}
          />
          {labels && (
            <text
              x={xOfWhite(m) + W / 2}
              y={top + H - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill={INK}
            >
              {solfegeName(m, false)}
            </text>
          )}
        </g>
      ))}
      {blacks.map((m) => (
        <rect
          key={m}
          x={xOfBlack(m)}
          y={top}
          width={18}
          height={68}
          rx={3}
          fill={marks.includes(m) ? ACCENT_DARK : '#2b2b2b'}
        />
      ))}
      {groups &&
        runs.map((run) => {
          const x1 = xOfBlack(run[0]) + 2
          const x2 = xOfBlack(run[run.length - 1]) + 16
          return (
            <g key={run[0]} stroke="#1cb0f6" strokeWidth={2} fill="none">
              <path d={`M${x1} ${top - 4} V${top - 10} H${x2} V${top - 4}`} />
              <text
                x={(x1 + x2) / 2}
                y={top - 13}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                fill="#1cb0f6"
                stroke="none"
              >
                {run.length}
              </text>
            </g>
          )
        })}
      {fingers &&
        [0, 2, 4, 5, 7].map((offset, i) => {
          const m = MIDDLE_C + offset
          if (!whites.includes(m)) return null
          return (
            <g key={m}>
              <circle cx={xOfWhite(m) + W / 2} cy={13} r={10} fill="#ff9600" />
              <text x={xOfWhite(m) + W / 2} y={17.5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">
                {i + 1}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

/** Hollow (whole, half) or filled (quarter) note head, optionally with a stem up. */
function NoteHead({
  x,
  y,
  filled = false,
  stem = false,
  color = INK,
}: {
  x: number
  y: number
  filled?: boolean
  stem?: boolean
  color?: string
}) {
  return (
    <g>
      <ellipse
        cx={x}
        cy={y}
        rx={7.5}
        ry={5.2}
        transform={`rotate(-22 ${x} ${y})`}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 1 : 2.4}
      />
      {stem && <line x1={x + 6.6} y1={y - 1} x2={x + 6.6} y2={y - 34} stroke={color} strokeWidth={1.6} />}
    </g>
  )
}

const BOTTOM_LINE = diatonicIndex(parseNote('E4'))

function StaffArt({
  notes = [],
  names,
  captions,
  numbers,
  clef = true,
  highlight,
}: Extract<Illustration, { kind: 'staff' }>) {
  const gap = 10
  const base = 84 // y of the bottom line
  const left = clef ? 58 : 34
  const spacing = notes.length > 4 ? 30 : 46
  const width = Math.max(220, left + notes.length * spacing + 20)
  const y = (step: number) => base - (step * gap) / 2
  const below = names || captions ? (names && captions ? 140 : 124) : 104
  return (
    <svg viewBox={`0 0 ${width} ${below}`} className="art art-staff" role="img" aria-label="Porte">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={numbers ? 22 : 6}
          x2={width - 6}
          y1={y(i * 2)}
          y2={y(i * 2)}
          stroke={highlight === i + 1 ? '#ff9600' : INK}
          strokeWidth={highlight === i + 1 ? 3 : 1.3}
        />
      ))}
      {numbers &&
        [0, 1, 2, 3, 4].map((i) => (
          <text key={i} x={8} y={y(i * 2) + 4} fontSize={11} fontWeight={800} fill="#1cb0f6">
            {i + 1}
          </text>
        ))}
      {clef && (
        <text x={10} y={y(2)} fontSize={gap * 4} fontFamily="Bravura" fill={INK}>
          {''}
        </text>
      )}
      {notes.map((m, i) => {
        const step = diatonicIndex(m) - BOTTOM_LINE
        const x = left + i * spacing + spacing / 2
        const ledgers: number[] = []
        for (let s = -2; s >= step; s -= 2) ledgers.push(s)
        for (let s = 10; s <= step; s += 2) ledgers.push(s)
        return (
          <g key={`${m}-${i}`}>
            {ledgers.map((s) => (
              <line key={s} x1={x - 12} x2={x + 12} y1={y(s)} y2={y(s)} stroke={INK} strokeWidth={1.3} />
            ))}
            <NoteHead x={x} y={y(step)} />
            {names && (
              <text x={x} y={110} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>
                {solfegeName(m, false)}
              </text>
            )}
            {captions?.[i] && (
              <text x={x} y={names ? 126 : 110} textAnchor="middle" fontSize={10} fill="#777">
                {captions[i]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Fingers of a right hand seen from above: centre x, tip y, width. The thumb is drawn apart. */
const FINGERS = [
  { x: 74, tip: 38, w: 22 },
  { x: 100, tip: 24, w: 23 },
  { x: 126, tip: 34, w: 22 },
  { x: 150, tip: 58, w: 19 },
]

function HandArt({ hand, highlight, hideNumbers }: Extract<Illustration, { kind: 'hand' }>) {
  // The left hand is the mirror image: the thumb on the right.
  const mx = (x: number) => (hand === 'right' ? x : 200 - x)
  const fill = (finger: number) => (highlight === finger ? ACCENT : '#ffd9b8')
  const label = (finger: number, x: number, yTip: number) => (
    <g key={`n${finger}`}>
      <circle cx={x} cy={yTip + 13} r={10} fill={highlight === finger ? '#ff9600' : '#fff'} stroke="#d9a47a" />
      <text
        x={x}
        y={yTip + 17.5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={800}
        fill={highlight === finger ? '#fff' : INK}
      >
        {hideNumbers ? (highlight === finger ? '?' : '') : finger}
      </text>
    </g>
  )
  // The thumb grows out of the palm's lower corner, tilted outwards.
  const thumb = { x: mx(66), y: 100 }
  return (
    <svg viewBox="0 0 200 200" className="art art-hand" role="img" aria-label={hand === 'right' ? 'Sağ el' : 'Sol el'}>
      <g stroke="#d9a47a" strokeWidth={2}>
        <rect
          x={thumb.x - 12}
          y={thumb.y}
          width={24}
          height={70}
          rx={12}
          fill={fill(1)}
          transform={`rotate(${hand === 'right' ? -40 : 40} ${thumb.x} ${thumb.y + 65})`}
        />
        {FINGERS.map((f, i) => (
          <rect
            key={i}
            x={mx(f.x) - f.w / 2}
            y={f.tip}
            width={f.w}
            height={130 - f.tip}
            rx={f.w / 2}
            fill={fill(i + 2)}
          />
        ))}
        <rect x={hand === 'right' ? 62 : 38} y={104} width={100} height={84} rx={32} fill="#ffd9b8" />
      </g>
      {label(1, mx(28), 104)}
      {FINGERS.map((f, i) => label(i + 2, mx(f.x), f.tip))}
      <text x={100} y={160} textAnchor="middle" fontSize={13} fontWeight={800} fill="#a0663a">
        {hand === 'right' ? 'Sağ el' : 'Sol el'}
      </text>
    </svg>
  )
}

function DurationsArt({ beats }: Extract<Illustration, { kind: 'durations' }>) {
  const items = [
    { label: 'Birlik', beats: 4, filled: false, stem: false },
    { label: 'İkilik', beats: 2, filled: false, stem: true },
    { label: 'Dörtlük', beats: 1, filled: true, stem: true },
  ]
  return (
    <svg viewBox="0 0 270 110" className="art art-durations" role="img" aria-label="Nota süreleri">
      {items.map((it, i) => {
        const x = 45 + i * 90
        return (
          <g key={it.label}>
            <NoteHead x={x} y={50} filled={it.filled} stem={it.stem} />
            <text x={x} y={76} textAnchor="middle" fontSize={13} fontWeight={800} fill={INK}>
              {it.label}
            </text>
            {beats && (
              <>
                {Array.from({ length: it.beats }, (_, b) => (
                  <circle key={b} cx={x - (it.beats - 1) * 6 + b * 12} cy={90} r={4} fill="#ce82ff" />
                ))}
                <text x={x} y={106} textAnchor="middle" fontSize={10} fill="#777">
                  {it.beats} vuruş
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function TheoryArt({ art }: { art: Illustration }) {
  switch (art.kind) {
    case 'keyboard':
      return <KeyboardArt {...art} />
    case 'staff':
      return <StaffArt {...art} />
    case 'hand':
      return <HandArt {...art} />
    case 'durations':
      return <DurationsArt {...art} />
  }
}
