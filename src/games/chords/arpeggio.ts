// Arpeggio lessons: chord notes one after the other, up and back down, with
// fingers and crossings. As melody steps (read from the staff at the
// player's pace) and as the timed plan of Arpej Sörfü (one note per beat in
// 3/4, the top of each wave held). Pure.

import { arpeggioRun, chordKeySignature, chordName, type ChordQuality } from '../../music/chords'
import { type Clef, type Hand, pitchClass } from '../../music/notes'
import { keyAccidentals, parseTonic, spelledName } from '../../music/scales'
import type { RhythmValue } from '../../rhythm/rhythm'
import type { SkillProvider, SkillTarget } from '../arcade/skill'
import type { Step } from '../melody/session'
import type { LadderMeta } from '../scales/steps'

export interface ArpeggioPart {
  /** "C", "Am" is written root "A" with quality "minor". */
  root: string
  quality: Extract<ChordQuality, 'major' | 'minor'>
  hands: 'right' | 'left' | 'parallel'
  octaves?: 1 | 2
}

const HANDS_TITLES = { right: 'sağ el', left: 'sol el', parallel: 'iki el' }

/** "Do Majör arpej · sağ el · 2 oktav". */
export function arpeggioTitle(part: ArpeggioPart): string {
  const octaves = part.octaves === 2 ? ' · 2 oktav' : ''
  return `${chordName(parseTonic(part.root), part.quality)} arpej · ${HANDS_TITLES[part.hands]}${octaves}`
}

/** Notes in a part: up and back down, 7 for one octave, 13 for two. */
export const arpeggioLength = (part: ArpeggioPart) => 6 * (part.octaves ?? 1) + 1

const handsOf = (h: ArpeggioPart['hands']): Hand[] => (h === 'parallel' ? ['right', 'left'] : [h])

/** Octave of the root a hand starts on: the right hand from the 4th octave, the left one or two lower. */
function startOctave(root: string, hand: Hand, octaves: number): number {
  const high = /^[GAB]/i.test(root)
  if (hand === 'right') return octaves === 2 && high ? 3 : 4
  return octaves === 2 ? 2 : high ? 2 : 3
}

export function arpeggioSteps(parts: ArpeggioPart[]): Step[] {
  return parts.flatMap((part, p) => {
    const tonic = parseTonic(part.root)
    const octaves = part.octaves ?? 1
    const keySig = chordKeySignature(tonic, part.quality)
    const keyAcc = keyAccidentals(tonic, part.quality === 'major' ? 'major' : 'natural')
    const runs = handsOf(part.hands).map((hand) => ({
      hand,
      run: arpeggioRun(tonic, part.quality, hand, startOctave(part.root, hand, octaves), octaves),
    }))
    const top = 3 * octaves
    return Array.from({ length: arpeggioLength(part) }, (_, i) => ({
      melody: p,
      keySig,
      keyAcc,
      // Two octaves: the way down starts a new page.
      ...(octaves === 2 && i === top + 1 && { newPage: true }),
      notes: runs.map(({ hand, run }) => ({
        midi: run[i].midi,
        clef: (hand === 'right' ? 'treble' : 'bass') as Clef,
        spelled: run[i],
        finger: run[i].finger,
        cross: run[i].cross,
      })),
    }))
  })
}

export interface SurfPlan {
  steps: Step[]
  bars: RhythmValue[][]
  skill: SkillProvider
  meta: LadderMeta[]
}

/** Beats in a 3/4 bar: Arpej Sörfü rides in waltz time. */
export const SURF_BEATS_PER_BAR = 3

/** Beats a part takes: one per note, the last (back on the root) held for a dotted half. */
export const surfPartBeats = (part: ArpeggioPart) => arpeggioLength(part) - 1 + 3

/** Arpeggios on the metronome: one note per beat in 3/4; with both hands, both notes on the same beat. */
export function surfPlan(parts: ArpeggioPart[], ignoreOctave = false): SurfPlan {
  const steps = arpeggioSteps(parts)
  const targets: SkillTarget[] = []
  const meta: LadderMeta[] = []
  const starts: number[] = []
  parts.reduce((beat, part) => {
    starts.push(beat)
    return beat + surfPartBeats(part)
  }, 0)
  let inPart = 0
  steps.forEach((s, i) => {
    inPart = i > 0 && steps[i - 1].melody === s.melody ? inPart + 1 : 0
    const last = inPart === arpeggioLength(parts[s.melody]) - 1
    for (const n of s.notes) {
      targets.push({ midi: n.midi, beat: starts[s.melody] + inPart, value: last ? 'hd' : 'q', clef: n.clef })
      meta.push({
        part: s.melody,
        step: inPart,
        clef: n.clef,
        finger: n.finger ?? 0,
        cross: n.cross ?? null,
        name: n.spelled ? spelledName(n.spelled, false) : '',
      })
    }
  })
  const bars = parts.flatMap((part) => [
    ...Array.from({ length: (arpeggioLength(part) - 1) / SURF_BEATS_PER_BAR }, () => ['q', 'q', 'q'] as RhythmValue[]),
    ['hd'] as RhythmValue[],
  ])
  return {
    steps,
    bars,
    meta,
    skill: {
      clef: 'treble',
      range: [...new Set(targets.map((t) => t.midi))].sort((a, b) => a - b),
      targets,
      matches: (t, pressed) => (ignoreOctave ? pitchClass(t.midi) === pitchClass(pressed) : t.midi === pressed),
    },
  }
}
