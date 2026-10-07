import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { GoalRing } from '../components/TopBar'
import { solfegeName } from '../music/notes'
import type { Reward } from '../state/profile'

interface Props {
  lesson: NoteLesson
  summary: SessionSummary
  reward: Reward
  onRetry: () => void
  onHome: () => void
  /** Start a short drill on these notes. */
  onPractice: (notes: number[]) => void
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
  const practiceNotes = summary.weakest.map((n) => n.midi)
  return (
    <div className="results">
      <div className="stars" aria-label={`${summary.stars} yıldız`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`star ${i <= summary.stars ? 'on' : ''}`} style={{ animationDelay: `${i * 0.15}s` }}>
            ★
          </span>
        ))}
      </div>
      <h1>{summary.failed ? 'Kalplerin bitti' : `${lesson.title} tamamlandı!`}</h1>
      <p className="lead">{summary.message}</p>
      {!summary.failed && <Comparison before={reward.previousBestAccuracy} now={summary.accuracy} />}

      <section className="card rewards">
        <div className="reward-xp">
          <span className="xp-big">+{reward.xpGained} XP</span>
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

      <section className="card">
        <h2>Konulara göre başarı</h2>
        {summary.perCategory.map((c) => (
          <div key={c.placement} className="topic-row">
            <span>{c.label}</span>
            <Bar value={c.accuracy} />
            <span className="topic-pct">{pct(c.accuracy)}</span>
          </div>
        ))}
      </section>

      {summary.weakest.length > 0 && (
        <section className="card">
          <h2>Biraz daha çalışalım</h2>
          <ul className="weak-list">
            {summary.weakest.map((n) => (
              <li key={n.midi}>
                <b>{solfegeName(n.midi)}</b>: {n.shown} kez çıktı, {n.firstTry} kez ilk denemede bildin
                {n.confusedWith[0] && <> · genelde {solfegeName(n.confusedWith[0].midi)} ile karıştırdın</>}
              </li>
            ))}
          </ul>
          {practiceNotes.length >= 2 && (
            <button className="btn btn-small practice-btn" onClick={() => onPractice(practiceNotes)}>
              Bu notaları çalış
            </button>
          )}
        </section>
      )}

      <section className="card">
        <h2>Nota nota sonuçlar</h2>
        <div className="note-grid">
          {summary.perNote.map((n) => (
            <div key={n.midi} className="note-cell">
              <span className="note-name">{solfegeName(n.midi)}</span>
              <Bar value={n.accuracy} />
              <span className="small muted">
                {pct(n.accuracy)} · {secs(n.avgReactionMs)}
              </span>
            </div>
          ))}
        </div>
      </section>

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
