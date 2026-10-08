import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { canSpeak, speak, stopSpeaking } from '../audio/speech'
import { Mascot, type MascotMood } from '../components/Mascot'
import { type KeyMark, PianoKeyboard } from '../components/PianoKeyboard'
import { TheoryArt } from '../components/TheoryArt'
import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { QuizSession, summarizeQuiz } from '../games/theory/quiz'
import { subscribe } from '../input/inputBus'
import { pitchClass, solfegeName } from '../music/notes'
import { useSettings } from '../state/settings'

// The treble clef in the staff pictures is a Bravura glyph; VexFlow registers the font.
void import('vexflow/bravura').then(() => document.fonts?.load('30px Bravura')).catch(() => undefined)

const NEXT_PAUSE_MS = 700
/** Light the right key after this many wrong presses on a key question. */
const HINT_AFTER = 2

interface Props {
  lesson: NoteLesson
  onFinish: (summary: SessionSummary) => void
  onExit: () => void
}

/** Exposed for the smoke test. */
export interface TheoryState {
  phase: 'cards' | 'quiz'
  card: number
  question: number
  /** Key questions: the pitch class to press; choice questions: the right option's index. */
  answer: number | null
  type: 'choice' | 'key' | null
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function TheoryScreen({ lesson, onFinish, onExit }: Props) {
  const spec = lesson.theory!
  const { showKeyLabels, narration } = useSettings()
  const quiz = useMemo(() => new QuizSession(spec), [spec])
  // Options in a fresh order each time, so the right answer is not always in the same place.
  const orders = useMemo(
    () => spec.questions.map((q) => (q.type === 'choice' ? shuffle(q.options.map((_, i) => i)) : [])),
    [spec],
  )
  const [card, setCard] = useState(0)
  const [phase, setPhase] = useState<'cards' | 'quiz'>('cards')
  const [question, setQuestion] = useState(0)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'idle', pulse: 0 })
  const timers = useRef<number[]>([])
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const q = spec.questions[question]
  const steps = spec.cards.length + spec.questions.length
  const done = phase === 'cards' ? card : spec.cards.length + question + (solved ? 1 : 0)

  useEffect(() => {
    const state: TheoryState = {
      phase,
      card,
      question,
      answer: phase === 'quiz' ? (q.type === 'choice' ? q.answer : q.pitchClass) : null,
      type: phase === 'quiz' ? q.type : null,
    }
    ;(window as unknown as { __dpoTheory?: TheoryState }).__dpoTheory = state
  }, [phase, card, question, q])

  useEffect(() => {
    if (mood.mood === 'idle') return
    const t = window.setTimeout(() => setMood((m) => ({ ...m, mood: 'idle' })), 900)
    return () => clearTimeout(t)
  }, [mood.mood, mood.pulse])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      stopSpeaking()
    },
    [],
  )

  // What the 🔊 button (and the narration setting) reads: the card, or the question.
  const spoken =
    phase === 'cards' ? `${spec.cards[card].title}. ${spec.cards[card].text}` : spec.questions[question].prompt
  useEffect(() => {
    if (narration) speak(spoken)
  }, [narration, spoken])

  const answered = (result: ReturnType<QuizSession['choose']>, value: number) => {
    if (result === 'correct') {
      setSolved(true)
      sfx.correct()
      setMood((m) => ({ mood: 'happy', pulse: m.pulse + 1 }))
      timers.current.push(
        window.setTimeout(() => {
          if (quiz.done) {
            onFinishRef.current(summarizeQuiz(spec, quiz.records))
            return
          }
          setQuestion(quiz.position)
          setWrong([])
          setSolved(false)
        }, NEXT_PAUSE_MS),
      )
    } else if (result === 'wrong') {
      setWrong((w) => [...w, value])
      sfx.wrong()
      setMood((m) => ({ mood: 'sad', pulse: m.pulse + 1 }))
    }
  }
  const answeredRef = useRef(answered)
  useEffect(() => {
    answeredRef.current = answered
  })

  // Key questions take presses from every input (MIDI, screen, computer keyboard).
  useEffect(
    () =>
      subscribe((e) => {
        if (e.type !== 'on' || phase !== 'quiz' || solved) return
        answeredRef.current(quiz.press(e.midi), e.midi)
      }),
    [quiz, phase, solved],
  )

  const choose = (option: number) => {
    if (solved || wrong.includes(option)) return
    answered(quiz.choose(option), option)
  }

  const marks: Partial<Record<number, KeyMark>> = {}
  if (phase === 'quiz' && q.type === 'key') {
    const last = wrong[wrong.length - 1]
    if (last !== undefined && !solved) marks[last] = 'wrong'
    if (wrong.length >= HINT_AFTER || solved)
      for (let m = lesson.keyboard.low; m <= lesson.keyboard.high; m++)
        if (pitchClass(m) === q.pitchClass) marks[m] = solved ? 'correct' : 'hint'
  }

  const c = spec.cards[card]
  return (
    <div className="game theory">
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round((done / steps) * 100)}>
          <div className="progress-fill" style={{ width: `${(done / steps) * 100}%` }} />
        </div>
        <span className="counter">
          {phase === 'cards' ? `📖 ${card + 1}/${spec.cards.length}` : `❓ ${question + 1}/${spec.questions.length}`}
        </span>
      </header>

      {phase === 'cards' ? (
        <section className="theory-card" key={`c${card}`} data-card={card}>
          <div className="prompt-row">
            <Mascot mood={card === 0 ? 'happy' : 'think'} size={64} />
            <h2>{c.title}</h2>
            {canSpeak() && (
              <button className="icon-btn speak-btn" onClick={() => speak(spoken)} aria-label="Sesli oku">
                🔊
              </button>
            )}
          </div>
          {c.art && <TheoryArt art={c.art} />}
          <p className="theory-text">{c.text}</p>
          <div className="actions">
            {card > 0 && (
              <button className="btn btn-secondary" onClick={() => setCard(card - 1)}>
                Geri
              </button>
            )}
            <button
              className="btn theory-next"
              onClick={() => (card + 1 < spec.cards.length ? setCard(card + 1) : setPhase('quiz'))}
            >
              {card + 1 < spec.cards.length ? 'Devam' : 'Teste başla'}
            </button>
          </div>
        </section>
      ) : (
        <section className="theory-quiz" key={`q${question}`} data-question={question} data-type={q.type}>
          <div className="prompt-row">
            <Mascot mood={mood.mood} pulse={mood.pulse} size={64} />
            <p className="prompt">{q.prompt}</p>
            {canSpeak() && (
              <button className="icon-btn speak-btn" onClick={() => speak(spoken)} aria-label="Sesli oku">
                🔊
              </button>
            )}
          </div>
          {q.art && <TheoryArt art={q.art} />}
          {q.type === 'choice' && (
            <div className="quiz-options">
              {orders[question].map((i) => (
                <button
                  key={i}
                  data-option={i}
                  className={`quiz-option ${solved && i === q.answer ? 'right' : wrong.includes(i) ? 'wrong' : ''}`}
                  disabled={wrong.includes(i)}
                  onClick={() => choose(i)}
                >
                  {q.options[i]}
                </button>
              ))}
            </div>
          )}
          <p className={`feedback ${solved ? 'good' : wrong.length ? 'bad' : ''}`} aria-live="polite">
            {solved
              ? 'Doğru!'
              : wrong.length
                ? `💡 ${q.explain}${q.type === 'key' ? ` Bastığın tuş: ${solfegeName(wrong[wrong.length - 1], false)}.` : ''}`
                : ' '}
          </p>
          {q.type === 'key' && (
            <PianoKeyboard
              low={lesson.keyboard.low}
              high={lesson.keyboard.high}
              marks={marks}
              showLabels={showKeyLabels && wrong.length >= HINT_AFTER}
            />
          )}
        </section>
      )}
    </div>
  )
}
