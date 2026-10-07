import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { Staff } from '../components/Staff'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { grandClefPicker, NoteHunterSession } from '../games/noteHunter/session'
import { type SessionSummary, summarize } from '../games/noteHunter/summary'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { useSettings } from '../state/settings'

const CORRECT_PAUSE_MS = 450
const WRONG_FLASH_MS = 500
/** Show the answer on the keyboard after this many wrong tries. */
const HINT_AFTER = 2

const GREEN = '#22a559'
/** Celebrate every this many first-try answers in a row. */
const COMBO_STEP = 5

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

export function NoteHunterScreen({ lesson, onFinish, onExit }: Props) {
  const { ignoreOctave, showKeyLabels, relaxedMode } = useSettings()
  const session = useMemo(
    () =>
      new NoteHunterSession({
        notes: lesson.notes,
        length: lesson.length,
        ignoreOctave,
        hearts: relaxedMode ? undefined : HEARTS_PER_LESSON,
        clefOf: lesson.grand ? grandClefPicker(lesson.bothStaves) : undefined,
      }),
    [lesson, ignoreOctave, relaxedMode],
  )
  const [position, setPosition] = useState(0)
  const [solved, setSolved] = useState<number | null>(null)
  const [wrongKey, setWrongKey] = useState<number | null>(null)
  const [wrongCount, setWrongCount] = useState(0)
  const [shake, setShake] = useState(0)
  const [combo, setCombo] = useState(0)
  const comboRef = useRef(0)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const timers = useRef<number[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const target = session.records[position]?.target ?? null
  const targetClef = session.records[position]?.clef ?? lesson.clef

  // Settle back to idle after each reaction.
  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1800 : 900)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  // Start the reaction clock once the note is on screen.
  useEffect(() => {
    if (solved === null) session.markShown(performance.now())
  }, [session, position, solved])

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
    const unsubscribe = subscribe((e) => {
      if (e.type !== 'on') return
      const cur = session.current
      if (!cur) return
      const result = session.press(e.midi, e.time)
      if (result === 'correct') {
        setSolved(cur.target)
        setWrongKey(null)
        const firstTry = cur.wrongPresses.length === 0
        const next = firstTry ? comboRef.current + 1 : 0
        comboRef.current = next
        setCombo(next)
        const milestone = next > 0 && next % COMBO_STEP === 0
        if (milestone) sfx.combo()
        else sfx.correct()
        setMood((m) => ({ mood: milestone ? 'cheer' : 'happy', pulse: m.pulse + 1 }))
        later(() => {
          setSolved(null)
          setWrongCount(0)
          if (session.done) onFinishRef.current(summarize(session.attempted, lesson.clef))
          else setPosition(session.position)
        }, CORRECT_PAUSE_MS)
      } else if (result === 'wrong') {
        setWrongKey(e.midi)
        setWrongCount(cur.wrongPresses.length)
        setShake((n) => n + 1)
        comboRef.current = 0
        setCombo(0)
        sfx.wrong()
        setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
        later(() => setWrongKey((k) => (k === e.midi ? null : k)), WRONG_FLASH_MS)
        if (session.failed) {
          sfx.fail()
          later(() => onFinishRef.current(summarize(session.attempted, lesson.clef, true)), WRONG_FLASH_MS + 300)
        }
      }
    })
    const pending = timers.current
    return () => {
      unsubscribe()
      pending.forEach(clearTimeout)
    }
  }, [session, lesson.clef])

  const marks: Partial<Record<number, KeyMark>> = {}
  if (target !== null && wrongCount >= HINT_AFTER && solved === null) marks[target] = 'hint'
  if (wrongKey !== null) marks[wrongKey] = 'wrong'
  if (solved !== null) marks[solved] = 'correct'

  const progress = (position + (solved !== null ? 1 : 0)) / session.records.length

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
            {Math.min(position + 1, session.records.length)}/{session.records.length}
          </span>
        )}
      </header>

      <div className="prompt-row">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={76} />
        <div>
          <p className="prompt">
            {lesson.grand ? 'Bu nota hangisi? Üst porte sağ el, alt porte sol el.' : 'Bu nota hangisi? Klavyede bas!'}
          </p>
          {combo >= 3 && (
            <p className={`combo ${combo % COMBO_STEP === 0 ? 'big' : ''}`} key={combo}>
              🔥 {combo} doğru üst üste{combo % COMBO_STEP === 0 ? '!' : ''}
            </p>
          )}
        </div>
      </div>

      <div
        key={shake}
        data-note={target ?? undefined}
        data-clef={targetClef}
        className={`staff-wrap ${shake && wrongKey !== null ? 'shake' : ''}`}
      >
        <Staff
          clef={lesson.clef}
          grand={lesson.grand}
          noteClef={targetClef}
          note={target}
          color={solved !== null ? GREEN : undefined}
        />
      </div>

      <p className={`feedback ${solved !== null ? 'good' : wrongKey !== null ? 'bad' : ''}`} aria-live="polite">
        {solved !== null
          ? `Harika! ${solfegeName(solved)}`
          : wrongKey !== null
            ? `${solfegeName(wrongKey)} değil, tekrar dene`
            : wrongCount >= HINT_AFTER && target !== null
              ? `İpucu: ${solfegeName(target)}`
              : ' '}
      </p>

      <PianoKeyboard low={lesson.keyboard.low} high={lesson.keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
