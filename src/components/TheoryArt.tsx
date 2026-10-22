// Static pictures for the theory lessons: a keyboard, a treble staff, a hand
// with finger numbers and the note durations. Plain SVG, scaled by CSS; an
// étude's bars come from the score view in their own chunk.

import { lazy, Suspense } from 'react'
import type { Illustration } from '../games/theory/quiz'
import { isRest, layoutRhythm, parseRhythm, VALUE_BEATS } from '../rhythm/rhythm'
import { diatonicIndex, isBlackKey, type Letter, LETTERS, MIDDLE_C, parseNote, solfegeName } from '../music/notes'

const ScoreArt = lazy(() => import('./ScoreArt'))

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
          // Right hand: thumb on middle C. Left hand: little finger on the C below.
          const m = (fingers === 'left' ? MIDDLE_C - 12 : MIDDLE_C) + offset
          if (!whites.includes(m)) return null
          return (
            <g key={m}>
              <circle cx={xOfWhite(m) + W / 2} cy={13} r={10} fill="#ff9600" />
              <text x={xOfWhite(m) + W / 2} y={17.5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">
                {fingers === 'left' ? 5 - i : i + 1}
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

/** Bottom line and the clef glyph (SMuFL, Bravura) with the step it sits on. */
const CLEFS = {
  treble: { bottom: diatonicIndex(parseNote('E4')), glyph: '\uE050', step: 2 },
  bass: { bottom: diatonicIndex(parseNote('G2')), glyph: '\uE062', step: 6 },
}

/** Where the sharps and flats of a key signature sit, in order (treble; the bass staff is two octaves lower). */
const SHARP_ORDER = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4']
const FLAT_ORDER = ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4']
/** SMuFL accidentals: double flat, flat, natural, sharp, double sharp. */
const ACC_GLYPHS: Record<number, string> = { [-2]: '\uE264', [-1]: '\uE260', 0: '\uE261', 1: '\uE262', 2: '\uE263' }

/** The accidental a key signature of `count` sharps (or flats, below 0) gives each letter. */
function signatureAcc(count: number): Record<Letter, number> {
  const out = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>
  const order = count > 0 ? SHARP_ORDER : FLAT_ORDER
  for (const name of order.slice(0, Math.abs(count))) out[name[0].toLowerCase() as Letter] = Math.sign(count)
  return out
}

function StaffArt({
  notes = [],
  names,
  captions,
  numbers,
  clef = true,
  bass = false,
  highlight,
  keySig = 0,
  spelled,
}: Extract<Illustration, { kind: 'staff' }>) {
  const gap = 10
  const kind = CLEFS[bass ? 'bass' : 'treble']
  const base = 84 // y of the bottom line
  const sigW = Math.abs(keySig) * 9
  const left = (clef ? 58 : 34) + sigW
  const heads = spelled
    ? spelled.map((n) => ({ index: (n.octave + 1) * 7 + LETTERS.indexOf(n.letter), acc: n.acc, midi: null }))
    : notes.map((m) => ({ index: diatonicIndex(m), acc: null, midi: m }))
  const keyAcc = signatureAcc(keySig)
  const spacing = heads.length > 4 ? 30 : 46
  const width = Math.max(220, left + heads.length * spacing + 20)
  const y = (step: number) => base - (step * gap) / 2
  const below = names || captions ? (names && captions ? 140 : 124) : 104
  const sigSteps = (keySig > 0 ? SHARP_ORDER : FLAT_ORDER)
    .slice(0, Math.abs(keySig))
    .map((name) => diatonicIndex(parseNote(name)) - (bass ? 14 : 0) - kind.bottom)
  return (
    <svg
      viewBox={`0 0 ${width} ${below}`}
      className="art art-staff"
      role="img"
      aria-label={bass ? 'Fa anahtarlı porte' : 'Porte'}
    >
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
        <text x={10} y={y(kind.step)} fontSize={gap * 4} fontFamily="Bravura" fill={INK}>
          {kind.glyph}
        </text>
      )}
      {sigSteps.map((step, i) => (
        <text
          key={`sig${i}`}
          className="key-sig"
          x={(clef ? 50 : 26) + i * 9}
          y={y(step)}
          fontSize={gap * 4}
          fontFamily="Bravura"
          fill={INK}
        >
          {ACC_GLYPHS[Math.sign(keySig)]}
        </text>
      ))}
      {heads.map((h, i) => {
        const step = h.index - kind.bottom
        const x = left + i * spacing + spacing / 2
        const ledgers: number[] = []
        for (let s = -2; s >= step; s -= 2) ledgers.push(s)
        for (let s = 10; s <= step; s += 2) ledgers.push(s)
        const letter = LETTERS[h.index % 7]
        const accidental = h.acc !== null && h.acc !== keyAcc[letter] ? ACC_GLYPHS[h.acc] : null
        return (
          <g key={`${h.index}-${i}`}>
            {ledgers.map((s) => (
              <line key={s} x1={x - 12} x2={x + 12} y1={y(s)} y2={y(s)} stroke={INK} strokeWidth={1.3} />
            ))}
            {accidental && (
              <text x={x - 22} y={y(step)} fontSize={gap * 4} fontFamily="Bravura" fill={INK}>
                {accidental}
              </text>
            )}
            <NoteHead x={x} y={y(step)} />
            {names && h.midi !== null && (
              <text x={x} y={110} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>
                {solfegeName(h.midi, false)}
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

const BEAT_W = 44

/** One quarter rest, drawn as the usual zigzag. */
function QuarterRest({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 3} ${y - 18} l7 9 l-6 7 l7 9 c-6 -3 -10 0 -6 6`}
      fill="none"
      stroke={INK}
      strokeWidth={2.6}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  )
}

/** A rhythm pattern on one line with its count underneath: bold where a note starts, grey where it is held or silent. */
function RhythmArt({ pattern, beatsPerBar = 4 }: Extract<Illustration, { kind: 'rhythm' }>) {
  const events = layoutRhythm(parseRhythm(pattern), beatsPerBar)
  const bars = Math.max(1, ...events.map((e) => e.bar + 1))
  const total = bars * beatsPerBar
  const width = total * BEAT_W + 16
  const lineY = 52
  const xOf = (beat: number) => 22 + beat * BEAT_W
  const starts = new Set(events.filter((e) => !isRest(e.value)).map((e) => e.beat))
  const rests = events.filter((e) => isRest(e.value))
  const silent = (b: number) => rests.some((r) => b >= r.beat && b < r.beat + VALUE_BEATS[r.value])
  return (
    <svg viewBox={`0 0 ${width} 112`} className="art art-rhythm" role="img" aria-label={`Ritim: ${pattern}`}>
      <line x1={4} y1={lineY} x2={width - 4} y2={lineY} stroke="#b9b9b9" strokeWidth={1.5} />
      {Array.from({ length: bars - 1 }, (_, i) => (
        <line
          key={i}
          x1={xOf((i + 1) * beatsPerBar) - BEAT_W / 2 + 4}
          x2={xOf((i + 1) * beatsPerBar) - BEAT_W / 2 + 4}
          y1={lineY - 22}
          y2={lineY + 22}
          stroke={INK}
          strokeWidth={1.5}
        />
      ))}
      {events.map((e, i) => {
        const x = xOf(e.beat)
        if (isRest(e.value)) return <QuarterRest key={i} x={x} y={lineY} />
        const filled = !['w', 'h', 'hd'].includes(e.value)
        const eighth = e.value === 'e'
        // Eighths in pairs share a beam; a lone one (after a dotted quarter) gets a flag.
        const partner = eighth ? events[i + (e.beat % 1 === 0 ? 1 : -1)] : undefined
        const paired = partner?.value === 'e' && Math.floor(partner.beat) === Math.floor(e.beat)
        return (
          <g key={i}>
            <NoteHead x={x} y={lineY} filled={filled} stem={e.value !== 'w'} />
            {(e.value === 'qd' || e.value === 'hd') && <circle cx={x + 13} cy={lineY - 2} r={2.4} fill={INK} />}
            {eighth && paired && e.beat % 1 === 0 && (
              <rect x={x + 5.8} y={lineY - 35} width={BEAT_W / 2 + 1.6} height={5} fill={INK} />
            )}
            {eighth && !paired && (
              <path d={`M${x + 6.6} ${lineY - 34} q4 8 10 12 q-2 -6 -10 -6`} fill={INK} stroke={INK} strokeWidth={1} />
            )}
          </g>
        )
      })}
      {Array.from({ length: total }, (_, b) => {
        const x = xOf(b)
        const on = starts.has(b)
        return (
          <g key={b}>
            <text
              x={x}
              y={88}
              textAnchor="middle"
              fontSize={14}
              fontWeight={on ? 800 : 600}
              fill={on ? '#a560e8' : silent(b) ? '#c4c4c4' : '#9a9a9a'}
            >
              {silent(b) ? `(${(b % beatsPerBar) + 1})` : (b % beatsPerBar) + 1}
            </text>
            {starts.has(b + 0.5) && (
              <text x={x + BEAT_W / 2} y={88} textAnchor="middle" fontSize={12} fontWeight={800} fill="#a560e8">
                ve
              </text>
            )}
          </g>
        )
      })}
      {rests.length > 0 && (
        <text x={width / 2} y={106} textAnchor="middle" fontSize={10} fill="#999">
          (parantezli vuruşta sus)
        </text>
      )}
    </svg>
  )
}

const FALL_COLOUR = { right: '#5b8def', left: '#f06fa4' }

/** Coloured bars falling onto the keys, each as long as its note lasts, and the yellow line where they are played. */
function WaterfallArt({ low, high, notes, left }: Extract<Illustration, { kind: 'waterfall' }>) {
  const W = 30
  const KEY_H = 70
  const BEAT = 34
  const whites: number[] = []
  for (let m = low; m <= high; m++) if (!isBlackKey(m)) whites.push(m)
  const parse = (text: string | undefined, hand: 'right' | 'left') => {
    let beat = 0
    return (text ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((token) => {
        const [pitch, value] = token.split('/') as [string, keyof typeof VALUE_BEATS]
        const at = beat
        beat += VALUE_BEATS[value]
        return pitch === 'r' ? [] : [{ midi: parseNote(pitch), beat: at, beats: VALUE_BEATS[value], hand }]
      })
  }
  const bars = [...parse(notes, 'right'), ...parse(left, 'left')]
  const beats = Math.max(...bars.map((b) => b.beat + b.beats))
  const fallH = beats * BEAT + 8
  const width = whites.length * W
  return (
    <svg
      viewBox={`-2 0 ${width + 4} ${fallH + KEY_H + 4}`}
      className="art art-waterfall"
      role="img"
      aria-label="Nota şelalesi"
    >
      <rect x={0} y={0} width={width} height={fallH} rx={6} fill="#24213d" />
      {bars.map((b, i) => {
        const x = whites.indexOf(b.midi) * W
        const bottom = fallH - b.beat * BEAT
        return (
          <g key={i}>
            <rect
              x={x + 3}
              y={bottom - b.beats * BEAT + 3}
              width={W - 6}
              height={b.beats * BEAT - 4}
              rx={5}
              fill={FALL_COLOUR[b.hand]}
            />
            <text x={x + W / 2} y={bottom - 6} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">
              {solfegeName(b.midi, false)}
            </text>
          </g>
        )
      })}
      <rect x={0} y={fallH - 3} width={width} height={4} fill={ACCENT} />
      {whites.map((m) => (
        <rect
          key={m}
          x={whites.indexOf(m) * W}
          y={fallH + 2}
          width={W}
          height={KEY_H}
          rx={4}
          fill="#fff"
          stroke="#b9b9b9"
          strokeWidth={1.5}
        />
      ))}
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
    case 'rhythm':
      return <RhythmArt {...art} />
    case 'waterfall':
      return <WaterfallArt {...art} />
    case 'score':
      return (
        <Suspense fallback={null}>
          <ScoreArt piece={art.piece} bars={art.bars} />
        </Suspense>
      )
  }
}
