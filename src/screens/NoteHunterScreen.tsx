import { useEffect, useMemo, useRef, useState } from 'react'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { Staff } from '../components/Staff'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { NoteHunterSession } from '../games/noteHunter/session'
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
      }),
    [lesson, ignoreOctave, relaxedMode],
  )
  const [position, setPosition] = useState(0)
  const [solved, setSolved] = useState<number | null>(null)
  const [wrongKey, setWrongKey] = useState<number | null>(null)
  const [wrongCount, setWrongCount] = useState(0)
  const [shake, setShake] = useState(0)
  const timers = useRef<number[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const target = session.records[position]?.target ?? null

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
        later(() => setWrongKey((k) => (k === e.midi ? null : k)), WRONG_FLASH_MS)
        if (session.failed) {
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

      <p className="prompt">Bu nota hangisi? Klavyede bas!</p>

      <div key={shake} className={`staff-wrap ${shake && wrongKey !== null ? 'shake' : ''}`}>
        <Staff clef={lesson.clef} note={target} color={solved !== null ? GREEN : undefined} />
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
