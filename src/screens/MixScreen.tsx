// Günün Karışımı: the phases built from the due cards, each played on the
// screen of its lesson, with Notiş between them. A phase out of hearts does
// not end the mix. The phases' reports are joined by `mixReport`, and the
// cards each phase played travel with it in `cards`.

import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { Mascot, type MascotMood } from '../components/Mascot'
import type { SessionSummary } from '../games/noteHunter/summary'
import { setComputerKeyboardBase } from '../input/computerKeyboard'
import { mixReport } from '../progress/mix'
import { cardResults, type CardResult, chordLabel, countsText } from '../progress/srs'
import { arpeggioTitle } from '../games/chords/arpeggio'
import { partTitle } from '../games/scales/steps'
import { finishPending, useFinishRequest } from '../testing/finishRequest'
import { solfegeName } from '../music/notes'
import { LessonPlayer, type LessonScreenProps } from './LessonPlayer'

type Stage = 'intro' | 'play' | 'between'

declare global {
  interface Window {
    __dpoMix?: { stage: Stage; phase: number; phases: string[] }
  }
}

export function MixScreen({ lesson, onFinish, onExit }: LessonScreenProps) {
  const spec = lesson.mix!
  const n = spec.phases.length
  const [stage, setStage] = useState<Stage>('intro')
  const [summaries, setSummaries] = useState<SessionSummary[]>([])
  const [mood, setMood] = useState<{ mood: MascotMood; pulse: number }>({ mood: 'happy', pulse: 0 })
  const phase = summaries.length
  const last = summaries.at(-1)
  const over = phase === n

  const stageRef = useRef(stage)
  const summariesRef = useRef(summaries)
  const cardsRef = useRef<CardResult[]>([])
  useEffect(() => {
    stageRef.current = stage
    summariesRef.current = summaries
  })
  const report = (list: SessionSummary[]): SessionSummary => ({ ...mixReport(spec, list), cards: cardsRef.current })
  // "Dersi bitir" between the phases ends the mix with what was played.
  useFinishRequest(() => {
    if (stageRef.current !== 'play') onFinish(report(summariesRef.current))
  })

  useEffect(() => {
    window.__dpoMix = { stage, phase, phases: spec.phases.map((p) => p.label) }
  })
  useEffect(() => () => void delete window.__dpoMix, [])

  const play = () => {
    setComputerKeyboardBase(spec.phases[phase].lesson.keyboard.low)
    setStage('play')
  }

  const onPhase = (s: SessionSummary) => {
    const next = [...summariesRef.current, s]
    summariesRef.current = next
    cardsRef.current = [...cardsRef.current, ...cardResults(spec.phases[next.length - 1].lesson, s)]
    // A test finish inside a phase ends the whole mix.
    if (finishPending()) {
      onFinish(report(next))
      return
    }
    const good = !s.failed && s.accuracy >= 0.8
    setMood((m) => ({ mood: good ? 'cheer' : 'sad', pulse: m.pulse + 1 }))
    if (good) sfx.correct()
    setSummaries(next)
    setStage('between')
  }

  const final = useMemo(() => (over ? mixReport(spec, summaries) : null), [over, spec, summaries])

  if (stage === 'play')
    return <LessonPlayer key={phase} lesson={spec.phases[phase].lesson} onFinish={onPhase} onExit={onExit} />

  const due = countsText(spec.due)
  const line =
    stage === 'intro'
      ? due
        ? `Bugün tekrar zamanı gelenler: ${due}. Hadi bakalım!`
        : 'Kısa bir tekrar turu. Hadi bakalım!'
      : over
        ? 'Karışım bitti! Kartların yeni kutularına geçiyor.'
        : last!.failed
          ? 'Canların bitti ama sorun değil: zorlandıkların yarın yine gelecek.'
          : last!.accuracy >= 0.9
            ? 'Harika! Bunları iyi biliyorsun.'
            : 'Güzel! Zorlandıkların daha sık gelecek.'

  return (
    <div className="game boss mix" data-stage={stage}>
      <header className="game-top">
        <button className="icon-btn" onClick={onExit} aria-label="Dersten çık">
          ✕
        </button>
        <div className="boss-steps" aria-label="Aşamalar">
          {spec.phases.map((p, i) => (
            <span
              key={p.label}
              className={`boss-step ${i < phase ? (summaries[i].failed ? 'lost' : 'done') : i === phase && !over ? 'now' : ''}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <span className="counter">
          🔀 {Math.min(phase, n)}/{n}
        </span>
      </header>

      <section className="boss-arena">
        <h2 className="boss-name">Günün Karışımı</h2>
        <div className="boss-stage">
          <p className="boss-say" key={line}>
            {line}
          </p>
          <Mascot mood={mood.mood} pulse={mood.pulse} size={120} />
        </div>

        {stage === 'intro' ? (
          <>
            <ol className="boss-plan">
              {spec.phases.map((p) => (
                <li key={p.label}>
                  <b>{p.label}</b> <span className="muted">{phaseDetail(p.lesson)}</span>
                </li>
              ))}
            </ol>
            {spec.stretch.length > 0 && (
              <p className="small mix-stretch">
                ✨ Yeni: {spec.stretch.map((m) => solfegeName(m)).join(', ')}. Bildiğin notaların hemen yanındalar.
              </p>
            )}
            <button className="btn boss-go" onClick={play}>
              ▶ Başla
            </button>
          </>
        ) : (
          <>
            <p className="boss-result">
              {spec.phases[phase - 1].label}: <b>%{Math.round(last!.accuracy * 100)}</b>
              {last!.failed && ', canların bitti'}
            </p>
            {over ? (
              <button className="btn boss-go" onClick={() => onFinish({ ...final!, cards: cardsRef.current })}>
                Sonuçları gör
              </button>
            ) : (
              <button className="btn boss-go" onClick={play}>
                ▶ {phase + 1}. aşama: {spec.phases[phase].label}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}

/** What a phase holds: the notes, chords, scales or arpeggios by name. */
function phaseDetail(l: LessonScreenProps['lesson']): string {
  if (l.chords) return l.chords.chords.map(chordLabel).join(', ')
  if (l.scales) return l.scales.map(partTitle).join(', ')
  if (l.arpeggios) return l.arpeggios.map(arpeggioTitle).join(', ')
  return l.notes.map((m) => solfegeName(m)).join(' ')
}
