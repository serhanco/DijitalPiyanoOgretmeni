// Nota Şelalesi: a song's notes fall onto the keys. In the learning mode they
// wait for the right keys (a section with mistakes falls once more); in the
// rhythm mode they fall on the metronome through the shared BeatFrame.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { type FallState, Waterfall } from '../components/Waterfall'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { tempoReport, waitReport } from '../games/songs/report'
import { lessonPart, type ParsedSong, specTitle, type SongSpec } from '../games/songs/song'
import { tempoPlan } from '../games/songs/tempo'
import { WaitSession, type WaitEvent } from '../games/songs/wait'
import { gameNow, gameTimeout } from '../input/gameClock'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { onTime } from '../rhythm/timing'
import type { BeatTrack } from '../rhythm/track'
import { useSettings } from '../state/settings'
import { useFinishRequest } from '../testing/finishRequest'
import { BeatFrame, type FieldProps } from './beat/BeatFrame'
import { type EtudeScore, useEtudeScore } from './song/etudeScore'
import { TempoScore, ViewToggle, WaitScore } from './song/ScoreFields'

/** A song in rhythm mode is long: a few more hearts than a drill. */
const SONG_HEARTS = 5
const LEAD_MS = 1200
const FINISH_DELAY_MS = 900
/** The learning mode's fall speed (beats per minute), slower than the song. */
const WAIT_BPM = { min: 40, max: 120, step: 10 }

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

/** Exposed for the smoke test. */
export interface SongState {
  mode: SongSpec['mode']
  song: ParsedSong
  session: WaitSession | null
}

const expose = (state: SongState) => ((window as unknown as { __dpoSong?: SongState }).__dpoSong = state)

const HANDS_TEXT: Record<SongSpec['hands'], string> = {
  right: 'Sağ elle çal (mavi notalar).',
  left: 'Sol elle çal (pembe notalar).',
  both: 'İki elle çal: mavi notalar sağ el, pembe notalar sol el.',
}

const ETUDE_HANDS: Record<SongSpec['hands'], string> = {
  right: 'Sağ elle çal: üst porte.',
  left: 'Sol elle çal: alt porte.',
  both: 'İki elle çal: üst porte sağ el, alt porte sol el.',
}

function SongInfo({ spec }: { spec: SongSpec }) {
  return (
    <div className="tune-info song-tunes" data-tune={spec.songs.map((s) => s.original).join(' · ')}>
      {spec.songs.map((s) => (
        <div key={s.id}>
          <p>
            🎵 <b>{s.title}</b> · <i lang="und">{s.original}</i>
          </p>
          <p className="small muted">
            {s.origin}.{spec.songs.length === 1 && ` ${s.fact}`}
          </p>
        </div>
      ))}
    </div>
  )
}

/** Ritimli mod: the waterfall drawn from the running track, or an étude's score. */
function TempoField({
  trackRef,
  song,
  lesson,
  etude,
}: FieldProps & { song: ParsedSong; lesson: NoteLesson; etude: EtudeScore | null }) {
  const view = useSettings((s) => s.etudeView)
  const position = useCallback(() => {
    const t = trackRef.current
    // Before the start the first notes wait just above the line.
    return t ? t.beatAt(gameNow()) : -1.5
  }, [trackRef])
  const stateOf = useCallback(
    (i: number): FallState => {
      const r = trackRef.current?.records[i]
      if (!r || r.judgement === null) return 'pending'
      if (r.judgement === 'miss') return 'miss'
      if (r.heldKey !== null) return 'held'
      return onTime(r.judgement) && !r.wrongPresses.length ? 'hit' : 'off'
    },
    [trackRef],
  )
  if (etude && view === 'score') return <TempoScore etude={etude} song={song} trackRef={trackRef} />
  return (
    <Waterfall
      notes={song.notes}
      low={lesson.keyboard.low}
      high={lesson.keyboard.high}
      beatsPerBar={song.beatsPerBar}
      position={position}
      stateOf={stateOf}
    />
  )
}

function TempoSong({ lesson, onFinish, onExit }: Props) {
  const spec = lesson.song!
  const { ignoreOctave, relaxedMode } = useSettings()
  const song = useMemo(() => lessonPart(spec), [spec])
  const plan = useMemo(() => tempoPlan(song, ignoreOctave), [song, ignoreOctave])
  const etude = useEtudeScore(spec)
  useEffect(() => void expose({ mode: 'tempo', song, session: null }), [song])
  const report = useCallback(
    (tracks: BeatTrack[], summary: SessionSummary): SessionSummary => {
      const extra = tempoReport(
        tracks.map((t) => t.records),
        song.notes,
        song,
        { title: specTitle(spec), hands: spec.hands, failed: summary.failed },
      )
      return { ...summary, ...extra, perCategory: [...extra.perCategory, ...summary.perCategory] }
    },
    [song, spec],
  )
  return (
    <BeatFrame
      lesson={lesson}
      hearts={relaxedMode ? null : SONG_HEARTS}
      howTo={
        etude
          ? `Notayı oku, metronomla çal ve her notayı süresi kadar basılı tut. ${ETUDE_HANDS[spec.hands]}`
          : `Nota çizgiye değdiği an çal ve boyu kadar basılı tut. ${HANDS_TEXT[spec.hands]}`
      }
      className="arcade song"
      onFinish={onFinish}
      onExit={onExit}
      plan={plan}
      report={report}
      holds
      renderField={(p) => (
        <>
          <TempoField {...p} song={song} lesson={lesson} etude={etude} />
          {etude && <ViewToggle />}
        </>
      )}
    />
  )
}

/** Bekleyen mod: the notes stop at the line until the right keys are down. */
function WaitSong({ lesson, onFinish, onExit }: Props) {
  const spec = lesson.song!
  const { ignoreOctave, showKeyLabels, etudeView } = useSettings()
  const song = useMemo(() => lessonPart(spec), [spec])
  const etude = useEtudeScore(spec)
  const onScore = etude !== null && etudeView === 'score'
  const suggested = Math.min(WAIT_BPM.max, Math.max(WAIT_BPM.min, Math.round((lesson.rhythm?.bpm ?? 70) / 10) * 10))
  const [bpm, setBpm] = useState(suggested)
  const [session, setSession] = useState<WaitSession | null>(null)
  const sessionRef = useRef<WaitSession | null>(null)
  const [, setTick] = useState(0)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [message, setMessage] = useState(
    etude
      ? `Mavi notaları çal: nota sen doğru tuşlara basana kadar bekler. ${ETUDE_HANDS[spec.hands]}`
      : `Notalar klavyeye iner ve sen basana kadar bekler. ${HANDS_TEXT[spec.hands]}`,
  )
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })
  useEffect(() => void expose({ mode: 'wait', song, session }), [song, session])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const s = sessionRef.current
    onFinishRef.current(
      waitReport(s?.records ?? [], song, {
        title: specTitle(spec),
        hands: spec.hands,
        repeated: s?.repeated ?? song.sections.map(() => 0),
      }),
    )
  }, [song, spec])
  useFinishRequest(finish)

  const start = () => {
    if (sessionRef.current) return
    const s = new WaitSession(song, { bpm, startAt: gameNow() + LEAD_MS, ignoreOctave })
    sessionRef.current = s
    setSession(s)
  }

  const react = useCallback(
    (events: WaitEvent[]) => {
      for (const ev of events) {
        if (ev.type === 'wrong') {
          setFlash({ midi: ev.midi, mark: 'wrong' })
          setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
          setMessage(`${solfegeName(ev.midi)} değil: ${ev.step.notes.map((x) => solfegeName(x.midi)).join(' + ')} çal.`)
          sfx.wrong()
        } else if (ev.type === 'step') {
          const clean = ev.record.wrong.length === 0
          if (clean) setMood((m) => ({ mood: 'happy', pulse: m.pulse + 1 }))
          if (clean) setMessage(ev.record.notes.length > 1 ? 'Birlikte, güzel!' : 'Güzel!')
        } else if (ev.type === 'repeat') {
          const label = song.sections[ev.section].label
          setBanner(`🔁 ${label} bir daha! (${ev.mistakes} hata)`)
          setMessage('Bu bölümü bir kez daha çal, bu sefer hatasız olsun.')
          setMood((m) => ({ mood: 'think', pulse: m.pulse + 1 }))
          gameTimeout(() => setBanner(null), 2200)
        } else if (ev.type === 'done') {
          setMood((m) => ({ mood: 'cheer', pulse: m.pulse + 1 }))
          setMessage('🎉 Şarkı bitti!')
          sfx.fanfare()
          gameTimeout(finish, FINISH_DELAY_MS)
        }
      }
    },
    [song, finish],
  )

  useEffect(
    () =>
      subscribe((e) => {
        const s = sessionRef.current
        if (!s || e.type !== 'on' || finished.current) return
        const events = s.press(e.midi, e.time)
        if (events[0]?.type === 'hit') setFlash({ midi: e.midi, mark: 'correct' })
        react(events)
        setTick((t) => t + 1)
      }),
    [react],
  )

  // The clock: the notes fall, and stop at the line.
  useEffect(() => {
    if (!session) return
    let raf = 0
    let waiting = false
    const loop = () => {
      session.update(gameNow())
      if (session.waiting !== waiting) {
        waiting = session.waiting
        setTick((t) => t + 1)
      }
      if (!session.done) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [session])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1500 : 700)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 220)
    return () => clearTimeout(t)
  }, [flash])

  // Which notes are behind the line (played), at it (waiting) or still falling.
  const stateOf = useCallback(
    (i: number): FallState => {
      const s = sessionRef.current
      if (!s) return 'pending'
      const step = s.step
      const note = song.notes[i]
      if (step && note.beat === step.beat) return s.held.includes(note.midi) ? 'hit' : s.waiting ? 'active' : 'pending'
      // After the step: still to play (a repeat rewinds, so its section's notes fall again as new ones).
      return step && note.beat > step.beat ? 'pending' : 'hit'
    },
    [song],
  )
  const position = useCallback(() => sessionRef.current?.position ?? -1.5, [])

  const marks: Partial<Record<number, KeyMark>> = {}
  // The keys of the waiting step light up.
  if (session?.waiting) for (const m of session.pending) marks[m] = 'hint'
  if (flash) marks[flash.midi] = flash.mark
  const progress = session?.progress ?? 0
  const section = session?.step ? song.sections[session.step.section] : null

  return (
    <div className="game beat arcade song wait">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="counter">🌊 Bekleyen</span>
      </header>

      <div className="arcade-info">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={56} />
        <p className="arcade-message">{message}</p>
      </div>

      {session ? (
        <div className="beat-hud song-hud" aria-live="off">
          <span>{section && song.sections.length > 1 ? section.label : specTitle(spec)}</span>
          <span className="song-steps">
            {session.records.length ? `${session.records.filter((r) => !r.wrong.length).length} temiz` : ''}
          </span>
        </div>
      ) : (
        <div className="card beat-ready">
          <SongInfo spec={spec} />
          <div className="tempo-row">
            <span>Akış hızı</span>
            <button
              className="icon-btn"
              aria-label="Yavaşlat"
              disabled={bpm <= WAIT_BPM.min}
              onClick={() => setBpm((b) => Math.max(WAIT_BPM.min, b - WAIT_BPM.step))}
            >
              −
            </button>
            <b className="tempo-value">{bpm} BPM</b>
            <button
              className="icon-btn"
              aria-label="Hızlandır"
              disabled={bpm >= WAIT_BPM.max}
              onClick={() => setBpm((b) => Math.min(WAIT_BPM.max, b + WAIT_BPM.step))}
            >
              +
            </button>
            <span className="muted small">
              {song.bars} ölçü
              {song.sections.length > 1 && ` · ${song.sections.length} bölüm`}
            </span>
          </div>
          <p className="small muted">
            Acele yok, can yok: doğru tuşlara basınca şelale akmaya devam eder. Hatalı biten bölüm bir kez daha akar.
          </p>
          <button className="btn beat-start song-start" onClick={start}>
            Başla
          </button>
        </div>
      )}

      <div className="beat-field">
        {onScore ? (
          <WaitScore etude={etude} song={song} session={session} wrong={flash?.mark === 'wrong'} />
        ) : (
          <Waterfall
            notes={song.notes}
            low={lesson.keyboard.low}
            high={lesson.keyboard.high}
            beatsPerBar={song.beatsPerBar}
            position={position}
            stateOf={stateOf}
          />
        )}
        {etude && <ViewToggle />}
        {banner && <span className="song-banner">{banner}</span>}
      </div>

      <PianoKeyboard
        low={lesson.keyboard.low}
        high={lesson.keyboard.high}
        marks={marks}
        showLabels={showKeyLabels}
        focus={session?.step?.notes.map((x) => x.midi)}
      />
    </div>
  )
}

export function SongScreen(props: Props) {
  return props.lesson.song!.mode === 'tempo' ? <TempoSong {...props} /> : <WaitSong {...props} />
}
