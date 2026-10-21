// The études' play area: the written score (ScoreView) instead of the falling
// notes, in both Nota Şelalesi modes, and the button that switches between
// the two views.

import { type RefObject, useEffect, useMemo, useState } from 'react'
import { type ScoreNoteState, ScoreView } from '../../components/ScoreView'
import type { ParsedSong, SongNote } from '../../games/songs/song'
import type { WaitSession } from '../../games/songs/wait'
import { gameNow } from '../../input/gameClock'
import { onTime } from '../../rhythm/timing'
import type { BeatTrack } from '../../rhythm/track'
import { useSettings } from '../../state/settings'
import type { EtudeScore } from './etudeScore'

/** Nota or Şelale: an étude can be read from the score or played from the falling notes. */
export function ViewToggle() {
  const { etudeView, set } = useSettings()
  const score = etudeView === 'score'
  return (
    <button
      className="chip view-toggle"
      data-view={etudeView}
      onClick={() => set({ etudeView: score ? 'waterfall' : 'score' })}
      aria-label={score ? 'Düşen notalara geç' : 'Notaya geç'}
    >
      {score ? '🌊 Şelale' : '🎼 Nota'}
    </button>
  )
}

const byRef = (notes: SongNote[]) => new Map(notes.map((x, i) => [x.ref!, i]))

/** Bekleyen mod on the score: the waiting step is blue, played steps green (orange after a mistake). */
export function WaitScore({
  etude,
  song,
  session,
  wrong,
}: {
  etude: EtudeScore
  song: ParsedSong
  session: WaitSession | null
  wrong: boolean
}) {
  const index = useMemo(() => byRef(song.notes), [song])
  const stepOf = useMemo(() => {
    const m = new Map<SongNote, number>()
    session?.steps.forEach((s, i) => s.notes.forEach((x) => m.set(x, i)))
    return m
  }, [session])
  const step = session?.step ?? null
  const mistakes = new Set(session?.records.filter((r) => r.wrong.length).map((r) => r.step) ?? [])
  const stateOf = (head: number): ScoreNoteState => {
    const i = index.get(head)
    if (i === undefined || !session) return 'todo'
    const note = song.notes[i]
    if (!step) return 'done'
    if (note.beat === step.beat) {
      if (session.held.includes(note.midi)) return 'done'
      return wrong ? 'wrong' : 'current'
    }
    if (note.beat > step.beat) return 'todo'
    return mistakes.has(stepOf.get(note) ?? -1) ? 'off' : 'done'
  }
  const bar = (step?.notes[0].bar ?? 0) + etude.bars[0]
  const version = `${session?.index ?? -1}/${session?.records.length ?? 0}/${session?.held.length ?? 0}/${wrong}`
  return <ScoreField etude={etude} current={bar} stateOf={stateOf} version={version} />
}

/** Ritimli mod on the score: notes turn green on the beat, orange off it, red when missed. */
export function TempoScore({
  etude,
  song,
  trackRef,
}: {
  etude: EtudeScore
  song: ParsedSong
  trackRef: RefObject<BeatTrack | null>
}) {
  const index = useMemo(() => byRef(song.notes), [song])
  // The track lives in a ref and changes every frame: look at it each frame, redraw when a note
  // settles or the beat moves on by half.
  const [view, setView] = useState<{ track: BeatTrack | null; beat: number; version: string }>({
    track: null,
    beat: -1,
    version: '',
  })
  useEffect(() => {
    let frame = 0
    const tick = () => {
      const track = trackRef.current
      const beat = track ? track.beatAt(gameNow()) : -1
      const settled = track?.records.filter((r) => r.judgement !== null).length ?? 0
      const version = `${track ? 1 : 0}/${settled}/${Math.floor(beat * 2)}`
      setView((v) => (v.version === version ? v : { track, beat, version }))
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [trackRef])
  const { track, beat, version } = view
  const records = track?.records ?? []
  const stateOf = (head: number): ScoreNoteState => {
    const r = records[index.get(head) ?? -1]
    if (!r) return 'todo'
    if (r.judgement === null) return Math.abs(r.beat - beat) < 0.5 ? 'current' : 'todo'
    if (r.judgement === 'miss') return 'wrong'
    return onTime(r.judgement) && !r.wrongPresses.length ? 'done' : 'off'
  }
  const bar = Math.max(0, Math.floor(beat / song.beatsPerBar)) + etude.bars[0]
  return <ScoreField etude={etude} current={bar} stateOf={stateOf} version={version} />
}

function ScoreField({
  etude,
  current,
  stateOf,
  version,
}: {
  etude: EtudeScore
  current: number
  stateOf: (head: number) => ScoreNoteState
  version: string
}) {
  return (
    <div className="score-field">
      <ScoreView
        score={etude.score}
        bars={etude.bars}
        staves={etude.staves}
        current={current}
        stateOf={stateOf}
        version={version}
      />
    </div>
  )
}
