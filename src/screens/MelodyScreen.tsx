import { onFinishRequest } from '../testing/finishRequest'
import { gameNow, gameTimeout } from '../input/gameClock'
import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { MelodyStaff, type StepState } from '../components/MelodyStaff'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { MelodySession, paginate, parseMelodies, type Step, syncSummary } from '../games/melody/session'
import type { NoteLesson } from '../games/noteHunter/lessons'
import { type SessionSummary, summarize } from '../games/noteHunter/summary'
import { arpeggioSteps, arpeggioTitle } from '../games/chords/arpeggio'
import { partTitle, patternReport, scaleSteps, spelledNames, stepsKeyboard } from '../games/scales/steps'
import { setComputerKeyboardBase } from '../input/computerKeyboard'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { CROSSING_TIPS } from '../music/scales'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { useSettings } from '../state/settings'

const WRONG_FLASH_MS = 500
const HINT_AFTER = 2
const COMBO_STEP = 5
const FINISH_PAUSE_MS = 500

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

/** The current step's fingers, and the crossing to make if there is one. */
function fingerTip(step: Step): { text: string; cross: boolean } | null {
  const fingered = step.notes.filter((n) => n.finger)
  if (!fingered.length) return null
  const crossing = fingered.find((n) => n.cross)
  const hand = (clef: string) => (clef === 'treble' ? 'sağ el' : 'sol el')
  const fingers = fingered
    .map((n) => (fingered.length > 1 ? `${hand(n.clef)} ${n.finger}` : `${n.finger}. parmak`))
    .join(', ')
  if (!crossing) return { text: `Parmak: ${fingers}`, cross: false }
  const who = fingered.length > 1 ? ` (${hand(crossing.clef)})` : ''
  return { text: `↪ ${CROSSING_TIPS[crossing.cross!]}${who}: ${fingers}`, cross: true }
}

export function MelodyScreen({ lesson, onFinish, onExit }: Props) {
  const { ignoreOctave, showKeyLabels, relaxedMode } = useSettings()
  // Scales and arpeggios are runs of parts, each with its title.
  const pattern = useMemo(
    () =>
      lesson.scales
        ? { steps: scaleSteps(lesson.scales), titles: lesson.scales.map(partTitle) }
        : lesson.arpeggios
          ? { steps: arpeggioSteps(lesson.arpeggios), titles: lesson.arpeggios.map(arpeggioTitle) }
          : null,
    [lesson],
  )
  const session = useMemo(
    () =>
      new MelodySession({
        steps: pattern?.steps ?? parseMelodies(lesson.melodies ?? [], lesson.grand ? undefined : lesson.clef),
        hearts: relaxedMode ? undefined : HEARTS_PER_LESSON,
        ignoreOctave,
      }),
    [lesson, pattern, ignoreOctave, relaxedMode],
  )
  const pages = useMemo(() => paginate(session.steps), [session])
  const names = useMemo(() => spelledNames(session.steps), [session])
  const nameOf = (midi: number) => names.get(midi) ?? solfegeName(midi)
  const [position, setPosition] = useState(0)
  const [hit, setHit] = useState<number[]>([])
  const [wrongKey, setWrongKey] = useState<number | null>(null)
  const [wrongCount, setWrongCount] = useState(0)
  const [flash, setFlash] = useState<number[]>([])
  const [shake, setShake] = useState(0)
  const [combo, setCombo] = useState(0)
  const comboRef = useRef(0)
  const stepClean = useRef(true)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const timers = useRef<(() => void)[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    ;(window as unknown as { __dpoMelody?: MelodySession }).__dpoMelody = session
  }, [session])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1800 : 700)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  // The reaction clock of a step starts when it becomes current.
  useEffect(() => {
    session.markShown(gameNow())
  }, [session, position])

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(gameTimeout(fn, ms))
    const finish = (failed: boolean) => {
      let summary = summarize(session.attempted, lesson.clef, failed)
      const sync = syncSummary(session.stepRecords.filter((rs) => rs[0].shownAt !== null))
      if (sync) summary = { ...summary, sync }
      if (pattern) {
        // Scales and arpeggios are reported per part, at the crossings and by evenness, not by staff position.
        const { perCategory, scale } = patternReport(session.steps, session.stepRecords, pattern.titles)
        summary = { ...summary, perCategory, scale, noteNames: Object.fromEntries(spelledNames(session.steps)) }
      }
      onFinishRef.current(summary)
    }
    const stopFinish = onFinishRequest(() => finish(false))
    const unsubscribe = subscribe((e) => {
      if (e.type !== 'on' || session.done) return
      const result = session.press(e.midi, e.time)
      if (result === 'partial') {
        setHit((h) => [...h, e.midi])
        setFlash([e.midi])
      } else if (result === 'step') {
        const firstTry = stepClean.current
        stepClean.current = true
        const next = firstTry ? comboRef.current + 1 : 0
        comboRef.current = next
        setCombo(next)
        const milestone = next > 0 && next % COMBO_STEP === 0
        if (milestone) {
          sfx.combo()
          setMood((m) => ({ mood: 'cheer', pulse: m.pulse + 1 }))
        } else if (firstTry) setMood((m) => ({ mood: 'happy', pulse: m.pulse + 1 }))
        setHit([])
        setWrongKey(null)
        setWrongCount(0)
        setFlash([e.midi])
        if (session.done) {
          sfx.correct()
          later(() => finish(false), FINISH_PAUSE_MS)
        }
        setPosition(session.position)
      } else if (result === 'wrong') {
        stepClean.current = false
        setWrongKey(e.midi)
        setWrongCount((n) => n + 1)
        setShake((n) => n + 1)
        comboRef.current = 0
        setCombo(0)
        sfx.wrong()
        setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
        later(() => setWrongKey((k) => (k === e.midi ? null : k)), WRONG_FLASH_MS)
        if (session.failed) {
          sfx.fail()
          later(() => finish(true), WRONG_FLASH_MS + 300)
        }
      }
    })
    const pending = timers.current
    return () => {
      unsubscribe()
      stopFinish()
      pending.forEach((cancel) => cancel())
    }
  }, [session, lesson.clef, pattern])

  useEffect(() => {
    if (!flash.length) return
    const t = window.setTimeout(() => setFlash([]), 250)
    return () => clearTimeout(t)
  }, [flash])

  const done = position >= session.steps.length
  const pageIndex = Math.max(
    0,
    pages.findLastIndex((p) => p.start <= Math.min(position, session.steps.length - 1)),
  )
  const page = pages[pageIndex]
  const states: StepState[] = page.steps.map((_, i) =>
    page.start + i < position ? 'done' : page.start + i === position ? 'current' : 'todo',
  )
  const pending = done ? [] : session.steps[position].notes.map((n) => n.midi).filter((m) => !hit.includes(m))
  const partIndex = page.steps[0].melody
  const melodyTitle = pattern ? pattern.titles[partIndex] : lesson.melodies?.[partIndex]?.title
  const twoKeys = !done && session.steps[position].notes.length > 1
  const tip = done ? null : fingerTip(session.steps[position])
  // Scales and arpeggios: only the current part's keys, so a lesson spanning four octaves stays playable on a phone.
  const keyboard = useMemo(
    () => (pattern ? stepsKeyboard(pattern.steps.filter((s) => s.melody === partIndex)) : lesson.keyboard),
    [pattern, partIndex, lesson.keyboard],
  )
  useEffect(() => setComputerKeyboardBase(keyboard.low), [keyboard.low])

  const marks: Partial<Record<number, KeyMark>> = {}
  if (wrongCount >= HINT_AFTER) for (const m of pending) marks[m] = 'hint'
  for (const m of flash) marks[m] = 'correct'
  for (const m of hit) marks[m] = 'correct'
  if (wrongKey !== null) marks[wrongKey] = 'wrong'

  const progress = position / session.steps.length

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
            {Math.min(position + 1, session.steps.length)}/{session.steps.length}
          </span>
        )}
      </header>

      <div className="prompt-row">
        <Mascot mood={mood.mood} pulse={mood.pulse} size={76} />
        <div>
          <p className="prompt">{melodyTitle ? `🎶 ${melodyTitle}` : 'Melodiyi çal'}</p>
          {tip ? (
            <p className={`finger-tip ${tip.cross ? 'cross' : ''}`} key={tip.text}>
              {tip.text}
            </p>
          ) : (
            <p className="small muted">
              {twoKeys
                ? 'İki tuşa birlikte bas: sol el alttaki, sağ el üstteki nota.'
                : 'Mavi notayı çal, melodi ilerlesin.'}
            </p>
          )}
          {combo >= 3 && (
            <p className={`combo ${combo % COMBO_STEP === 0 ? 'big' : ''}`} key={`c${combo}`}>
              🔥 {combo} doğru üst üste{combo % COMBO_STEP === 0 ? '!' : ''}
            </p>
          )}
        </div>
      </div>

      <div
        key={shake}
        className={`staff-wrap melody-wrap ${shake && wrongKey !== null ? 'shake' : ''}`}
        data-pending={pending.join(' ')}
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

      <p className={`feedback ${wrongKey !== null ? 'bad' : ''}`} aria-live="polite">
        {wrongKey !== null
          ? `${nameOf(wrongKey)} değil, tekrar dene`
          : wrongCount >= HINT_AFTER && pending.length
            ? `İpucu: ${pending.map(nameOf).join(' + ')}`
            : hit.length
              ? 'Şimdi öbür el!'
              : ' '}
      </p>

      <PianoKeyboard low={keyboard.low} high={keyboard.high} marks={marks} showLabels={showKeyLabels} />
    </div>
  )
}
