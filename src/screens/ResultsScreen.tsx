import type { NoteLesson } from '../games/noteHunter/lessons'
import type { SessionSummary } from '../games/noteHunter/summary'
import { solfegeName } from '../music/notes'

interface Props {
  lesson: NoteLesson
  summary: SessionSummary
  onRetry: () => void
  onHome: () => void
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

export function ResultsScreen({ lesson, summary, onRetry, onHome }: Props) {
  return (
    <div className="results">
      <div className="stars" aria-label={`${summary.stars} yıldız`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`star ${i <= summary.stars ? 'on' : ''}`} style={{ animationDelay: `${i * 0.15}s` }}>
            ★
          </span>
        ))}
      </div>
      <h1>{lesson.title} tamamlandı!</h1>
      <p className="lead">{summary.message}</p>

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
