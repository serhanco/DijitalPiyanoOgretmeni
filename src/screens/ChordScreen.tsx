// Chord drill and progressions: chords read from the staff (with their name
// and fingers in the first lessons), every note pressed together.

import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { MelodyStaff, type StepState } from '../components/MelodyStaff'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { chordFeedback, chordNoteNames } from '../games/chords/feedback'
import { chordSequence } from '../games/chords/lessons'
import { summarizeChords } from '../games/chords/report'
import { type ChordEvent, ChordSession } from '../games/chords/session'
import { paginate, type Step } from '../games/melody/session'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { type ChordTarget, chordTitle, fingerText } from '../music/chords'
import { solfegeName } from '../music/notes'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { useSettings } from '../state/settings'

const HINT_AFTER = 2
const COMBO_STEP = 5
const FINISH_PAUSE_MS = 500
const MESSAGE_MS = 1400

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

const chordSteps = (chords: ChordTarget[]): Step[] =>
  chords.map((c) => ({ melody: 0, notes: c.notes.map((n) => ({ midi: n.midi, clef: n.clef, spelled: n })) }))

export function ChordScreen({ lesson, onFinish, onExit }: Props) {
  const { ignoreOctave, showKeyLabels, relaxedMode } = useSettings()
  const spec = lesson.chords!
  const chords = useMemo(() => chordSequence(spec), [spec])
  const session = useMemo(
    () =>
      new ChordSession({
        chords,
        mode: spec.mode,
        hearts: relaxedMode ? null : HEARTS_PER_LESSON,
        ignoreOctave,
      }),
    [chords, spec.mode, relaxedMode, ignoreOctave],
  )
  const steps = useMemo(() => chordSteps(chords), [chords])
  const pages = useMemo(() => paginate(steps), [steps])
  const names = useMemo(() => chordNoteNames(chords), [chords])
  const nameOf = (midi: number) => names.get(midi) ?? solfegeName(midi)
  const [position, setPosition] = useState(0)
  const [held, setHeld] = useState<number[]>([])
  const [message, setMessage] = useState<{ text: string; good: boolean; id: number } | null>(null)
  const [wrongKey, setWrongKey] = useState<number | null>(null)
  const [mistakesHere, setMistakesHere] = useState(0)
  const [shake, setShake] = useState(0)
  const [combo, setCombo] = useState(0)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const comboRef = useRef(0)
  const timers = useRef<number[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    ;(window as unknown as { __dpoChord?: ChordSession }).__dpoChord = session
  }, [session])

  useEffect(() => {
    session.markShown(performance.now())
  }, [session, position])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1800 : 700)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage((m) => (m?.id === message.id ? null : m)), MESSAGE_MS)
    return () => clearTimeout(t)
  }, [message])

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
    const finish = (failed: boolean) => onFinishRef.current(summarizeChords(session.attempted, failed))
    const say = (ev: ChordEvent) => {
      const f = chordFeedback(ev, (m) => names.get(m) ?? solfegeName(m))
      setMessage((prev) => ({ ...f, id: (prev?.id ?? 0) + 1 }))
    }
    const handle = (events: ChordEvent[]) => {
      for (const ev of events) {
        if (ev.type === 'chord') {
          const clean =
            ev.record.wrongPresses.length === 0 && ev.record.inversionMistakes === 0 && ev.record.incomplete === 0
          const next = clean ? comboRef.current + 1 : 0
          comboRef.current = next
          setCombo(next)
          if (next > 0 && next % COMBO_STEP === 0) {
            sfx.combo()
            setMood((m) => ({ mood: 'cheer', pulse: m.pulse + 1 }))
          } else {
            sfx.correct()
            setMood((m) => ({ mood: ev.together ? 'happy' : 'think', pulse: m.pulse + 1 }))
          }
          setMistakesHere(0)
          setWrongKey(null)
          say(ev)
          setPosition(session.position)
          if (session.done) later(() => finish(false), FINISH_PAUSE_MS)
        } else if (ev.type === 'wrong' || ev.type === 'inversion' || ev.type === 'incomplete') {
          if (ev.type !== 'incomplete') {
            sfx.wrong()
            setShake((n) => n + 1)
          }
          if (ev.type === 'wrong') setWrongKey(ev.midi)
          comboRef.current = 0
          setCombo(0)
          setMistakesHere((n) => n + 1)
          setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
          say(ev)
          if (session.failed) {
            sfx.fail()
            later(() => finish(true), 800)
          }
        }
      }
      setHeld(session.playing(performance.now()))
    }
    const unsubscribe = subscribe((e) => {
      if (session.done) return
      if (e.type === 'off') {
        session.release(e.midi)
        setHeld(session.playing(performance.now()))
        return
      }
      handle(session.press(e.midi, e.time))
    })
    // Attempts given up are found as time passes.
    const tick = window.setInterval(() => {
      if (!session.done) handle(session.update(performance.now()))
    }, 100)
    const pending = timers.current
    return () => {
      unsubscribe()
      clearInterval(tick)
      pending.forEach(clearTimeout)
    }
  }, [session, names])

  useEffect(() => {
    if (wrongKey === null) return
    const t = window.setTimeout(() => setWrongKey(null), 500)
    return () => clearTimeout(t)
  }, [wrongKey])

  const done = position >= chords.length
  const current = done ? null : chords[position]
  const pageIndex = Math.max(
    0,
    pages.findLastIndex((p) => p.start <= Math.min(position, steps.length - 1)),
  )
  const page = pages[pageIndex]
  const states: StepState[] = page.steps.map((_, i) =>
    page.start + i < position ? 'done' : page.start + i === position ? 'current' : 'todo',
  )
  const wanted = current?.notes.map((n) => n.midi) ?? []
  const hit = held.filter((m) => wanted.includes(m))

  const marks: Partial<Record<number, KeyMark>> = {}
  if (mistakesHere >= HINT_AFTER) for (const m of wanted) marks[m] = 'hint'
  for (const m of held) marks[m] = 'correct'
  if (wrongKey !== null) marks[wrongKey] = 'wrong'

  const progress = position / chords.length
  const numerals = spec.progression
  const inProgression = numerals && current ? position % numerals.length : -1

  return (
    <div className="game">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        {session.hearts !== null ? (
          <span className={`hearts ${shake ? 'hit' : ''}`} key={`h${shake}`} aria-label={`${session.heartsLeft} can`}>
            ❤️ {session.heartsLeft}
          </span>
        ) : (
          <span className="counter">
            {Math.min(position + 1, chords.length)}/{chords.length}
          </span>
        )}
      </header>

      <div className="prompt-row">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={76} />
        <div>
          {numerals && (
            <p className="numerals" aria-label="Akor ilerlemesi">
              {numerals.map((n, i) => (
                <span key={i} className={i === inProgression ? 'on' : i < inProgression ? 'done' : ''}>
                  {n}
                </span>
              ))}
            </p>
          )}
          <p className="prompt">{current && spec.showName ? `🎼 ${chordTitle(current)}` : 'Portedeki akoru çal'}</p>
          {current && spec.showName ? (
            <p className="finger-tip" key={`f${position}`}>
              Parmaklar: {fingerText(current)}
            </p>
          ) : (
            <p className="small muted">Bütün notalara birlikte bas.</p>
          )}
          {combo >= 3 && (
            <p className={`combo ${combo % COMBO_STEP === 0 ? 'big' : ''}`} key={`c${combo}`}>
              🔥 {combo} akor üst üste{combo % COMBO_STEP === 0 ? '!' : ''}
            </p>
          )}
        </div>
      </div>

      <div
        key={shake}
        className={`staff-wrap melody-wrap chord-wrap ${shake && message && !message.good ? 'shake' : ''}`}
        data-pending={wanted.join(' ')}
      >
        <MelodyStaff
          steps={page.steps}
          states={states}
          hit={hit}
          clef={lesson.clef}
          grand={lesson.grand}
          wrong={wrongKey !== null}
        />
      </div>

      <p className={`feedback ${message ? (message.good ? 'good' : 'bad') : ''}`} aria-live="polite">
        {message
          ? message.text
          : mistakesHere >= HINT_AFTER && current
            ? `İpucu: ${wanted.map(nameOf).join(' + ')}`
            : ' '}
      </p>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
