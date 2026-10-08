// Chord drill and progressions: chords read from the staff (with their name
// and fingers in the first lessons), every note pressed together. By ear
// (`byEar`), the chord is only heard: its root is lit and the player finds
// the rest (major, minor, seventh).

import { onFinishRequest } from '../testing/finishRequest'
import { gameNow, gameTimeout } from '../input/gameClock'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initPiano, isPianoReady, pianoAttack, pianoRelease } from '../audio/piano'
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
/** How long a heard chord sounds. */
const LISTEN_MS = 1300

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
  const byEar = !!spec.byEar
  const [started, setStarted] = useState(!byEar)
  /** Ear mode, unless the piano sound could not load: then the chord's name is shown after all. */
  const [heard, setHeard] = useState(byEar)
  const [lastChord, setLastChord] = useState<ChordTarget | null>(null)
  const comboRef = useRef(0)
  const timers = useRef<(() => void)[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    ;(window as unknown as { __dpoChord?: ChordSession }).__dpoChord = session
  }, [session])

  useEffect(() => {
    if (started) session.markShown(gameNow())
  }, [session, position, started])

  const listen = useCallback((chord: ChordTarget) => {
    for (const n of chord.notes) pianoAttack(n.midi, 0.7)
    timers.current.push(gameTimeout(() => chord.notes.forEach((n) => pianoRelease(n.midi)), LISTEN_MS))
  }, [])

  // By ear: every new chord is played once, after a short breath.
  useEffect(() => {
    const chord = chords[position]
    if (!byEar || !started || !heard || !chord) return
    const t = window.setTimeout(() => listen(chord), position === 0 ? 150 : 700)
    return () => clearTimeout(t)
  }, [byEar, started, heard, position, chords, listen])

  const start = () => {
    // Start once the samples are in, but never wait long (offline the names are shown instead).
    const wait = new Promise((resolve) => window.setTimeout(resolve, 1500))
    void Promise.race([initPiano().catch(() => undefined), wait]).then(() => {
      if (!isPianoReady()) setHeard(false)
      setStarted(true)
    })
  }

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
    const later = (fn: () => void, ms: number) => timers.current.push(gameTimeout(fn, ms))
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
          setLastChord(ev.record.chord)
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
      setHeld(session.playing(gameNow()))
    }
    const stopFinish = onFinishRequest(() => finish(false))
    const unsubscribe = subscribe((e) => {
      if (session.done) return
      if (e.type === 'off') {
        session.release(e.midi)
        setHeld(session.playing(gameNow()))
        return
      }
      handle(session.press(e.midi, e.time))
    })
    // Attempts given up are found as time passes.
    const tick = window.setInterval(() => {
      if (!session.done) handle(session.update(gameNow()))
    }, 100)
    const pending = timers.current
    return () => {
      unsubscribe()
      stopFinish()
      clearInterval(tick)
      pending.forEach((cancel) => cancel())
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
  if (byEar && started && current) marks[current.notes[0].midi] = 'hint'
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
          <p className="prompt">
            {byEar && current
              ? heard
                ? `🎧 Kök nota ${nameOf(current.notes[0].midi).replace(/\d+$/, '')}: akoru dinle, bul ve çal`
                : `🎼 ${chordTitle(current, false)}`
              : current && spec.showName
                ? `🎼 ${chordTitle(current)}`
                : 'Portedeki akoru çal'}
          </p>
          {byEar ? (
            <p className="small muted">
              {heard ? 'Majör mü, minör mü, yedili mi? Kulağın söylesin.' : 'Ses yüklenemedi: akorun adı yazıyor.'}
            </p>
          ) : current && spec.showName ? (
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

      {byEar ? (
        <div
          key={shake}
          className={`ear-board ${shake && message && !message.good ? 'shake' : ''}`}
          data-ear={heard}
          data-pending={wanted.join(' ')}
        >
          {!started ? (
            <button className="btn" onClick={start}>
              🎧 Dinlemeye başla
            </button>
          ) : (
            current &&
            heard && (
              <button className="btn btn-secondary" onClick={() => listen(current)}>
                🔊 Tekrar dinle
              </button>
            )
          )}
          {lastChord && <p className="ear-last">Son akor: {chordTitle(lastChord, false)}</p>}
        </div>
      ) : (
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
      )}

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
