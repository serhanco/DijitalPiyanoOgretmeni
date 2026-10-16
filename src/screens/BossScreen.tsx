// A unit boss fight: three phases, each one of the unit's lessons played on
// its own screen. Between them the boss takes the hit (as hard as the phase
// was played) on a small stage; a phase that runs out of hearts ends the
// fight. The phases' reports are joined by `bossReport`.

import { useEffect, useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { BossMonster, type BossMood } from '../components/BossMonster'
import { BOSS_WIN } from '../games/boss/bosses'
import { BOSS_HP, bossReport, hpAfter, phaseDamage } from '../games/boss/report'
import type { SessionSummary } from '../games/noteHunter/summary'
import { gameTimeout } from '../input/gameClock'
import { setComputerKeyboardBase } from '../input/computerKeyboard'
import { finishPending, useFinishRequest } from '../testing/finishRequest'
import { LessonPlayer, type LessonScreenProps } from './LessonPlayer'

type Stage = 'intro' | 'play' | 'between'

declare global {
  interface Window {
    __dpoBoss?: { stage: Stage; phase: number; hp: number; defeated: boolean | null }
  }
}

function HpBar({ hp }: { hp: number }) {
  const frac = Math.max(0, Math.min(1, hp / BOSS_HP))
  return (
    <div
      className="boss-hp"
      role="meter"
      aria-label="Boss'un canı"
      aria-valuenow={Math.round(hp)}
      aria-valuemax={BOSS_HP}
    >
      <div className={`boss-hp-fill ${frac < 0.34 ? 'low' : ''}`} style={{ width: `${frac * 100}%` }} />
      <span>❤️ {Math.round(hp)}</span>
    </div>
  )
}

export function BossScreen({ lesson, onFinish, onExit }: LessonScreenProps) {
  const spec = lesson.boss!
  const n = spec.phases.length
  const [stage, setStage] = useState<Stage>('intro')
  const [summaries, setSummaries] = useState<SessionSummary[]>([])
  const [mood, setMood] = useState<BossMood>('idle')
  const [pulse, setPulse] = useState(0)
  const phase = summaries.length
  const accs = summaries.map((s) => s.accuracy)
  const hp = hpAfter(accs, n)
  const last = summaries.at(-1)
  const lost = !!last?.failed
  const over = lost || phase === n
  const defeated = over && !lost && accs.reduce((a, b) => a + b, 0) / n >= BOSS_WIN
  // The bar starts from the hit points before the last phase and drains to the new value.
  const [shownHp, setShownHp] = useState(BOSS_HP)

  const stageRef = useRef(stage)
  const summariesRef = useRef(summaries)
  useEffect(() => {
    stageRef.current = stage
    summariesRef.current = summaries
  })
  // "Dersi bitir" between the phases ends the fight with what was played.
  useFinishRequest(() => {
    if (stageRef.current !== 'play') onFinish(bossReport(spec, summariesRef.current))
  })

  useEffect(() => {
    window.__dpoBoss = { stage, phase, hp, defeated: over ? defeated : null }
  })
  useEffect(() => () => void delete window.__dpoBoss, [])

  // After the hit: the bar drains, then the boss gets angry, falls or laughs.
  useEffect(() => {
    if (stage !== 'between' || lost) return
    const cancels = [
      gameTimeout(() => setShownHp(hp), 250),
      gameTimeout(() => {
        if (!over) setMood('angry')
        else if (defeated) {
          setMood('defeated')
          sfx.fanfare()
        } else setMood('laugh')
      }, 900),
    ]
    return () => cancels.forEach((c) => c())
  }, [stage, lost, over, defeated, hp])

  const play = () => {
    setComputerKeyboardBase(spec.phases[phase].lesson.keyboard.low)
    setMood('idle')
    setStage('play')
  }

  const onPhase = (s: SessionSummary) => {
    const next = [...summariesRef.current, s]
    summariesRef.current = next
    // A test finish inside a phase ends the whole fight.
    if (finishPending()) {
      onFinish(bossReport(spec, next))
      return
    }
    // The hit lands: the boss flinches (or laughs when the hearts ran out).
    if (s.failed) {
      setMood('laugh')
      setShownHp(
        hpAfter(
          next.map((x) => x.accuracy),
          n,
        ),
      )
      sfx.fail()
    } else {
      setMood('hurt')
      setPulse((p) => p + 1)
      setShownHp(hpAfter(accs, n))
      sfx.correct()
    }
    setSummaries(next)
    setStage('between')
  }

  const report = useMemo(() => bossReport(spec, summaries), [spec, summaries])

  if (stage === 'play')
    return <LessonPlayer key={phase} lesson={spec.phases[phase].lesson} onFinish={onPhase} onExit={onExit} />

  const damage = last ? Math.round(phaseDamage(last.accuracy, n)) : 0
  const line =
    stage === 'intro'
      ? spec.taunt
      : lost
        ? 'Ha ha! Canların bitti. Biraz çalış da öyle gel!'
        : over
          ? defeated
            ? 'Ahh... Yendin beni. Bu ünite artık senin!'
            : `Ha! Daha ${Math.round(hp)} canım var. Bir dahaki sefere!`
          : last!.accuracy >= 0.9
            ? 'Ay! Bu çok acıttı!'
            : 'Hı! Bu kadar mı?'

  return (
    <div className="game boss" data-stage={stage}>
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
          👾 {Math.min(phase, n)}/{n}
        </span>
      </header>

      <section className="boss-arena">
        <h2 className="boss-name">{spec.name}</h2>
        <HpBar hp={stage === 'intro' ? BOSS_HP : shownHp} />
        <div className="boss-stage">
          <p className="boss-say" key={line}>
            {line}
          </p>
          <BossMonster look={spec.look} name={spec.name} mood={mood} pulse={pulse} size={150} />
          {stage === 'between' && !lost && damage > 0 && (
            <span className="boss-damage" key={phase}>
              −{damage}
            </span>
          )}
        </div>

        {stage === 'intro' ? (
          <>
            <ol className="boss-plan">
              {spec.phases.map((p) => (
                <li key={p.label}>
                  <b>{p.label}</b> <span className="muted">{p.lesson.title.replace(/^Aşama \d+\/\d+: /, '')}</span>
                </li>
              ))}
            </ol>
            <p className="small muted">
              Üç aşamada ortalama %{Math.round(BOSS_WIN * 100)} başarıyla boss yenilir. Bir aşamada canların biterse
              boss kazanır.
            </p>
            <button className="btn boss-go" onClick={play}>
              ⚔️ Savaşa başla
            </button>
          </>
        ) : (
          <>
            <p className="boss-result">
              {phase}. aşama ({spec.phases[phase - 1].label}): <b>%{Math.round(last!.accuracy * 100)}</b>
              {lost ? ', canların bitti' : `, ${damage} hasar`}
            </p>
            {over ? (
              <button className="btn boss-go" onClick={() => onFinish(report)}>
                {defeated ? '🏆 Sonuçları gör' : 'Sonuçları gör'}
              </button>
            ) : (
              <button className="btn boss-go" onClick={play}>
                ⚔️ {phase + 1}. aşama: {spec.phases[phase].label}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  )
}
