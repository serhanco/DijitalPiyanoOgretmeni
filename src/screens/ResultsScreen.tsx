import type { MemorySummary } from '../games/memory/engine'
import { type NoteLesson, PATTERN_KINDS } from '../games/noteHunter/lessons'
import type { ScaleSummary } from '../games/scales/steps'
import type { HandStat, SessionSummary, SyncSummary, TimingSummary } from '../games/noteHunter/summary'
import { describeOffset, JUDGEMENT_LABELS, JUDGEMENTS } from '../rhythm/timing'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { sfx } from '../audio/sfx'
import { CountUp } from '../components/Celebration'
import { burstConfetti } from '../components/confetti'
import { Mascot, type MascotMood } from '../components/Mascot'
import { GoalRing } from '../components/TopBar'
import { type Clef, CLEF_NAMES, solfegeName } from '../music/notes'
import type { Reward } from '../state/profile'

interface Props {
  lesson: NoteLesson
  summary: SessionSummary
  reward: Reward
  onRetry: () => void
  onHome: () => void
  /** Start a short drill on these notes, on their staff (or both staves). */
  onPractice: (notes: number[], clef: Clef | 'grand') => void
}

const pct = (x: number) => `%${Math.round(x * 100)}`
const secs = (ms: number | null) => (ms === null ? '–' : `${(ms / 1000).toFixed(1)} sn`)

function Bar({ value }: { value: number }) {
  const tone = value >= 0.9 ? 'good' : value >= 0.7 ? 'mid' : 'low'
  return (
    <div className="bar">
      <div className={`bar-fill ${tone}`} style={{ width: `${Math.max(value, 0.02) * 100}%` }} />
    </div>
  )
}

/** Timing distribution and how early or late the player tends to be. */
function TimingCard({ timing }: { timing: TimingSummary }) {
  const max = Math.max(1, ...JUDGEMENTS.map((j) => timing.counts[j]))
  const mean = timing.meanOffsetMs
  // The strip spans ±200 ms around the beat.
  const pos = (ms: number) => `${50 + Math.max(-50, Math.min(50, ms / 4))}%`
  return (
    <section className="card timing-card">
      <h2>Zamanlama</h2>
      <div className="timing-bars">
        {JUDGEMENTS.map((j) => (
          <div key={j} className="timing-row">
            <span>{JUDGEMENT_LABELS[j]}</span>
            <div className="bar">
              <div className={`bar-fill judge-${j}`} style={{ width: `${(timing.counts[j] / max) * 100}%` }} />
            </div>
            <span className="topic-pct">{timing.counts[j]}</span>
          </div>
        ))}
      </div>
      {mean !== null && (
        <>
          <p className="timing-mean">
            Ortalama sapma: <b>{describeOffset(mean)}</b>
            {timing.meanAbsOffsetMs !== null && (
              <> · vuruştan ortalama uzaklık {Math.round(timing.meanAbsOffsetMs)} ms</>
            )}
          </p>
          <div className="offset-strip" aria-hidden>
            <span className="offset-zone" />
            <span className="offset-zero" />
            {timing.offsets.map((o, i) => (
              <span key={i} className="offset-dot" style={{ left: pos(o) }} />
            ))}
            <span className="offset-mean" style={{ left: pos(mean) }} />
          </div>
          <p className="small muted offset-axis">
            <span>erken</span>
            <span>vuruş</span>
            <span>geç</span>
          </p>
        </>
      )}
      <p className="small muted">
        Tempo {timing.bpm} BPM
        {timing.rests > 0 && (
          <>
            {' '}
            · {timing.rests} esin {timing.restsKept} tanesinde sustun
          </>
        )}
        {timing.stray > 0 && <> · {timing.stray} fazladan basış</>}
        {timing.bestCombo >= 3 && <> · en uzun seri {timing.bestCombo}</>}
      </p>
    </section>
  )
}

/** Accuracy and speed of each hand, and how well they played together. */
function HandsCard({ hands, sync }: { hands?: HandStat[]; sync?: SyncSummary }) {
  const shown = hands?.filter((h) => h.shown > 0) ?? []
  return (
    <section className="card hands-card">
      <h2>Ellere göre</h2>
      {shown.map((h) => (
        <div key={h.hand} className="topic-row">
          <span>
            {h.hand === 'right' ? '🫱' : '🫲'} {h.label}
          </span>
          <Bar value={h.accuracy} />
          <span className="topic-pct">{pct(h.accuracy)}</span>
          <span className="small muted hand-speed">{secs(h.avgReactionMs)}</span>
        </div>
      ))}
      {shown.length === 2 && <p className="small muted">{handAdvice(shown[0], shown[1])}</p>}
      {sync && (
        <div className="sync">
          <h3>İki el uyumu</h3>
          <p>
            İki tuşa birlikte basılan {sync.pairs} yerin <b>{sync.together}</b> tanesinde eller aynı anda indi (
            {pct(sync.together / sync.pairs)}).
          </p>
          {sync.meanGapMs !== null && sync.meanLeadMs !== null && (
            <p className="small muted">
              Eller arasında ortalama {Math.round(sync.meanGapMs)} ms fark var
              {Math.abs(sync.meanLeadMs) >= 30
                ? `; genelde ${sync.meanLeadMs < 0 ? 'sol' : 'sağ'} el önce basıyor.`
                : '; iki el de dengeli.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/** Evenness of the scale and how the thumb crossings went. */
function ScaleCard({ scale }: { scale: ScaleSummary }) {
  const { evenness, meanIntervalMs, crossings } = scale
  const crossAcc = crossings.shown ? crossings.firstTry / crossings.shown : null
  const advice =
    crossAcc !== null && crossAcc < 0.8
      ? 'Parmak geçişlerinde zorlanıyorsun: geçişten önceki notada başparmağını hazırla ve yavaş çal.'
      : evenness !== null && evenness < 0.7
        ? 'Notalar arasındaki süre değişiyor. İçinden sayarak her notaya eşit süre ver, sonra Gam Merdiveni’nde metronomla dene.'
        : 'Gamın düzgün akıyor. Bir sonraki adım: aynı eşitlikle biraz daha hızlı.'
  return (
    <section className="card scale-card">
      <h2>Gam tekniği</h2>
      <p className="small muted">
        {crossings.shown > 0 && (
          <>
            {crossings.shown} geçişin {crossings.firstTry} tanesinde doğru notaya ilk denemede bastın.{' '}
          </>
        )}
        {meanIntervalMs !== null && (
          <>
            Notalar arası ortalama {(meanIntervalMs / 1000).toFixed(2).replace('.', ',')} sn (yaklaşık{' '}
            {Math.round(60000 / meanIntervalMs)} BPM).
          </>
        )}
      </p>
      <p className="small">{advice}</p>
    </section>
  )
}

/** The longest runs remembered in Melodi Hafızası. */
function MemoryCard({ memory }: { memory: MemorySummary }) {
  return (
    <section className="card memory-card">
      <h2>Hafıza</h2>
      <div className="memory-dots result">
        {Array.from({ length: memory.maxLength }, (_, i) => (
          <span
            key={i}
            className={`memory-dot ${i < memory.longestClean ? 'played' : i < memory.longest ? 'half' : ''}`}
          />
        ))}
      </div>
      <p>
        En uzun hatasız dizi: <b>{memory.longestClean}</b> / {memory.maxLength} nota
        {memory.longest > memory.longestClean && <> · hatayla tamamlanan en uzun dizi {memory.longest} nota</>}
      </p>
    </section>
  )
}

function handAdvice(right: HandStat, left: HandStat): string {
  const diff = right.accuracy - left.accuracy
  if (Math.abs(diff) < 0.1) return 'İki elin de benzer gidiyor, güzel denge!'
  return diff > 0
    ? 'Sol elin biraz geride: fa anahtarı derslerini tekrar etmek iyi gelir.'
    : 'Sağ elin biraz geride: sol anahtarı derslerini tekrar etmek iyi gelir.'
}

function Comparison({ before, now }: { before: number | null; now: number }) {
  if (before === null) return null
  const diff = Math.round((now - before) * 100)
  const text =
    diff > 0
      ? `Önceki en iyin %${Math.round(before * 100)} idi, bu sefer ${diff} puan daha iyi!`
      : diff === 0
        ? `Önceki en iyinle aynı: %${Math.round(before * 100)}.`
        : `Önceki en iyin %${Math.round(before * 100)}. Bu sefer biraz geride kaldın, olur böyle.`
  return <p className={`compare ${diff > 0 ? 'up' : ''}`}>{text}</p>
}

export function ResultsScreen({ lesson, summary, reward, onRetry, onHome, onPractice }: Props) {
  const practiceNotes = [...new Set(summary.weakest.map((n) => n.midi))]
  const practiceClefs = new Set(summary.weakest.map((n) => n.clef))
  const practiceClef: Clef | 'grand' = practiceClefs.size === 1 ? [...practiceClefs][0] : 'grand'
  // On the grand staff a note name alone does not say which staff it was read on.
  const nameOf = (midi: number) => summary.noteNames?.[midi] ?? solfegeName(midi)
  const noteLabel = (n: { midi: number; clef: Clef }) =>
    summary.hands ? `${nameOf(n.midi)} (${CLEF_NAMES[n.clef]})` : nameOf(n.midi)
  // Scales and memory runs are not about reading: no "practise these notes" drill.
  const canPractice = !PATTERN_KINDS.includes(lesson.kind ?? 'drill')
  const leveledUp = reward.levelAfter > reward.levelBefore
  const [showLevelUp, setShowLevelUp] = useState(leveledUp)
  const mood: MascotMood = summary.failed || summary.stars === 0 ? 'sad' : summary.stars >= 2 ? 'cheer' : 'happy'

  useEffect(() => {
    const celebrate = !summary.failed && (summary.stars >= 2 || reward.goalJustReached || leveledUp)
    if (celebrate) {
      sfx.fanfare()
      burstConfetti()
    } else if (summary.failed) {
      sfx.fail()
    }
  }, [summary, reward, leveledUp])

  return (
    <div className="results">
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLevelUp(false)}
          >
            <motion.div
              className="overlay-card"
              initial={{ scale: 0.6, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <Mascot mood="cheer" size={140} />
              <h2>Seviye {reward.levelAfter}!</h2>
              <p className="muted">Notiş seninle gurur duyuyor. Böyle devam!</p>
              <button className="btn" onClick={() => setShowLevelUp(false)}>
                Devam
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Mascot mood={mood} size={110} say={summary.message} className="results-mascot" />
      <div className="stars" aria-label={`${summary.stars} yıldız`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`star ${i <= summary.stars ? 'on' : ''}`} style={{ animationDelay: `${i * 0.15}s` }}>
            ★
          </span>
        ))}
      </div>
      <h1>{summary.failed ? 'Kalplerin bitti' : `${lesson.title} tamamlandı!`}</h1>
      {!summary.failed && <Comparison before={reward.previousBestAccuracy} now={summary.accuracy} />}

      <section className="card rewards">
        <div className="reward-xp">
          <span className="xp-big">
            <CountUp value={reward.xpGained} prefix="+" /> XP
          </span>
          <ul>
            {reward.xpLines
              .filter((l) => l.xp > 0)
              .map((l) => (
                <li key={l.label}>
                  {l.label} <b>+{l.xp}</b>
                </li>
              ))}
          </ul>
        </div>
        <div className="reward-side">
          <div className={`reward-chip ${reward.streakExtended ? 'pop' : ''}`}>
            🔥 <b>{reward.streak}</b> günlük seri
          </div>
          <div className="reward-chip">
            <GoalRing value={reward.dailyXp} goal={reward.dailyGoal} size={28} />
            {reward.goalJustReached ? 'Günlük hedef tamam!' : `Bugün ${reward.dailyXp}/${reward.dailyGoal} XP`}
          </div>
          {reward.levelAfter > reward.levelBefore && (
            <div className="reward-chip pop">🎉 Seviye {reward.levelAfter}!</div>
          )}
        </div>
      </section>

      {reward.newBadges.length > 0 && (
        <section className="card badges-new">
          <h2>Yeni rozet{reward.newBadges.length > 1 ? 'ler' : ''}!</h2>
          <div className="badge-row">
            {reward.newBadges.map((b) => (
              <div key={b.id} className="badge earned pop">
                <span className="badge-icon">{b.icon}</span>
                <b>{b.title}</b>
                <span className="small muted">{b.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.timing ? (
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{pct(summary.accuracy)}</span>
            <span className="stat-label">Ritim puanı</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {pct((summary.timing.counts.perfect + summary.timing.counts.good) / Math.max(1, summary.timing.notes))}
            </span>
            <span className="stat-label">Zamanında</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.timing.counts.miss}</span>
            <span className="stat-label">Kaçırılan</span>
          </div>
        </div>
      ) : (
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{pct(summary.accuracy)}</span>
            <span className="stat-label">İlk denemede doğru</span>
          </div>
          <div className="stat">
            <span className="stat-value">{secs(summary.avgReactionMs)}</span>
            <span className="stat-label">Ortalama tepki</span>
          </div>
          <div className="stat">
            <span className="stat-value">{summary.totalMistakes}</span>
            <span className="stat-label">Yanlış basış</span>
          </div>
        </div>
      )}

      {summary.timing && <TimingCard timing={summary.timing} />}

      <section className="card">
        <h2>Konulara göre başarı</h2>
        {summary.perCategory.map((c) => (
          <div key={c.id} className="topic-row">
            <span>{c.label}</span>
            <Bar value={c.accuracy} />
            <span className="topic-pct">{pct(c.accuracy)}</span>
          </div>
        ))}
      </section>

      {summary.scale && <ScaleCard scale={summary.scale} />}
      {summary.memory && <MemoryCard memory={summary.memory} />}

      {(summary.hands || summary.sync) && <HandsCard hands={summary.hands} sync={summary.sync} />}

      {summary.weakest.length > 0 && (
        <section className="card">
          <h2>Biraz daha çalışalım</h2>
          <ul className="weak-list">
            {summary.weakest.map((n) => (
              <li key={`${n.clef}${n.midi}`}>
                <b>{noteLabel(n)}</b>: {n.shown} kez çıktı, {n.firstTry} kez ilk denemede bildin
                {n.confusedWith[0] && <> · genelde {nameOf(n.confusedWith[0].midi)} ile karıştırdın</>}
              </li>
            ))}
          </ul>
          {canPractice && practiceNotes.length >= 2 && (
            <button className="btn btn-small practice-btn" onClick={() => onPractice(practiceNotes, practiceClef)}>
              Bu notaları çalış
            </button>
          )}
        </section>
      )}

      {summary.perNote.length > 0 && (
        <section className="card">
          <h2>Nota nota sonuçlar</h2>
          <div className="note-grid">
            {summary.perNote.map((n) => (
              <div key={`${n.clef}${n.midi}`} className="note-cell">
                <span className="note-name">{noteLabel(n)}</span>
                <Bar value={n.accuracy} />
                <span className="small muted">
                  {pct(n.accuracy)} · {secs(n.avgReactionMs)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="actions">
        <button className="btn btn-secondary" onClick={onHome}>
          Derslere dön
        </button>
        <button className="btn" onClick={onRetry}>
          Tekrar oyna
        </button>
      </div>
    </div>
  )
}
