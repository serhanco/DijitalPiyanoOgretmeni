// "Kulak Dedektifi": Notiş in a detective hat plays a sound, the player
// solves the case on the buttons or on the keys. Solved cases are pinned to
// the case board; a wrong answer plays the chosen sound and then the right
// one, so the difference can be heard.

import { motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playParts, type SoundPart } from '../audio/earSound'
import { initPiano } from '../audio/piano'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { intervalInfo } from '../games/ear/intervals'
import {
  answerLabel,
  buildCases,
  contrastOf,
  type EarEvent,
  type EarPrompt,
  EarSession,
  earReport,
} from '../games/ear/session'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { gameNow, gameTimeout } from '../input/gameClock'
import { subscribe } from '../input/inputBus'
import { solfegeName } from '../music/notes'
import { HEARTS_PER_LESSON } from '../progress/gamification'
import { useSettings } from '../state/settings'
import { useFinishRequest } from '../testing/finishRequest'

const NEXT_PAUSE_MS = 1100
const FINISH_PAUSE_MS = 900
/** On key cases, light the right key after this many wrong presses. */
const HINT_AFTER = 2

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

/** Exposed for the smoke test. */
export interface EarState {
  session: EarSession
  /** The current case has been played: answers count. */
  heard: () => boolean
}

const WAY_WORDS = { up: 'çıkan', down: 'inen', together: 'aynı anda' } as const

function instruction(p: EarPrompt): string {
  switch (p.task) {
    case 'direction':
      return 'İki nota çalacak. İkincisi yükseldi mi, alçaldı mı?'
    case 'pitch':
      return 'Önce Do, sonra gizli nota çalar. Gizli notayı klavyede bul!'
    case 'interval': {
      const way = p.together ? 'together' : p.notes[1] > p.notes[0] ? 'up' : 'down'
      return `Bu ${WAY_WORDS[way]} aralık hangisi?`
    }
    case 'sing':
      return `${solfegeName(p.notes[0], false)} yanıyor. Ardından gelen notayı kulağınla bul ve çal!`
    case 'chord':
      return 'Bu akor hangi renkte?'
  }
}

/** What a case sounds like: the reference Do first when there is one. */
function soundOf(p: EarPrompt): SoundPart[] {
  const main = { notes: p.notes, together: p.together }
  return p.reference !== undefined ? [{ notes: [p.reference] }, main] : [main]
}

/** The short name pinned on the case board. */
function pinLabel(p: EarPrompt): string {
  if (p.task === 'interval') return intervalInfo(Number(p.answer)).short
  if (p.task === 'sing') return intervalInfo(Math.abs(p.notes[1] - p.notes[0])).short
  if (p.task === 'direction') return p.answer === 'up' ? '⬆' : p.answer === 'down' ? '⬇' : '＝'
  if (p.task === 'chord') return answerLabel(p, p.answer).slice(0, 3)
  return solfegeName(Number(p.answer), false)
}

export function EarScreen({ lesson, onFinish, onExit }: Props) {
  const { showKeyLabels, relaxedMode, ignoreOctave } = useSettings()
  const session = useMemo(
    () => new EarSession(buildCases(lesson.ear!), { hearts: relaxedMode ? null : HEARTS_PER_LESSON, ignoreOctave }),
    [lesson.ear, relaxedMode, ignoreOctave],
  )
  const [started, setStarted] = useState(false)
  const [heard, setHeard] = useState(false)
  const heardRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const [lit, setLit] = useState<number[]>([])
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const [, setTick] = useState(0)
  const timers = useRef<(() => void)[]>([])
  const stopSound = useRef<(() => void) | null>(null)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    const state: EarState = { session, heard: () => heardRef.current }
    ;(window as unknown as { __dpoEar?: EarState }).__dpoEar = state
  }, [session])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(gameTimeout(fn, Math.max(0, ms)))
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((cancel) => cancel())
      stopSound.current?.()
    }
  }, [])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), mood.mood === 'cheer' ? 1500 : 800)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  const finish = useCallback(() => onFinishRef.current(earReport(session)), [session])
  useFinishRequest(finish)

  /** Play sounds; light the reference Do and the shown first note of `p` as they sound. */
  const play = useCallback(
    (parts: SoundPart[], p: EarPrompt, then?: () => void) => {
      stopSound.current?.()
      setPlaying(true)
      const { ms, cancel } = playParts(parts, {
        onNote: (_, midi) => {
          // Only the reference Do and the given first note light up: the rest is heard.
          if (midi === p.reference || midi === p.shown) {
            setLit([midi])
            later(() => setLit((l) => l.filter((m) => m !== midi)), 500)
          }
        },
      })
      stopSound.current = cancel
      later(() => {
        setPlaying(false)
        then?.()
      }, ms + 150)
    },
    [later],
  )

  const openCase = useCallback(() => {
    const p = session.current
    if (!p) return
    heardRef.current = false
    setHeard(false)
    setWrong([])
    setSolved(false)
    setIndex(session.position)
    play(soundOf(p), p, () => {
      session.markShown(gameNow())
      heardRef.current = true
      setHeard(true)
    })
  }, [session, play])

  const start = () => {
    if (started) return
    setStarted(true)
    // Wait for the piano samples, but never long: without them a soft synthesized tone plays.
    const wait = new Promise((resolve) => window.setTimeout(resolve, 1500))
    void Promise.race([initPiano().catch(() => undefined), wait]).then(openCase)
  }

  const replay = () => {
    const p = session.current
    if (!p || playing) return
    session.replay()
    play(soundOf(p), p)
  }

  const handle = useCallback(
    (events: EarEvent[], answer: string) => {
      const p = session.prompts[session.position] ?? session.prompts[session.prompts.length - 1]
      for (const ev of events) {
        if (ev.type === 'right') {
          // The next case must be heard before it can be answered.
          heardRef.current = false
          sfx.correct()
          setSolved(true)
          setMood((m) => ({ mood: 'happy', pulse: m.pulse + 1 }))
          if (!session.done) later(openCase, NEXT_PAUSE_MS)
        } else if (ev.type === 'wrong') {
          sfx.wrong()
          setWrong((w) => [...w, answer])
          setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
          if (!session.done) later(() => play(contrastOf(p, answer), p), 350)
        } else if (ev.type === 'complete') {
          sfx.combo()
          setMood((m) => ({ mood: 'cheer', pulse: m.pulse + 1 }))
          later(finish, FINISH_PAUSE_MS)
        } else if (ev.type === 'failed') {
          sfx.fail()
          later(finish, FINISH_PAUSE_MS)
        }
      }
      setTick((t) => t + 1)
    },
    [session, later, openCase, play, finish],
  )

  const choose = (id: string) => {
    if (solved || playing) return
    const events = session.choose(id, gameNow())
    if (events.length) handle(events, id)
  }

  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'on' || !heardRef.current) return
        const events = session.press(e.midi, e.time)
        if (events.length) handle(events, String(e.midi))
      }),
    [session, handle],
  )

  const p = session.prompts[index]
  const onKeys = !p.options
  const marks: Partial<Record<number, KeyMark>> = {}
  for (const m of lit) marks[m] = 'hint'
  if (p.task === 'sing' && started) marks[p.notes[0]] = 'hint'
  if (onKeys) {
    const last = wrong[wrong.length - 1]
    if (last !== undefined && !solved) marks[Number(last)] = 'wrong'
    if (solved || wrong.length >= HINT_AFTER) marks[Number(p.answer)] = solved ? 'correct' : 'hint'
  }
  const lastWrong = wrong[wrong.length - 1]
  const feedback = solved
    ? '🔎 Vaka çözüldü!'
    : lastWrong !== undefined
      ? `${answerLabel(p, lastWrong)} değil. Dinle: önce senin cevabın, sonra doğrusu.`
      : playing
        ? '👂 Dinle…'
        : ' '

  return (
    <div className="game ear">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={Math.round((session.solved / session.prompts.length) * 100)}
        >
          <div className="progress-fill" style={{ width: `${(session.solved / session.prompts.length) * 100}%` }} />
        </div>
        {session.hearts !== null ? (
          <span className="hearts" aria-label={`${session.heartsLeft} can`}>
            ❤️ {session.heartsLeft}
          </span>
        ) : (
          <span className="counter">
            {Math.min(index + 1, session.prompts.length)}/{session.prompts.length}
          </span>
        )}
      </header>

      <div className="prompt-row">
        <Mascot mood={playing ? 'think' : mood.mood} pulse={mood.pulse} size={76} outfit="detective" />
        <div>
          <p className="prompt">
            🔍 Vaka {Math.min(index + 1, session.prompts.length)}/{session.prompts.length}
          </p>
          <p className="small muted">
            {started ? instruction(p) : 'Notiş dedektif oldu! Her vakada bir ses duyacaksın; dikkatle dinle ve çöz.'}
          </p>
        </div>
      </div>

      <div className="ear-case" data-heard={heard} data-task={p.task} data-solved={solved}>
        <div className="case-board" aria-label="Vaka panosu">
          {session.prompts.map((c, i) => {
            const r = session.records[i]
            const done = r.answeredAt !== null
            return (
              <span
                key={i}
                className={`case-pin ${done ? (r.wrong.length ? 'late' : 'clean') : ''} ${i === index && !done ? 'open' : ''}`}
              >
                {done ? pinLabel(c) : i === index && started ? '?' : ''}
              </span>
            )
          })}
        </div>
        {solved && (
          <motion.div
            key={index}
            className="case-stamp"
            initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          >
            ÇÖZÜLDÜ
          </motion.div>
        )}
        {!started ? (
          <button className="btn ear-start" onClick={start}>
            Başla
          </button>
        ) : (
          <button className="btn btn-secondary listen-btn" onClick={replay} disabled={playing || solved}>
            🔊 Tekrar dinle
          </button>
        )}
        {started && p.options && (
          <div className="quiz-options ear-options">
            {p.options.map((o) => (
              <button
                key={o.id}
                data-option={o.id}
                className={`quiz-option ${solved && o.id === p.answer ? 'right' : wrong.includes(o.id) ? 'wrong' : ''}`}
                disabled={!heard || wrong.includes(o.id)}
                onClick={() => choose(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className={`feedback ${solved ? 'good' : lastWrong !== undefined ? 'bad' : ''}`} aria-live="polite">
        {feedback}
      </p>

      {onKeys && (
        <PianoKeyboard
          low={lesson.keyboard.low}
          high={lesson.keyboard.high}
          marks={marks}
          showLabels={showKeyLabels && (solved || wrong.length >= HINT_AFTER)}
        />
      )}
    </div>
  )
}
