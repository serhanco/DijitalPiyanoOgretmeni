// Everything rhythm activities share: tempo picker, count-in, metronome,
// beat indicator, input with latency correction, judgement pop-ups, the
// mascot and the report at the end. Each activity only draws its playfield.

import { type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Metronome, prepareMetronome, startMetronome } from '../../audio/metronome'
import { vibrate } from '../../audio/sfx'
import { Mascot, type MascotMood } from '../../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../../components/PianoKeyboard'
import { rhythmSkill, type SkillProvider } from '../../games/arcade/skill'
import type { NoteLesson, RhythmSpec } from '../../games/noteHunter/lessons'
import type { SessionSummary } from '../../games/noteHunter/summary'
import { subscribe } from '../../input/inputBus'
import { solfegeName } from '../../music/notes'
import { correctedTime } from '../../rhythm/calibration'
import { generateBars, rhythmBeats, type RhythmValue } from '../../rhythm/rhythm'
import { summarizeRhythm } from '../../rhythm/summary'
import { beatMs, clampBpm, JUDGEMENT_LABELS, type Judgement, MAX_BPM, MIN_BPM, onTime } from '../../rhythm/timing'
import { BeatTrack, type TrackEvent } from '../../rhythm/track'
import { useSettings } from '../../state/settings'

const LEAD_MS = 500
const COUNT_IN_BARS = 1
const FINISH_DELAY_MS = 900
/** Cheer every this many on-time notes in a row. */
const COMBO_STEP = 8

export interface FieldProps {
  spec: RhythmSpec
  bars: RhythmValue[][]
  skill: SkillProvider
  /** Null until the player presses Başla. */
  track: BeatTrack | null
  /** Always the latest track, for Pixi scenes that read it every frame. */
  trackRef: RefObject<BeatTrack | null>
  now: number
}

interface Props {
  lesson: NoteLesson
  hearts: number | null
  howTo: string
  className?: string
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
  renderField: (props: FieldProps) => ReactNode
}

interface Popup {
  id: number
  judgement: Judgement | 'wrong'
  text: string
}

function BeatHud({ track, now, spec }: { track: BeatTrack | null; now: number; spec: RhythmSpec }) {
  const beat = track ? track.beatAt(now) : null
  const whole = beat === null ? null : Math.floor(beat)
  const inBar = whole === null ? -1 : ((whole % spec.beatsPerBar) + spec.beatsPerBar) % spec.beatsPerBar
  const countIn = whole !== null && whole < 0 ? -whole : null
  const bar = whole !== null && whole >= 0 ? Math.min(spec.bars, Math.floor(whole / spec.beatsPerBar) + 1) : 0
  return (
    <div className="beat-hud" aria-live="off">
      <span className="beat-tempo">Tempo {track?.bpm ?? spec.bpm}</span>
      <div className="beat-dots" data-beat={inBar}>
        {Array.from({ length: spec.beatsPerBar }, (_, i) => (
          <span key={i} className={`beat-dot ${i === 0 ? 'down' : ''} ${i === inBar ? 'on' : ''}`} />
        ))}
      </div>
      <span className="beat-bar">
        {countIn !== null ? (
          <b className="count-in" key={countIn}>
            {countIn}
          </b>
        ) : (
          `Ölçü ${bar}/${spec.bars}`
        )}
      </span>
    </div>
  )
}

export function BeatFrame({ lesson, hearts, howTo, className, onFinish, onExit, renderField }: Props) {
  const spec = lesson.rhythm!
  const { ignoreOctave, showKeyLabels, metronome, latency, deviceLatency, set } = useSettings()
  const bars = useMemo(
    () => generateBars({ values: spec.values, bars: spec.bars, beatsPerBar: spec.beatsPerBar }),
    [spec],
  )
  const skill = useMemo(
    () =>
      rhythmSkill({
        clef: lesson.clef,
        bars,
        notes: lesson.notes,
        anyKey: spec.anyKey,
        ignoreOctave,
        beatsPerBar: spec.beatsPerBar,
      }),
    [lesson, bars, spec, ignoreOctave],
  )

  // The tempo the player chose last time in this lesson.
  const [bpm, setBpm] = useState(() => clampBpm(useSettings.getState().tempo[lesson.id] ?? spec.bpm))
  const [track, setTrack] = useState<BeatTrack | null>(null)
  const trackRef = useRef<BeatTrack | null>(null)
  const [now, setNow] = useState(() => performance.now())
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [message, setMessage] = useState(howTo)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [flash, setFlash] = useState<{ midi: number; mark: KeyMark } | null>(null)
  const [starting, setStarting] = useState(false)
  const metronomeRef = useRef<Metronome | null>(null)
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  // Warm up Tone.js while the player reads the instructions.
  useEffect(() => void import('tone').catch(() => undefined), [])

  const start = useCallback(async () => {
    if (trackRef.current || starting) return
    setStarting(true)
    set({ tempo: { ...useSettings.getState().tempo, [lesson.id]: bpm } })
    await prepareMetronome()
    const b = beatMs(bpm)
    const countIn = spec.beatsPerBar * COUNT_IN_BARS
    const startAt = performance.now() + LEAD_MS + countIn * b
    const t = new BeatTrack(skill, { bpm, startAt, hearts })
    trackRef.current = t
    ;(window as unknown as { __dpoBeat?: BeatTrack }).__dpoBeat = t
    setTrack(t)
    setMessage(howTo)
    metronomeRef.current = await startMetronome({
      bpm,
      beatsPerBar: spec.beatsPerBar,
      firstClickAt: startAt - countIn * b,
      fromBeat: -countIn,
      toBeat: Math.ceil(rhythmBeats(bars)) - 1,
    })
    // The game may have ended (or been left) while the metronome was loading.
    if (finished.current || trackRef.current !== t) metronomeRef.current.stop()
  }, [bpm, spec, skill, hearts, bars, howTo, starting, set, lesson.id])

  useEffect(
    () => () => {
      finished.current = true
      metronomeRef.current?.stop()
    },
    [],
  )

  const react = useCallback((events: TrackEvent[]) => {
    const t = trackRef.current
    for (const ev of events) {
      if (ev.type === 'hit') {
        setPopup((p) => ({ id: (p?.id ?? 0) + 1, judgement: ev.judgement, text: JUDGEMENT_LABELS[ev.judgement] }))
        if (onTime(ev.judgement)) {
          const cheer = t !== null && t.combo > 0 && t.combo % COMBO_STEP === 0
          setMood((m) => ({ mood: cheer ? 'cheer' : 'happy', pulse: m.pulse + 1 }))
          if (cheer) setMessage(`🔥 ${t.combo} vuruş üst üste tam zamanında!`)
        } else {
          setMessage(ev.judgement === 'early' ? 'Biraz erken! Vuruşu bekle.' : 'Biraz geç! Vuruşu dinle.')
        }
      } else if (ev.type === 'miss') {
        setPopup((p) => ({ id: (p?.id ?? 0) + 1, judgement: 'miss', text: JUDGEMENT_LABELS.miss }))
        setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
        setMessage(ev.record.rest ? 'Es sırasında sus!' : 'Bu vuruşu kaçırdın.')
        vibrate(60)
      } else if (ev.type === 'wrong') {
        setPopup((p) => ({ id: (p?.id ?? 0) + 1, judgement: 'wrong', text: 'Yanlış nota' }))
        setMessage(`${solfegeName(ev.midi)} değil, ${solfegeName(ev.record.target)} çal!`)
        setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
      }
    }
  }, [])

  // Key presses, corrected by the measured delay of their device.
  useEffect(
    () =>
      subscribe((e) => {
        const t = trackRef.current
        if (e.type !== 'on' || !t) return
        const { latency, deviceLatency } = useSettings.getState()
        const events = t.press(e.midi, correctedTime(e.time, e.source, latency, e.device, deviceLatency))
        const ev = events[0]
        if (ev?.type === 'hit') setFlash({ midi: e.midi, mark: onTime(ev.judgement) ? 'correct' : 'hint' })
        else if (ev?.type === 'wrong' || ev?.type === 'miss') setFlash({ midi: e.midi, mark: 'wrong' })
        react(events)
      }),
    [react],
  )

  // The clock: settle passed notes and redraw every frame.
  useEffect(() => {
    if (!track) return
    let raf = 0
    const loop = () => {
      const t = performance.now()
      react(track.update(t))
      setNow(t)
      if (track.done && !finished.current) {
        finished.current = true
        metronomeRef.current?.stop()
        window.setTimeout(
          () =>
            onFinishRef.current(
              summarizeRhythm(track.attempted, {
                failed: track.failed,
                pitched: !spec.anyKey,
                stray: track.stray,
                bestCombo: track.bestCombo,
                bpm: track.bpm,
              }),
            ),
          FINISH_DELAY_MS,
        )
      }
      if (!finished.current) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [track, react, spec.anyKey])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1500 : 700)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 200)
    return () => clearTimeout(t)
  }, [flash])

  const marks: Partial<Record<number, KeyMark>> = flash ? { [flash.midi]: flash.mark } : {}
  const noLatency = Object.values(latency).every((v) => v === 0) && Object.keys(deviceLatency).length === 0

  return (
    <div className={`game beat ${className ?? ''}`}>
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round((track?.progress ?? 0) * 100)}>
          <div className="progress-fill" style={{ width: `${(track?.progress ?? 0) * 100}%` }} />
        </div>
        {hearts !== null ? (
          <span className="hearts" aria-label={`${track?.hearts ?? hearts} can`}>
            ❤️ {track?.hearts ?? hearts}
          </span>
        ) : (
          <span className="counter">{bpm} BPM</span>
        )}
      </header>

      <div className="arcade-info">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={56} />
        <p className="arcade-message">{message}</p>
        {track && track.combo >= 3 && <span className="arcade-score">🔥 {track.combo}</span>}
      </div>

      {track ? (
        <BeatHud track={track} now={now} spec={spec} />
      ) : (
        <div className="card beat-ready">
          <div className="tempo-row">
            <span>Tempo</span>
            <button
              className="icon-btn"
              aria-label="Yavaşlat"
              disabled={bpm <= MIN_BPM}
              onClick={() => setBpm((b) => clampBpm(b - 5))}
            >
              −
            </button>
            <b className="tempo-value">{bpm} BPM</b>
            <button
              className="icon-btn"
              aria-label="Hızlandır"
              disabled={bpm >= MAX_BPM}
              onClick={() => setBpm((b) => clampBpm(b + 5))}
            >
              +
            </button>
            <span className="muted small">
              {spec.beatsPerBar}/4 · {spec.bars} ölçü
              {bpm !== spec.bpm && (
                <>
                  {' · '}
                  <button className="link" onClick={() => setBpm(spec.bpm)}>
                    önerilen {spec.bpm}
                  </button>
                </>
              )}
            </span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={metronome} onChange={(e) => set({ metronome: e.target.checked })} />
            <span className="toggle-track" aria-hidden />
            <span>Metronom sesi</span>
          </label>
          <p className="small muted">
            Önce {spec.beatsPerBar} vuruş sayılır, sonra başla.
            {noLatency && ' Bluetooth piyanoyla çalıyorsan ana ekrandaki gecikme ayarını bir kez yap.'}
          </p>
          <button className="btn beat-start" onClick={() => void start()} disabled={starting}>
            Başla
          </button>
        </div>
      )}

      <div className="beat-field">
        {renderField({ spec, bars, skill, track, trackRef, now })}
        {popup && (
          <span key={popup.id} className={`judge-pop ${popup.judgement}`}>
            {popup.text}
          </span>
        )}
      </div>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
